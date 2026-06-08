import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import LiveBidCounter from '../shared/LiveBidCounter';
import { getProjectDetail, updateProjectStatus } from '../../services/projectService';
import { getProjectBids } from '../../services/bidService';
import { initRoom } from '../../services/chatService';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Search, MapPin, CreditCard, MessageSquare, AlertTriangle, Inbox, FolderOpen, FileText, Star, StarIcon } from 'lucide-react';
import ReviewForm from '../shared/ReviewForm';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

export default function ClientProjectDetail() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { profile }   = useAuthStore();
  const [project,  setProject]  = useState(null);
  const [bids,     setBids]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('details');
  const [updating,   setUpdating]   = useState(false);
  const [showReview, setShowReview] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updateProjectStatus(projectId, newStatus);
      setProject((p) => ({ ...p, status: newStatus }));
    } finally {
      setUpdating(false);
    }
  };

  const fetchData = useCallback(() => {
    Promise.all([getProjectDetail(projectId), getProjectBids(projectId)])
      .then(([proj, b]) => {
        setProject(proj);
        setBids(b);
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeQuery(['projects', 'bids'], fetchData, null, [projectId]);

  if (loading) {
    return (
      <DashboardLayout title="Project Detail">
        <div style={{ textAlign: 'center', padding: 80, color: COLORS.textMuted }}>
          Loading project...
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title="Project Detail">
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ marginBottom: 12 }}><Search size={48} color={COLORS.textLight} /></div>
          <p style={{ color: COLORS.textMuted }}>Project not found.</p>
          <button onClick={() => navigate('/client/projects')} style={{ ...S.clientBtnPrimary, marginTop: 16 }}>
            ← Back to Projects
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const lowestBid  = bids.length ? Math.min(...bids.map((b) => b.bid_amount)) : null;
  const TABS       = ['details', 'bids', 'documents'];
  const awardedBid = bids.find(b => b.status === 'awarded');

  return (
    <DashboardLayout title="Project Detail">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Back button */}
        <button onClick={() => navigate('/client/projects')}
          style={{ ...S.clientBtnSecondary, marginBottom: 20, padding: '8px 16px', fontSize: 13 }}>
          ← Back to My Projects
        </button>

        {/* Header card */}
        <div style={{
          backgroundColor: COLORS.primary,
          borderRadius: 18, padding: '28px 32px', marginBottom: 24,
        }}>
          <div style={{ ...S.rowBetween, flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
            <div>
              <StatusBadge status={project.status} />
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: '10px 0 6px' }}>
                {project.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0 }}>
                <MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 4 }} /> {project.location_address ? `${project.location_address}, ` : ''}
                {project.location_city}, {project.location_region}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {project.status === 'open' && (
                <button onClick={() => navigate(`/client/projects/${projectId}/bids`)}
                  style={{ ...S.btnAccent, padding: '10px 20px' }}>
                  View All Bids →
                </button>
              )}
              {project.status === 'open' && (
                <button onClick={() => handleStatusChange('cancelled')} disabled={updating}
                  style={{ ...S.btnDanger, padding: '10px 20px', opacity: updating ? 0.7 : 1 }}>
                  Cancel Project
                </button>
              )}
              {(project.status === 'awarded' || project.status === 'in_progress') && (
                <button onClick={() => navigate('/client/transactions')}
                  style={{ ...S.btnSuccess, padding: '10px 20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Release Payment</span>
                </button>
              )}
              {(project.status === 'awarded' || project.status === 'in_progress') && project.awarded_bid_id && (
                <button
                  onClick={async () => {
                    const awardedBid = bids.find((b) => b.id === project.awarded_bid_id);
                    if (!awardedBid) return;
                    const roomId = await initRoom(projectId, awardedBid.contractor_id, project.title, profile.id);
                    navigate(`/client/messages?room=${roomId}`);
                  }}
                  style={{ ...S.clientBtnSecondary, padding: '10px 20px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} /> Message Contractor</span>
                </button>
              )}
              {project.status === 'awarded' && (
                <div style={{
                  backgroundColor: `${COLORS.accent}33`, border: `1px solid ${COLORS.accent}`,
                  borderRadius: 10, padding: '10px 16px', fontSize: 13, color: COLORS.text, fontWeight: 500,
                }}>
                  ⏳ Awaiting down payment to start
                </div>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Budget', value: `${formatCurrency(project.budget_min)} – ${formatCurrency(project.budget_max)}` },
              { label: 'Bid Deadline', value: formatDateTime(project.bid_deadline) },
              { label: 'Start Date', value: formatDate(project.start_date) || '—' },
              { label: 'End Date', value: formatDate(project.end_date) || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live bid counter */}
        <div style={{
          ...S.clientCard, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <LiveBidCounter projectId={projectId} />
            {lowestBid && (
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                · Lowest bid: <strong style={{ color: COLORS.success }}>{formatCurrency(lowestBid)}</strong>
              </span>
            )}
          </div>
          <button onClick={() => navigate(`/client/projects/${projectId}/bids`)}
            style={{ ...S.clientBtnPrimary, padding: '9px 18px', fontSize: 13 }}>
            Compare All Bids →
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${COLORS.border}` }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '11px 24px', border: 'none', cursor: 'pointer', background: 'none',
              color: tab === t ? COLORS.primary : COLORS.textMuted,
              fontWeight: tab === t ? 700 : 500, fontSize: 14,
              borderBottom: tab === t ? `3px solid ${COLORS.primary}` : '3px solid transparent',
              marginBottom: -2, textTransform: 'capitalize',
            }}>
              {t === 'bids' ? `Bids (${bids.length})` : t === 'documents' ? `Documents (${project.documents?.length || 0})` : 'Details'}
            </button>
          ))}
        </div>

        {/* ── DETAILS TAB ── */}
        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={S.clientCard}>
              <h3 style={{ ...S.h3, marginBottom: 16 }}>Project Description</h3>
              <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                {project.description}
              </p>
            </div>

            {project.scope_of_work && (
              <div style={S.clientCard}>
                <h3 style={{ ...S.h3, marginBottom: 16 }}>Scope of Work</h3>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {project.scope_of_work}
                </p>
              </div>
            )}

            {project.special_conditions && (
              <div style={{ ...S.clientCard, backgroundColor: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}` }}>
                <h3 style={{ ...S.h3, marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center' }}><AlertTriangle size={16} color={COLORS.warning} style={{ marginRight: 6 }} /> Special Conditions</h3>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, margin: 0 }}>
                  {project.special_conditions}
                </p>
              </div>
            )}

            <div style={S.clientCard}>
              <h3 style={{ ...S.h3, marginBottom: 16 }}>Project Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  { label: 'Project Type',  value: project.project_type?.replace('_', ' '), cap: true },
                  { label: 'Status',        value: project.status?.replace('_', ' '),       cap: true },
                  { label: 'Min Budget',    value: formatCurrency(project.budget_min) },
                  { label: 'Max Budget',    value: formatCurrency(project.budget_max) },
                  { label: 'Bid Deadline',  value: formatDateTime(project.bid_deadline) },
                  { label: 'Start Date',    value: formatDate(project.start_date) || '—' },
                  { label: 'End Date',      value: formatDate(project.end_date) || '—' },
                  { label: 'Posted On',     value: formatDate(project.created_at) },
                ].map(({ label, value, cap }) => (
                  <div key={label} style={{ padding: '13px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, margin: '0 0 3px', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: 14, color: COLORS.text, fontWeight: 500, margin: 0, textTransform: cap ? 'capitalize' : 'none' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BIDS TAB ── */}
        {tab === 'bids' && (
          <div style={S.clientCard}>
            <div style={{ ...S.rowBetween, marginBottom: 20 }}>
              <h3 style={S.h3}>Received Bids ({bids.length})</h3>
              <button onClick={() => navigate(`/client/projects/${projectId}/bids`)}
                style={{ ...S.clientBtnPrimary, padding: '9px 18px', fontSize: 13 }}>
                Full Bids View →
              </button>
            </div>
            {bids.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ marginBottom: 12 }}><Inbox size={48} color={COLORS.textLight} /></div>
                <p style={{ color: COLORS.textMuted }}>No bids yet — they appear here in real time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bids.map((b) => (
                  <div key={b.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '14px 16px',
                    backgroundColor: b.bid_amount === lowestBid ? `${COLORS.success}08` : COLORS.gray50,
                    border: `1px solid ${b.bid_amount === lowestBid ? COLORS.success : COLORS.border}`,
                    borderRadius: 12,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: `${COLORS.primary}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, color: COLORS.primary, fontSize: 16, flexShrink: 0,
                    }}>
                      {(b.contractor?.company_name || b.contractor?.full_name || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, margin: '0 0 2px' }}>
                        {b.contractor?.company_name || b.contractor?.full_name}
                      </p>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                        <Star size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{b.contractor?.average_rating?.toFixed(1) || 'New'} · {formatDate(b.proposed_start_date)} → {formatDate(b.proposed_end_date)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: b.bid_amount === lowestBid ? COLORS.success : COLORS.text, margin: '0 0 2px' }}>
                        {formatCurrency(b.bid_amount)}
                      </p>
                      {b.bid_amount === lowestBid && bids.length > 1 && (
                        <span style={{ ...S.badgeGreen, fontSize: 10 }}>Lowest</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {tab === 'documents' && (
          <div style={S.clientCard}>
            <h3 style={{ ...S.h3, marginBottom: 20 }}>Attached Documents</h3>
            {!project.documents || project.documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ marginBottom: 12 }}><FolderOpen size={48} color={COLORS.textLight} /></div>
                <p style={{ color: COLORS.textMuted }}>No documents attached to this project.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {project.documents.map((doc) => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px',
                      backgroundColor: COLORS.gray50, borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      textDecoration: 'none',
                      transition: 'border-color 0.15s',
                    }}>
                    <span><FileText size={24} color={COLORS.textMuted} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.primary, margin: '0 0 2px' }}>{doc.file_name}</p>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>{formatDate(doc.created_at)}</p>
                    </div>
                    <span style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600 }}>Download ↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review prompt for completed projects */}
      {project.status === 'completed' && awardedBid && (
        <div style={{ maxWidth: 900, margin: '20px auto 0' }}>
          {showReview ? (
            <ReviewForm
              projectId={projectId}
              reviewerId={profile.id}
              revieweeId={awardedBid.contractor_id}
              reviewerRole="client"
              revieweeName={awardedBid.contractor?.company_name || awardedBid.contractor?.full_name}
              onDone={() => setShowReview(false)}
              onClose={() => setShowReview(false)}
            />
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={18} color={COLORS.accent} fill={COLORS.accent} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Rate the contractor</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>Share your experience with {awardedBid.contractor?.company_name || awardedBid.contractor?.full_name}</div>
                </div>
              </div>
              <button onClick={() => setShowReview(true)}
                style={{ background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Leave Review
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
