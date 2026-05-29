import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import ContractorProfileModal from '../shared/ContractorProfileModal';
import BidAnalysis from './BidAnalysis';
import ProjectQA from '../shared/ProjectQA';
import { getProjectBids, awardBid } from '../../services/bidService';
import { getProjectDetail } from '../../services/projectService';
import { initRoom } from '../../services/chatService';
import { createContract, getContractForProject } from '../../services/contractService';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Inbox, Star, CreditCard, User, MessageSquare, Trophy, CheckCircle2, Sparkles, List, FileText } from 'lucide-react';
import ContractView from '../shared/ContractView';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

export default function BidsList() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { profile }   = useAuthStore();
  const [project,       setProject]       = useState(null);
  const [bids,          setBids]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [awarding,      setAwarding]      = useState(null);
  const [selected,      setSelected]      = useState(null);
  const [viewProfile,   setViewProfile]   = useState(null); // bid object

  const fetchData = useCallback(() => {
    Promise.all([getProjectDetail(projectId), getProjectBids(projectId)]).then(([proj, b]) => {
      setProject(proj);
      setBids(b);
      setLoading(false);
    });
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeQuery('bids', fetchData, `project_id=eq.${projectId}`, [projectId]);

  const [contract,     setContract]     = useState(null);
  const [showContract, setShowContract] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);

  const handleAward = async (bidId) => {
    if (!window.confirm('Award this bid? All other bids will be marked as rejected.')) return;
    setAwarding(bidId);
    try {
      await awardBid(bidId, projectId);
      setBids((prev) => prev.map((b) => ({
        ...b,
        status: b.id === bidId ? 'awarded' : 'rejected',
      })));
    } finally {
      setAwarding(null);
    }
  };

  const handleCreateContract = async (bid) => {
    setCreatingContract(bid.id);
    try {
      const existing = await getContractForProject(projectId);
      if (existing) { setShowContract(true); return; }
      const newContract = await createContract({
        projectId,
        bidId:           bid.id,
        clientId:        profile.id,
        contractorId:    bid.contractor_id,
        contractAmount:  bid.bid_amount,
        startDate:       bid.proposed_start_date,
        endDate:         bid.proposed_end_date,
        scopeSummary:    project?.scope_of_work || project?.description,
        terms:           bid.payment_terms || 'Standard terms apply.',
      });
      setContract(newContract);
      setShowContract(true);
    } catch (e) {
      alert('Failed to create contract: ' + e.message);
    } finally {
      setCreatingContract(null);
    }
  };

  const handleMessage = async (bid) => {
    const roomId = await initRoom(projectId, bid.contractor_id, project?.title, profile.id);
    navigate(`/client/messages?room=${roomId}`);
  };

  const lowestBid  = bids.length ? Math.min(...bids.map(b => b.bid_amount)) : 0;
  const highestBid = bids.length ? Math.max(...bids.map(b => b.bid_amount)) : 0;
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'analysis'

  return (
    <DashboardLayout title="Bids Received">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>Loading bids...</div>
      ) : (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Project info header */}
          <div style={{ ...S.clientCard, marginBottom: 24, borderLeft: `4px solid ${COLORS.primary}` }}>
            <div style={{ ...S.rowBetween, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ ...S.h2, marginBottom: 4 }}>{project?.title}</h2>
                <p style={{ ...S.body, margin: 0 }}>{project?.location_city}, {project?.location_region} · Deadline: {formatDate(project?.bid_deadline)}</p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>{bids.length}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Total Bids</div>
                </div>
                <StatusBadge status={project?.status} />
                {/* View toggle */}
                {bids.length > 0 && (
                  <div style={{ display: 'flex', background: COLORS.gray100, borderRadius: 10, padding: 3 }}>
                    <button onClick={() => setViewMode('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: viewMode === 'list' ? COLORS.white : 'none', color: viewMode === 'list' ? COLORS.primary : COLORS.textMuted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <List size={13} /> List
                    </button>
                    <button onClick={() => setViewMode('analysis')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: viewMode === 'analysis' ? COLORS.white : 'none', color: viewMode === 'analysis' ? COLORS.primary : COLORS.textMuted, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <Sparkles size={13} /> Archie Analysis
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bid stats bar */}
          {bids.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Lowest Bid', value: formatCurrency(lowestBid), color: COLORS.success },
                { label: 'Highest Bid', value: formatCurrency(highestBid), color: COLORS.danger },
                { label: 'Budget Range', value: `${formatCurrency(project?.budget_min)} – ${formatCurrency(project?.budget_max)}`, color: COLORS.primary },
              ].map((s) => (
                <div key={s.label} style={{ ...S.clientCard, textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Archie Analysis view */}
          {viewMode === 'analysis' && bids.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <BidAnalysis project={project} bids={bids} onAwardBid={bid => handleAward(bid.id)} />
            </div>
          )}

          {/* Q&A Board (always visible) */}
          <div style={{ marginBottom: 24 }}>
            <ProjectQA project={project} />
          </div>

          {/* Bids list */}
          {(viewMode === 'list') && bids.length === 0 ? (
            <div style={{ ...S.clientCard, textAlign: 'center', padding: 60 }}>
              <div style={{ marginBottom: 12 }}><Inbox size={48} color={COLORS.textLight} /></div>
              <p style={{ color: COLORS.textMuted, fontSize: 16 }}>No bids received yet.</p>
              <p style={{ color: COLORS.textLight, fontSize: 13 }}>Bids will appear here in real time when contractors submit them.</p>
            </div>
          ) : viewMode === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bids.map((bid) => (
                <div key={bid.id} style={{
                  ...S.clientCard,
                  border: `1px solid ${bid.status === 'awarded' ? COLORS.success : selected === bid.id ? COLORS.primary : COLORS.border}`,
                  backgroundColor: bid.status === 'awarded' ? `${COLORS.success}08` : COLORS.white,
                }}>
                  <div style={{ ...S.rowBetween, marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        backgroundColor: `${COLORS.primary}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 18, color: COLORS.primary,
                      }}>
                        {(bid.contractor?.company_name || bid.contractor?.full_name || '?')[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>
                          {bid.contractor?.company_name || bid.contractor?.full_name}
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                          <Star size={12} color={COLORS.warning} fill={COLORS.warning} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 2 }} /> {bid.contractor?.average_rating?.toFixed(1) || 'New'} · {bid.contractor?.completed_projects || 0} projects completed
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: bid.bid_amount === lowestBid ? COLORS.success : COLORS.text }}>
                        {formatCurrency(bid.bid_amount)}
                      </div>
                      {bid.bid_amount === lowestBid && bids.length > 1 && (
                        <span style={{ ...S.badgeGreen, fontSize: 10 }}>Lowest Bid</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: '0 0 2px', fontWeight: 600 }}>START DATE</p>
                      <p style={{ fontSize: 13, color: COLORS.text, margin: 0, fontWeight: 600 }}>{formatDate(bid.proposed_start_date)}</p>
                    </div>
                    <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: '0 0 2px', fontWeight: 600 }}>COMPLETION</p>
                      <p style={{ fontSize: 13, color: COLORS.text, margin: 0, fontWeight: 600 }}>{formatDate(bid.proposed_end_date)}</p>
                    </div>
                    <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: 12 }}>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: '0 0 2px', fontWeight: 600 }}>STATUS</p>
                      <StatusBadge status={bid.status} />
                    </div>
                  </div>

                  {/* Cover letter preview */}
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginBottom: 6 }}>COVER LETTER</p>
                    <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: 0 }}>
                      {selected === bid.id ? bid.cover_letter : bid.cover_letter?.slice(0, 180) + (bid.cover_letter?.length > 180 ? '...' : '')}
                    </p>
                    {bid.cover_letter?.length > 180 && (
                      <button onClick={() => setSelected(selected === bid.id ? null : bid.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.primary, fontSize: 13, fontWeight: 600, padding: '4px 0' }}>
                        {selected === bid.id ? 'Show less ↑' : 'Read more ↓'}
                      </button>
                    )}
                  </div>

                  {/* Payment terms */}
                  {bid.payment_terms && (
                    <div style={{ backgroundColor: `${COLORS.accent}44`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#78600A', display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} color="#78600A" /> Payment Terms: </span>
                      <span style={{ fontSize: 13, color: COLORS.text }}>{bid.payment_terms}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setViewProfile(bid)}
                      style={{ ...S.clientBtnSecondary, padding: '9px 16px', fontSize: 13 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> View Profile</span>
                    </button>
                    <button
                      onClick={() => handleMessage(bid)}
                      style={{ ...S.clientBtnSecondary, padding: '9px 16px', fontSize: 13 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> Message</span>
                    </button>
                    {bid.status === 'submitted' && project?.status === 'open' && (
                      <button
                        onClick={() => handleAward(bid.id)}
                        disabled={awarding === bid.id}
                        style={{ ...S.btnSuccess, opacity: awarding === bid.id ? 0.7 : 1 }}
                      >
                        {awarding === bid.id ? 'Awarding...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={14} /> Award This Bid</span>}
                      </button>
                    )}
                    {bid.status === 'awarded' && (
                      <>
                        <div style={{ ...S.badgeGreen, padding: '10px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} /> Awarded</div>
                        <button
                          onClick={() => handleCreateContract(bid)}
                          disabled={creatingContract === bid.id}
                          style={{ ...S.clientBtnSecondary, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}
                        >
                          <FileText size={13} /> {creatingContract === bid.id ? 'Creating…' : 'Contract'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {viewProfile && (
        <ContractorProfileModal
          contractorId={viewProfile.contractor_id}
          projectId={projectId}
          projectTitle={project?.title}
          clientId={profile?.id}
          onClose={() => setViewProfile(null)}
          onChat={() => { handleMessage(viewProfile); setViewProfile(null); }}
        />
      )}

      {showContract && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowContract(false); }}>
          <div style={{ width: '100%', maxWidth: 580, maxHeight: '88vh', overflowY: 'auto' }}>
            <ContractView
              projectId={projectId}
              userId={profile.id}
              role="client"
              onClose={() => setShowContract(false)}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
