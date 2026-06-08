import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Star, ChevronRight, RefreshCw, Award, Lightbulb } from 'lucide-react';
import { archieAnalyzeBids, archieReviewBid } from '../../services/archieService';
import { supabase } from '../../config/supabase';

const C = { brown: '#7A3E0F', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E', successLight: '#D1FAE5', danger: '#DC2626', dangerLight: '#FEE2E2' };
const S = { fontFamily: "'Inter', system-ui, sans-serif" };

const RISK_COLORS = { low: { bg: C.successLight, text: C.success }, medium: { bg: '#FEF3C7', text: '#92400E' }, high: { bg: C.dangerLight, text: C.danger } };

function extractJSON(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON found');
  let depth = 0, end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Malformed JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}
const PRICE_LABELS = { competitive: { label: 'Competitive', color: C.success }, fair: { label: 'Fair price', color: C.amber }, overpriced: { label: 'Above budget', color: C.danger }, underpriced: { label: 'Below typical', color: C.amber } };

export default function BidAnalysis({ project, bids, onAwardBid }) {
  const [analysis,     setAnalysis]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [contractors,  setContractors]  = useState([]);
  const [selectedBid,  setSelectedBid]  = useState(null);
  const [deepReview,   setDeepReview]   = useState('');
  const [reviewing,    setReviewing]    = useState(false);

  useEffect(() => { if (bids.length) fetchContractors(); }, [bids]);

  async function fetchContractors() {
    const ids = [...new Set(bids.map(b => b.contractor_id))];
    const { data } = await supabase.from('profiles').select('*').in('id', ids);
    setContractors(data || []);
  }

  async function runAnalysis() {
    if (!bids.length) return;
    setLoading(true);
    setAnalysis(null);
    try {
      const raw = await archieAnalyzeBids(project, bids, contractors);
      const result = extractJSON(raw);
      setAnalysis(result);
    } catch (e) {
      console.error('Bid analysis error:', e);
      setAnalysis({ summary: 'Analysis unavailable. Review bids manually.', rankings: [], red_flags: [], payment_advice: '' });
    } finally { setLoading(false); }
  }

  async function runDeepReview(bid) {
    setSelectedBid(bid);
    setDeepReview('');
    setReviewing(true);
    const contractor = contractors.find(c => c.id === bid.contractor_id);
    const review = await archieReviewBid(project, bid, contractor);
    setDeepReview(review);
    setReviewing(false);
  }

  function getBidById(id) { return bids.find(b => b.id === id); }
  function getContractor(contractorId) { return contractors.find(c => c.id === contractorId); }

  const rankedBids = analysis?.rankings?.map(r => ({ ...r, bid: getBidById(r.bid_id), contractor: getContractor(getBidById(r.bid_id)?.contractor_id) })).filter(r => r.bid) || [];

  return (
    <div style={{ ...S }}>
      {/* Archie Analysis Banner */}
      {!analysis && (
        <div style={{ background: 'linear-gradient(135deg, #7A3E0F, #4A2509)', borderRadius: 14, padding: '28px 32px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Sparkles size={22} color={C.amber} />
              <span style={{ fontSize: 18, fontWeight: 800 }}>Let Archie Analyze Your Bids</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
              Archie will score all {bids.length} bid{bids.length !== 1 ? 's' : ''}, rank them by value and risk, and recommend the best choice.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading || !bids.length}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.amber, color: '#3D1500', border: 'none', borderRadius: 100, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 24 }}
          >
            {loading ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</> : <><Sparkles size={16} /> Analyze All Bids</>}
          </button>
        </div>
      )}

      {analysis && (
        <>
          {/* Summary card */}
          <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={15} color={C.amber} />
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Archie's Summary</span>
              <button onClick={runAnalysis} disabled={loading} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 12px', fontSize: 11, color: C.muted, cursor: 'pointer' }}>
                <RefreshCw size={11} />Re-analyze
              </button>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: C.text, lineHeight: 1.6 }}>{analysis.summary}</p>
            {analysis.red_flags?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.red_flags.map((flag, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: C.dangerLight, border: `1px solid ${C.danger}22`, borderRadius: 8, padding: '8px 12px' }}>
                    <AlertTriangle size={13} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: C.danger }}>{flag}</span>
                  </div>
                ))}
              </div>
            )}
            {analysis.payment_advice && (
              <div style={{ marginTop: 12, fontSize: 13, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{analysis.payment_advice}</span>
              </div>
            )}
          </div>

          {/* Ranked bids */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rankedBids.map((r) => {
              const riskCfg  = RISK_COLORS[r.risk_level] || RISK_COLORS.medium;
              const priceCfg = PRICE_LABELS[r.price_assessment] || PRICE_LABELS.fair;
              const isRec    = analysis.recommended_bid_id === r.bid_id;
              const isSel    = selectedBid?.id === r.bid_id;

              return (
                <div key={r.bid_id} style={{ background: C.surface, borderWidth: 2, borderStyle: 'solid', borderColor: isRec ? C.brown : isSel ? C.amber : C.border, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                  {isRec && (
                    <div style={{ background: C.brown, color: '#fff', padding: '6px 20px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Award size={13} /> Archie's Recommendation
                    </div>
                  )}
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Rank badge */}
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.rank === 1 ? C.amber : C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: r.rank === 1 ? '#fff' : C.muted, flexShrink: 0 }}>
                        {r.rank}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{r.contractor?.company_name || r.contractor?.full_name || 'Contractor'}</span>
                          <span style={{ fontSize: 12, background: riskCfg.bg, color: riskCfg.text, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>{r.risk_level} risk</span>
                          <span style={{ fontSize: 12, color: priceCfg.color, fontWeight: 600 }}>{priceCfg.label}</span>
                          {r.contractor?.average_rating > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: C.muted }}>
                              <Star size={11} color={C.amber} fill={C.amber} />{r.contractor.average_rating}/5
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                          {r.contractor?.years_experience || 0} yrs exp · {r.contractor?.completed_projects || 0} projects completed
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted }}>Bid Amount</div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>₱{Number(r.bid?.bid_amount || 0).toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted }}>Score</div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: C.brown }}>{r.score}/100</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: C.muted }}>Timeline</div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{r.bid?.proposed_start_date} → {r.bid?.proposed_end_date}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 24 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.success, marginBottom: 4 }}>✓ Pros</div>
                            {r.pros?.map((p, i) => <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>· {p}</div>)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 4 }}>✗ Cons</div>
                            {r.cons?.map((c, i) => <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 2 }}>· {c}</div>)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => runDeepReview(r.bid)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF8F0', border: `1px solid ${C.amber}44`, borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: C.amber, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          <Sparkles size={12} /> Deep Review
                        </button>
                        <button
                          onClick={() => onAwardBid && onAwardBid(r.bid)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.brown, color: '#fff', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Award <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Deep review panel */}
      {(reviewing || deepReview) && selectedBid && (
        <div style={{ marginTop: 24, background: '#FFFBF5', border: `1.5px solid ${C.amber}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={16} color={C.amber} />
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Archie's Deep Review — {getContractor(selectedBid.contractor_id)?.company_name || 'Contractor'}</span>
            <button onClick={() => { setSelectedBid(null); setDeepReview(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          {reviewing ? (
            <div style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Archie is reviewing this bid…
            </div>
          ) : (
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {deepReview.replace(/^#{1,3} /gm, '').replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>
          )}
          {deepReview && (
            <button
              onClick={() => onAwardBid && onAwardBid(selectedBid)}
              style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, background: C.brown, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              <Award size={15} /> Award Contract to {getContractor(selectedBid.contractor_id)?.company_name || 'this Contractor'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
