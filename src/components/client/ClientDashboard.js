import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { getClientProjects } from '../../services/projectService';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { FolderPlus, ArrowUpRight, Eye, X, Building2, CircleDollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { ArchieBanner } from '../shared/ArchiePanel';

/* ── Project detail modal ─────────────────────────────────────── */
function ProjectModal({ project, onClose }) {
  if (!project) return null;
  const FIELD = (label, value) => value ? (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.text, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Project Details</div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>{project.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '16px 24px', overflowY: 'auto' }}>
          {FIELD('Status', project.status?.replace(/_/g, ' '))}
          {FIELD('Type', project.project_type?.replace(/_/g, ' '))}
          {FIELD('Location', [project.location_city, project.location_region].filter(Boolean).join(', '))}
          {FIELD('Budget Range', `${formatCurrency(project.budget_min)} – ${formatCurrency(project.budget_max)}`)}
          {FIELD('Bid Deadline', project.bid_deadline ? formatDate(project.bid_deadline) : null)}
          {FIELD('Posted', formatDate(project.created_at))}
          {project.description && (
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</div>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, margin: 0 }}>{project.description}</p>
            </div>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 10 }}>
          <button onClick={() => { onClose(); }} style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center', padding: '10px 0' }}>
            Close
          </button>
          <button onClick={() => { onClose(); }} style={{ ...S.btnPrimary, flex: 2, justifyContent: 'center', padding: '10px 0' }}>
            <ArrowUpRight size={14} /> View Full Project
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Status pill ──────────────────────────────────────────────── */
const STATUS_META = {
  open:        { label: 'Open for Bids', color: '#059669', bg: '#ECFDF5' },
  awarded:     { label: 'Awarded',       color: '#7B3F00', bg: '#F5E6D3' },
  in_progress: { label: 'In Progress',   color: '#D97706', bg: '#FFFBEB' },
  completed:   { label: 'Completed',     color: '#64748B', bg: '#F1F5F9' },
  cancelled:   { label: 'Cancelled',     color: '#DC2626', bg: '#FEF2F2' },
};

function StatusPill({ status }) {
  const m = STATUS_META[status] || { label: status, color: COLORS.textMuted, bg: COLORS.gray50 };
  return (
    <span style={{ backgroundColor: m.bg, color: m.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {m.label}
    </span>
  );
}

/* ── Client dashboard ─────────────────────────────────────────── */
export default function ClientDashboard() {
  const { profile } = useAuthStore();
  const navigate    = useNavigate();
  const { isMobile } = useBreakpoint();
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [archieOpen,  setArchieOpen]  = useState(false);

  const fetchProjects = useCallback(() => {
    if (!profile) return;
    getClientProjects(profile.id).then(data => { setProjects(data); setLoading(false); });
  }, [profile]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useRealtimeQuery('projects', fetchProjects, profile?.id ? `client_id=eq.${profile.id}` : null, [profile?.id]);

  const stats = {
    total:      projects.length,
    open:       projects.filter(p => p.status === 'open').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    completed:  projects.filter(p => p.status === 'completed').length,
  };

  const recent = projects.slice(0, 6);

  const STAT_ITEMS = [
    { label: 'Total Projects', value: stats.total,      icon: <Building2 size={20} color={COLORS.primary} />,  color: COLORS.primary, bg: '#F5E6D3' },
    { label: 'Open for Bids',  value: stats.open,       icon: <CircleDollarSign size={20} color='#059669' />,   color: '#059669',       bg: '#ECFDF5' },
    { label: 'In Progress',    value: stats.inProgress, icon: <Clock size={20} color={COLORS.warning} />,       color: COLORS.warning,  bg: '#FFFBEB' },
    { label: 'Completed',      value: stats.completed,  icon: <CheckCircle2 size={20} color='#64748B' />,       color: '#64748B',       bg: '#F1F5F9' },
  ];

  return (
    <DashboardLayout title="">
      <ProjectModal project={selected} onClose={() => setSelected(null)} />

      {/* ── Archie welcome banner ── */}
      <ArchieBanner
        role="client"
        profile={profile}
        stats={stats}
        onOpenChat={() => setArchieOpen(true)}
      />

      {/* ── Get Started banner (empty state only) ── */}
      {!loading && projects.length === 0 && (
        <div style={{
          backgroundColor: '#F5E6D3',
          borderRadius: 16, border: `1px solid ${COLORS.border}`,
          padding: '24px 28px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primaryDark, marginBottom: 4 }}>
              Welcome to BuildBid PH!
            </div>
            <div style={{ fontSize: 13, color: COLORS.primary }}>
              Post your first construction project and start receiving bids from certified contractors.
            </div>
          </div>
          <button onClick={() => navigate('/client/new-project')} style={{ ...S.btnPrimary, padding: '11px 22px', flexShrink: 0 }}>
            Post a Project
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        {STAT_ITEMS.map(({ label, value, icon, color, bg }) => (
          <div key={label} style={{ backgroundColor: '#FFF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginTop: 2, letterSpacing: '0.02em' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 18 }}>

        {/* Recent projects table */}
        <div style={{ backgroundColor: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.01em' }}>Recent Projects</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textMuted }}>Your latest posted projects</p>
            </div>
            <button onClick={() => navigate('/client/projects')} style={{ ...S.btnSecondary, padding: '7px 14px', fontSize: 12, gap: 5 }}>
              View All <ArrowUpRight size={12} />
            </button>
          </div>

          <div style={{ padding: '0 4px' }}>
            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <div style={{ width: 28, height: 28, border: `3px solid rgba(37,99,235,0.2)`, borderTopColor: COLORS.primary, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : recent.length === 0 ? (
              <div style={{ padding: '52px 24px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#F5E6D3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Building2 size={24} color={COLORS.primary} />
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, margin: '0 0 6px' }}>No projects yet</p>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 20px' }}>Your construction projects will appear here once you post them.</p>
                <button onClick={() => navigate('/client/new-project')} style={{ ...S.btnPrimary, padding: '10px 20px', gap: 6 }}>
                  <FolderPlus size={14} /> Post a Project
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {['Project', 'Budget', 'Status', 'Deadline', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 18px', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#FAFAFA' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                      <td style={{ padding: '13px 18px', maxWidth: 220 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {truncate(p.title, 40)}
                        </p>
                        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0, textTransform: 'capitalize' }}>
                          {p.project_type?.replace(/_/g, ' ') || 'Project'}
                        </p>
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 12, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap' }}>
                        {formatCurrency(p.budget_min)}
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <StatusPill status={p.status} />
                      </td>
                      <td style={{ padding: '13px 18px', fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                        {p.bid_deadline ? formatDate(p.bid_deadline) : '—'}
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <button
                          onClick={() => setSelected(p)}
                          style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                        >
                          <Eye size={12} /> See Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick actions */}
          <div style={{ backgroundColor: '#FFF', borderRadius: 16, padding: '18px 18px', border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 14 }}>Quick Actions</div>
            {[
              { label: 'Post New Project', path: '/client/new-project', highlight: true },
              { label: 'View All Projects', path: '/client/projects', highlight: false },
              { label: 'Payment History', path: '/client/transactions', highlight: false },
              { label: 'Messages', path: '/client/messages', highlight: false },
            ].map(({ label, path, highlight }) => (
              <button key={path} onClick={() => navigate(path)} style={{
                width: '100%', border: 'none', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: 'transparent',
                color: highlight ? COLORS.primary : COLORS.text, padding: '11px 0', fontSize: 13, fontWeight: highlight ? 700 : 500,
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.primary}
              onMouseLeave={e => e.currentTarget.style.color = highlight ? COLORS.primary : COLORS.text}
              >
                {label} <ArrowUpRight size={13} />
              </button>
            ))}
          </div>

          {/* Project status breakdown */}
          <div style={{ backgroundColor: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: '18px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.text, marginBottom: 14, letterSpacing: '-0.01em' }}>Status Breakdown</div>
            {[
              { label: 'Open',        count: stats.open,       color: '#059669' },
              { label: 'In Progress', count: stats.inProgress, color: COLORS.warning },
              { label: 'Completed',   count: stats.completed,  color: '#64748B' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>{label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{count}</span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 6, height: 8 }}>
                {[
                  { count: stats.open,       color: '#059669' },
                  { count: stats.inProgress, color: COLORS.warning },
                  { count: stats.completed,  color: '#CBD5E1' },
                ].map(({ count, color }, i) => stats.total > 0 && (
                  <div key={i} style={{ flex: count / stats.total, backgroundColor: color, minWidth: count > 0 ? 4 : 0, transition: 'flex 0.3s' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Post a project CTA */}
          <button onClick={() => navigate('/client/new-project')}
            style={{ backgroundColor: COLORS.primary, color: '#FFF', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(123,63,0,0.25)', letterSpacing: '0.02em', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ✨ Post New Project
          </button>
        </div>
      </div>

    </DashboardLayout>
  );
}
