import { useState } from 'react';
import { Sparkles, TrendingUp, RefreshCw, CheckCircle2, AlertTriangle, DollarSign, Lightbulb } from 'lucide-react';
import { archieProjectFit, archieDraftProposal, archieSuggestPrice } from '../../services/archieService';
import { useAuthStore } from '../../stores/authStore';

const C = { brown: '#7A3E0F', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E', successLight: '#D1FAE5', danger: '#DC2626', dangerLight: '#FEE2E2' };
const S = { fontFamily: "'Inter', system-ui, sans-serif" };

const FIT_COLORS = { excellent: { bg: C.successLight, text: C.success }, good: { bg: '#D1FAE5', text: '#065F46' }, fair: { bg: '#FEF3C7', text: '#92400E' }, poor: { bg: C.dangerLight, text: C.danger } };

// Robustly extracts JSON from Claude's response — handles markdown code fences,
// leading/trailing text, and PROPOSAL_DATA: / other prefixes.
function extractJSON(text) {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  // Strip any known label prefix (PROPOSAL_DATA:, etc.)
  cleaned = cleaned.replace(/^[A-Z_]+:\s*/m, '');
  // Find outermost { ... }
  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  // Walk forward to find the matching closing brace
  let depth = 0, end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Malformed JSON in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Same but scans from the END of the text (for PROPOSAL_DATA which appears last)
function extractLastJSON(text) {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const end = cleaned.lastIndexOf('}');
  if (end === -1) throw new Error('No JSON object found in response');
  let depth = 0, start = -1;
  for (let i = end; i >= 0; i--) {
    if (cleaned[i] === '}') depth++;
    else if (cleaned[i] === '{') { depth--; if (depth === 0) { start = i; break; } }
  }
  if (start === -1) throw new Error('Malformed JSON in response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default function BidAssistant({ project, targetAmount, onApplyProposal }) {
  const { profile } = useAuthStore();

  const [fit,           setFit]           = useState(null);
  const [pricing,       setPricing]       = useState(null);
  const [loadingFit,    setLoadingFit]    = useState(false);
  const [loadingPrice,  setLoadingPrice]  = useState(false);
  const [loadingDraft,  setLoadingDraft]  = useState(false);
  const [activeTab,     setActiveTab]     = useState('fit');
  const [fitError,      setFitError]      = useState('');
  const [priceError,    setPriceError]    = useState('');
  const [draftApplied,  setDraftApplied]  = useState(false);
  const [draftError,    setDraftError]    = useState('');

  async function runFitAnalysis() {
    setLoadingFit(true); setFitError('');
    try {
      const raw = await archieProjectFit(project, profile);
      setFit(extractJSON(raw));
      setActiveTab('fit');
    } catch (e) {
      setFitError('Could not parse fit analysis. Please try again.');
      console.error('Fit analysis error:', e);
    }
    finally { setLoadingFit(false); }
  }

  async function runPricingGuidance() {
    setLoadingPrice(true); setPriceError('');
    try {
      const raw = await archieSuggestPrice(project, profile);
      setPricing(extractJSON(raw));
      setActiveTab('price');
    } catch (e) {
      setPriceError('Could not load pricing guidance. Please try again.');
      console.error('Pricing error:', e);
    }
    finally { setLoadingPrice(false); }
  }

  async function runDraftProposal() {
    setLoadingDraft(true); setDraftError(''); setDraftApplied(false);
    try {
      const raw = await archieDraftProposal(project, profile, targetAmount);
      const data = extractLastJSON(raw);
      onApplyProposal && onApplyProposal(data);
      setDraftApplied(true);
    } catch (e) {
      setDraftError('Could not generate proposal. Please try again.');
      console.error('Draft proposal error:', e);
    }
    finally { setLoadingDraft(false); }
  }

  const fitCfg = fit ? (FIT_COLORS[fit.fit_level] || FIT_COLORS.fair) : null;

  return (
    <div style={{ ...S, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7A3E0F, #4A2509)', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/Mascot_02.png" alt="Archie" style={{ height: 40, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Archie — Bid Intelligence</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>AI-powered project analysis and proposal drafting</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: 'fit',   label: 'Project Fit', icon: <TrendingUp size={14} />, action: runFitAnalysis,     loading: loadingFit,   done: !!fit },
          { id: 'price', label: 'Price Guide', icon: <DollarSign size={14} />, action: runPricingGuidance, loading: loadingPrice, done: !!pricing },
          { id: 'draft', label: 'Draft Proposal',icon: <Sparkles size={14} />, action: runDraftProposal,   loading: loadingDraft, done: false },
        ].map(btn => (
          <button
            key={btn.id}
            onClick={btn.action}
            disabled={btn.loading || btn.loading}
            style={{
              padding: '12px 8px', border: 'none',
              borderRight: btn.id !== 'draft' ? `1px solid ${C.border}` : 'none',
              borderBottom: activeTab === btn.id ? `3px solid ${C.brown}` : '3px solid transparent',
              background: activeTab === btn.id ? C.cream : C.surface,
              color: activeTab === btn.id ? C.brown : C.muted,
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            {btn.loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : btn.icon}
            {btn.loading ? 'Analyzing…' : btn.label}
            {btn.done && <span style={{ fontSize: 10, color: C.success }}>✓ done</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', minHeight: 160 }}>

        {/* Fit Analysis */}
        {activeTab === 'fit' && !fit && (
          <div style={{ textAlign: 'center', color: C.muted, paddingTop: 20 }}>
            <TrendingUp size={28} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Click "Project Fit" to see how well this project matches your profile and experience.</p>
            {fitError && <p style={{ marginTop: 12, fontSize: 13, color: C.danger }}>{fitError}</p>}
          </div>
        )}

        {activeTab === 'fit' && fit && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: fitCfg?.text }}>{fit.fit_score}</div>
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fit Score</div>
                <span style={{ fontSize: 12, background: fitCfg?.bg, color: fitCfg?.text, padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{fit.fit_level?.toUpperCase()}</span>
              </div>
              {fit.should_bid !== null && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: fit.should_bid ? C.success : C.danger }}>
                  {fit.should_bid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {fit.should_bid ? 'Archie recommends bidding' : 'Consider carefully'}
                </div>
              )}
            </div>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 16 }}>{fit.summary}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.success, marginBottom: 6 }}>✓ Strengths</div>
                {fit.strengths?.map((s, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>· {s}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} />Challenges</div>
                {fit.challenges?.map((c, i) => <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>· {c}</div>)}
              </div>
            </div>
            {fit.key_risks?.length > 0 && (
              <div style={{ marginTop: 12, background: '#FEF3C7', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Key Risks</div>
                {fit.key_risks.map((r, i) => <div key={i} style={{ fontSize: 13, color: '#92400E' }}>· {r}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Price guidance */}
        {activeTab === 'price' && !pricing && (
          <div style={{ textAlign: 'center', color: C.muted, paddingTop: 20 }}>
            <DollarSign size={28} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, fontSize: 14 }}>Click "Price Guide" for Archie's pricing analysis and recommended bid range.</p>
            {priceError && <p style={{ marginTop: 12, fontSize: 13, color: C.danger }}>{priceError}</p>}
          </div>
        )}

        {activeTab === 'price' && pricing && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Conservative', value: pricing.range?.conservative, note: 'Lower risk' },
                { label: 'Competitive', value: pricing.range?.competitive, note: 'Recommended' },
                { label: 'Aggressive', value: pricing.range?.aggressive, note: 'Higher margin' },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', background: i === 1 ? C.cream : C.surface, border: `1.5px solid ${i === 1 ? C.brown : C.border}`, borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: i === 1 ? C.brown : C.text }}>₱{Number(item.value||0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{item.note}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>{pricing.reasoning}</p>
            {pricing.margin_hint && <p style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'flex-start', gap: 5 }}><Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{pricing.margin_hint}</span></p>}
            {pricing.pricing_strategy && (
              <div style={{ background: C.cream, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.text }}>
                <strong>Strategy:</strong> {pricing.pricing_strategy}
              </div>
            )}
          </div>
        )}

        {/* Draft proposal */}
        {activeTab === 'draft' && (
          <div style={{ textAlign: 'center', color: C.muted, paddingTop: 20 }}>
            {draftApplied ? (
              <>
                <CheckCircle2 size={32} color={C.success} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: C.success }}>Proposal applied to your form!</p>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted }}>Your cover letter, technical proposal, payment terms, and milestones have been filled in. Review and adjust before submitting.</p>
                <button
                  onClick={runDraftProposal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 100, padding: '8px 18px', fontSize: 13, color: C.muted, cursor: 'pointer' }}
                >
                  <RefreshCw size={13} /> Regenerate
                </button>
              </>
            ) : (
              <>
                <Sparkles size={28} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ margin: '0 0 16px', fontSize: 14 }}>
                  {loadingDraft
                    ? 'Archie is writing your proposal… this takes about 10 seconds.'
                    : 'Archie will generate a complete cover letter, technical proposal, and milestone plan — and fill your bid form automatically.'}
                </p>
                {loadingDraft ? (
                  <RefreshCw size={20} color={C.amber} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <button
                      onClick={runDraftProposal}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.brown, color: '#fff', border: 'none', borderRadius: 100, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Sparkles size={15} /> Generate Full Proposal
                    </button>
                    {draftError && <p style={{ marginTop: 12, fontSize: 13, color: C.danger }}>{draftError}</p>}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
