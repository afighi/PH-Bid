import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import LiveBidCounter from '../shared/LiveBidCounter';
import { getProjectDetail } from '../../services/projectService';
import { getMyBids } from '../../services/bidService';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Search, MapPin, Pencil, FileEdit, Trophy, XCircle, ClipboardList, AlertTriangle, Phone, Lightbulb, FolderOpen, FileText, Star, Clock } from 'lucide-react';
import ContractView from '../shared/ContractView';
import ReviewForm from '../shared/ReviewForm';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

export default function ContractorProjectDetail() {
  const { projectId } = useParams();
  const navigate      = useNavigate();
  const { profile }   = useAuthStore();

  const [project,    setProject]    = useState(null);
  const [myBid,      setMyBid]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('details');
  const [showReview, setShowReview] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([
      getProjectDetail(projectId),
      getMyBids(profile?.id),
    ]).then(([proj, allMyBids]) => {
      setProject(proj);
      const existing = allMyBids.find((b) => b.project_id === projectId);
      setMyBid(existing || null);
      setLoading(false);
    });
  }, [projectId, profile?.id]);

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
          <button onClick={() => navigate('/contractor/browse')} style={{ ...S.btnPrimary, marginTop: 16 }}>
            ← Browse Projects
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isOpen        = project.status === 'open';
  const deadlinePassed = new Date(project.bid_deadline) < new Date();
  const canBid        = isOpen && !deadlinePassed;
  const TABS          = ['details', 'client', 'documents'];

  return (
    <DashboardLayout title="Project Detail">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Back button */}
        <button onClick={() => navigate('/contractor/browse')}
          style={{ ...S.btnSecondary, marginBottom: 20, padding: '8px 16px', fontSize: 13 }}>
          ← Back to Browse
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
              {canBid && (
                <button
                  onClick={() => navigate(`/contractor/projects/${projectId}/bid`)}
                  style={{ ...S.btnAccent, padding: '12px 24px', fontSize: 15, fontWeight: 700 }}>
                  {myBid ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pencil size={14} /> Revise My Bid</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileEdit size={14} /> Submit Bid</span>}
                </button>
              )}
              {deadlinePassed && isOpen && (
                <span style={{
                  backgroundColor: `${COLORS.warning}22`, color: COLORS.warning,
                  border: `1px solid ${COLORS.warning}`,
                  borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                }}>
                  <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Bidding Closed
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Budget Range', value: `${formatCurrency(project.budget_min)} – ${formatCurrency(project.budget_max)}` },
              { label: 'Bid Deadline', value: formatDateTime(project.bid_deadline) },
              { label: 'Start Date',   value: formatDate(project.start_date) || '—' },
              { label: 'End Date',     value: formatDate(project.end_date) || '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* My Bid status banner */}
        {myBid && (
          <div style={{
            ...S.card, marginBottom: 24,
            backgroundColor: myBid.status === 'awarded' ? COLORS.successLight : myBid.status === 'rejected' ? COLORS.dangerLight : `${COLORS.primaryLight}33`,
            border: `1px solid ${myBid.status === 'awarded' ? COLORS.success : myBid.status === 'rejected' ? COLORS.danger : COLORS.primary}`,
          }}>
            <div style={{ ...S.rowBetween, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, margin: '0 0 4px' }}>
                  {myBid.status === 'awarded'  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={14} /> Your bid was awarded!</span>   :
                   myBid.status === 'rejected' ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} /> Your bid was not selected</span> :
                                                 <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} /> You have an active bid</span>}
                </p>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                  Submitted {formatDate(myBid.created_at)}
                  {myBid.revision_number > 1 ? ` · Revision #${myBid.revision_number}` : ''}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary, margin: '0 0 2px' }}>
                  {formatCurrency(myBid.bid_amount)}
                </p>
                <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                  {formatDate(myBid.proposed_start_date)} → {formatDate(myBid.proposed_end_date)}
                </p>
              </div>
            </div>

            {myBid.status === 'awarded' && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.success}44` }}>
                <ContractView projectId={projectId} userId={profile.id} role="contractor" />
              </div>
            )}
          </div>
        )}

        {/* Live bid counter */}
        <div style={{
          ...S.card, marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <LiveBidCounter projectId={projectId} />
          {canBid && (
            <button
              onClick={() => navigate(`/contractor/projects/${projectId}/bid`)}
              style={{ ...S.btnPrimary, padding: '9px 18px', fontSize: 13 }}>
              {myBid ? 'Revise Bid →' : 'Place Bid →'}
            </button>
          )}
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
              {t === 'documents' ? `Documents (${project.documents?.length || 0})` : t === 'client' ? 'Client Info' : 'Details'}
            </button>
          ))}
        </div>

        {/* ── DETAILS TAB ── */}
        {tab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={S.card}>
              <h3 style={{ ...S.h3, marginBottom: 16 }}>Project Description</h3>
              <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                {project.description}
              </p>
            </div>

            {project.scope_of_work && (
              <div style={S.card}>
                <h3 style={{ ...S.h3, marginBottom: 16 }}>Scope of Work</h3>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {project.scope_of_work}
                </p>
              </div>
            )}

            {project.special_conditions && (
              <div style={{ ...S.card, backgroundColor: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}` }}>
                <h3 style={{ ...S.h3, marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center' }}><AlertTriangle size={16} color={COLORS.warning} style={{ marginRight: 6 }} /> Special Conditions</h3>
                <p style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.8, margin: 0 }}>
                  {project.special_conditions}
                </p>
              </div>
            )}

            <div style={S.card}>
              <h3 style={{ ...S.h3, marginBottom: 16 }}>Project Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {[
                  { label: 'Project Type', value: project.project_type?.replace(/_/g, ' '), cap: true },
                  { label: 'Status',       value: project.status?.replace(/_/g, ' '),       cap: true },
                  { label: 'Min Budget',   value: formatCurrency(project.budget_min) },
                  { label: 'Max Budget',   value: formatCurrency(project.budget_max) },
                  { label: 'Bid Deadline', value: formatDateTime(project.bid_deadline) },
                  { label: 'Start Date',   value: formatDate(project.start_date) || '—' },
                  { label: 'End Date',     value: formatDate(project.end_date) || '—' },
                  { label: 'Posted On',    value: formatDate(project.created_at) },
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

        {/* ── CLIENT TAB ── */}
        {tab === 'client' && (
          <div style={S.card}>
            <h3 style={{ ...S.h3, marginBottom: 20 }}>Client Information</h3>
            {project.client ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16,
                  backgroundColor: `${COLORS.primary}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: COLORS.primary, fontSize: 24, flexShrink: 0,
                }}>
                  {(project.client.company_name || project.client.full_name || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 18, color: COLORS.text, margin: '0 0 4px' }}>
                    {project.client.company_name || project.client.full_name}
                  </p>
                  {project.client.company_name && (
                    <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 12px' }}>
                      Contact: {project.client.full_name}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      backgroundColor: `${COLORS.accent}33`, borderRadius: 8, padding: '6px 12px',
                    }}>
                      <Star size={14} color={COLORS.text} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {project.client.average_rating?.toFixed(1) || 'New Client'}
                      </span>
                    </div>
                    {project.client.phone && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        backgroundColor: COLORS.gray50, borderRadius: 8, padding: '6px 12px',
                        border: `1px solid ${COLORS.border}`,
                      }}>
                        <span><Phone size={14} /></span>
                        <span style={{ fontSize: 13, color: COLORS.textMuted }}>{project.client.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: COLORS.textMuted, fontSize: 14 }}>Client information not available.</p>
            )}

            {/* Tip box */}
            <div style={{
              marginTop: 24, backgroundColor: `${COLORS.primaryLight}22`,
              border: `1px solid ${COLORS.primaryLight}`,
              borderRadius: 12, padding: '14px 18px',
            }}>
              <p style={{ fontSize: 13, color: COLORS.darkBlue, margin: 0, lineHeight: 1.7 }}>
                <Lightbulb size={16} color={COLORS.warning} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> <strong>Tip:</strong> Client contact details become available after your bid is awarded.
                Make sure your bid proposal clearly outlines your timeline, materials, and methodology.
              </p>
            </div>
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {tab === 'documents' && (
          <div style={S.card}>
            <h3 style={{ ...S.h3, marginBottom: 20 }}>Project Documents</h3>
            {!project.documents || project.documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ marginBottom: 12 }}><FolderOpen size={48} color={COLORS.textLight} /></div>
                <p style={{ color: COLORS.textMuted }}>No documents have been attached to this project.</p>
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

        {/* Bottom CTA */}
        {canBid && (
          <div style={{
            ...S.card, marginTop: 24,
            backgroundColor: COLORS.primaryLight,
            border: `1px solid ${COLORS.primary}33`,
            textAlign: 'center',
          }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, margin: '0 0 6px' }}>
              {myBid ? 'Want to update your bid?' : 'Ready to place your bid?'}
            </p>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 16px' }}>
              Deadline: <strong>{formatDateTime(project.bid_deadline)}</strong>
            </p>
            <button
              onClick={() => navigate(`/contractor/projects/${projectId}/bid`)}
              style={{ ...S.btnAccent, padding: '12px 32px', fontSize: 15, fontWeight: 700 }}>
              {myBid ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pencil size={14} /> Revise My Bid</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileEdit size={14} /> Submit a Bid</span>}
            </button>
          </div>
        )}

      </div>

      {/* Review prompt — contractor reviews client after project completes */}
      {project?.status === 'completed' && myBid?.status === 'awarded' && (
        <div style={{ maxWidth: 900, margin: '20px auto 0' }}>
          {showReview ? (
            <ReviewForm
              projectId={projectId}
              reviewerId={profile.id}
              revieweeId={project.client_id}
              reviewerRole="contractor"
              revieweeName={project.client?.company_name || project.client?.full_name}
              onDone={() => setShowReview(false)}
              onClose={() => setShowReview(false)}
            />
          ) : (
            <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star size={18} color={COLORS.accent} fill={COLORS.accent} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>Rate the client</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>Share your experience with {project.client?.company_name || project.client?.full_name}</div>
                </div>
              </div>
              <button onClick={() => setShowReview(true)}
                style={{ ...S.btnPrimary, padding: '8px 20px', fontSize: 13 }}>
                Leave Review
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
