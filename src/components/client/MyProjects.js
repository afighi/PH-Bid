import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { getClientProjects, duplicateProject, extendDeadline } from '../../services/projectService';
import { supabase } from '../../config/supabase';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Search, Settings2, X, MapPin, Copy, CalendarClock } from 'lucide-react';
import { PROJECT_TYPES, PHILIPPINE_REGIONS } from '../../utils/constants';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

const STATUSES = ['open', 'awarded', 'in_progress', 'completed', 'cancelled'];
const STATUS_LABELS = {
  open: 'Open', awarded: 'Awarded', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};
const SORT_OPTIONS = [
  { value: 'newest',        label: 'Newest First' },
  { value: 'oldest',        label: 'Oldest First' },
  { value: 'most_bids',     label: 'Most Bids' },
  { value: 'budget_high',   label: 'Budget: High → Low' },
  { value: 'budget_low',    label: 'Budget: Low → High' },
  { value: 'deadline_soon', label: 'Deadline: Soonest' },
  { value: 'deadline_late', label: 'Deadline: Latest' },
];

const DEFAULT_FILTERS = {
  search:       '',
  statuses:     [],
  projectType:  '',
  region:       '',
  budgetMin:    '',
  budgetMax:    '',
  postedFrom:   '',
  postedTo:     '',
  deadlineFrom: '',
  deadlineTo:   '',
  sortBy:       'newest',
};

function activeFilterCount(f) {
  let n = 0;
  if (f.search)            n++;
  if (f.statuses.length)   n += f.statuses.length;
  if (f.projectType)       n++;
  if (f.region)            n++;
  if (f.budgetMin)         n++;
  if (f.budgetMax)         n++;
  if (f.postedFrom)        n++;
  if (f.postedTo)          n++;
  if (f.deadlineFrom)      n++;
  if (f.deadlineTo)        n++;
  if (f.sortBy !== 'newest') n++;
  return n;
}

export default function MyProjects() {
  const { profile } = useAuthStore();
  const navigate    = useNavigate();

  const [projects,   setProjects]   = useState([]);
  const [bidCounts,  setBidCounts]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS);
  const [showPanel,  setShowPanel]  = useState(false);
  const [extendModal, setExtendModal] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');

  const handleRepost = async (projectId) => {
    if (!window.confirm('Create a copy of this project as a new open listing?')) return;
    try {
      const copy = await duplicateProject(projectId, profile.id);
      setProjects(prev => [copy, ...prev]);
      navigate(`/client/projects/${copy.id}`);
    } catch (e) {
      alert('Failed to re-post: ' + e.message);
    }
  };

  const handleExtend = (projectId, currentDeadline) => {
    const min = new Date(currentDeadline);
    min.setDate(min.getDate() + 1);
    setNewDeadline(min.toISOString().slice(0, 10));
    setExtendModal(projectId);
  };

  const confirmExtend = async () => {
    if (!newDeadline) return;
    try {
      const updated = await extendDeadline(extendModal, new Date(newDeadline).toISOString());
      setProjects(prev => prev.map(p => p.id === extendModal ? { ...p, bid_deadline: updated.bid_deadline } : p));
      setExtendModal(null);
    } catch (e) {
      alert('Failed to extend: ' + e.message);
    }
  };

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const toggleStatus = (s) =>
    setFilters((f) => ({
      ...f,
      statuses: f.statuses.includes(s)
        ? f.statuses.filter((x) => x !== s)
        : [...f.statuses, s],
    }));

  const fetchProjects = useCallback(async () => {
    if (!profile) return;
    const data = await getClientProjects(profile.id);
    setProjects(data);
    setLoading(false);
    if (data.length) {
      const ids = data.map((p) => p.id);
      const { data: bids } = await supabase.from('bids').select('project_id').in('project_id', ids);
      if (bids) {
        const counts = {};
        bids.forEach((b) => { counts[b.project_id] = (counts[b.project_id] || 0) + 1; });
        setBidCounts(counts);
      }
    }
  }, [profile]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useRealtimeQuery(['projects', 'bids'], fetchProjects, null, [profile?.id]);

  const filtered = useMemo(() => {
    let r = [...projects];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.location_city?.toLowerCase().includes(q)
      );
    }

    if (filters.statuses.length)  r = r.filter((p) => filters.statuses.includes(p.status));
    if (filters.projectType)      r = r.filter((p) => p.project_type === filters.projectType);
    if (filters.region)           r = r.filter((p) => p.location_region === filters.region);
    if (filters.budgetMin)        r = r.filter((p) => p.budget_max >= Number(filters.budgetMin));
    if (filters.budgetMax)        r = r.filter((p) => p.budget_min <= Number(filters.budgetMax));
    if (filters.postedFrom)       r = r.filter((p) => new Date(p.created_at) >= new Date(filters.postedFrom));
    if (filters.postedTo)         r = r.filter((p) => new Date(p.created_at) <= new Date(filters.postedTo + 'T23:59:59'));
    if (filters.deadlineFrom)     r = r.filter((p) => new Date(p.bid_deadline) >= new Date(filters.deadlineFrom));
    if (filters.deadlineTo)       r = r.filter((p) => new Date(p.bid_deadline) <= new Date(filters.deadlineTo));

    switch (filters.sortBy) {
      case 'oldest':        r.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case 'most_bids':     r.sort((a, b) => (bidCounts[b.id] || 0) - (bidCounts[a.id] || 0)); break;
      case 'budget_high':   r.sort((a, b) => b.budget_max - a.budget_max); break;
      case 'budget_low':    r.sort((a, b) => a.budget_min - b.budget_min); break;
      case 'deadline_soon': r.sort((a, b) => new Date(a.bid_deadline) - new Date(b.bid_deadline)); break;
      case 'deadline_late': r.sort((a, b) => new Date(b.bid_deadline) - new Date(a.bid_deadline)); break;
      default:              r.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return r;
  }, [projects, filters, bidCounts]);

  const activeCount = activeFilterCount(filters);
  const hasFilters  = activeCount > 0;

  // Active filter chips
  const chips = [];
  if (filters.search)      chips.push({ label: `"${filters.search}"`, clear: () => set('search', '') });
  filters.statuses.forEach((s) => chips.push({ label: STATUS_LABELS[s], clear: () => toggleStatus(s) }));
  if (filters.projectType) chips.push({ label: PROJECT_TYPES.find((t) => t.value === filters.projectType)?.label, clear: () => set('projectType', '') });
  if (filters.region)      chips.push({ label: filters.region, clear: () => set('region', '') });
  if (filters.budgetMin)   chips.push({ label: `Min ₱${Number(filters.budgetMin).toLocaleString()}`, clear: () => set('budgetMin', '') });
  if (filters.budgetMax)   chips.push({ label: `Max ₱${Number(filters.budgetMax).toLocaleString()}`, clear: () => set('budgetMax', '') });
  if (filters.postedFrom)  chips.push({ label: `Posted from ${filters.postedFrom}`, clear: () => set('postedFrom', '') });
  if (filters.postedTo)    chips.push({ label: `Posted to ${filters.postedTo}`, clear: () => set('postedTo', '') });
  if (filters.deadlineFrom) chips.push({ label: `Deadline from ${filters.deadlineFrom}`, clear: () => set('deadlineFrom', '') });
  if (filters.deadlineTo)  chips.push({ label: `Deadline to ${filters.deadlineTo}`, clear: () => set('deadlineTo', '') });

  return (
    <DashboardLayout title="My Projects">

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: COLORS.textMuted }}><Search size={16} /></span>
          <input
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search by title, description, or city..."
            style={{ ...S.input, paddingLeft: 36, width: '100%' }}
          />
        </div>

        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => set('sortBy', e.target.value)}
          style={{ ...S.input, width: 190 }}
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Filters toggle */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            ...S.clientBtnSecondary,
            padding: '10px 16px',
            backgroundColor: showPanel ? `${COLORS.primary}15` : undefined,
            borderColor: showPanel ? COLORS.primary : undefined,
            color: showPanel ? COLORS.primary : undefined,
            position: 'relative',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Settings2 size={16} /> Filters</span>
          {activeCount > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              backgroundColor: COLORS.primary, color: '#fff',
              borderRadius: '50%', fontSize: 10, fontWeight: 700,
              width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{activeCount}</span>
          )}
        </button>

        <button onClick={() => navigate('/client/new-project')} style={{ ...S.clientBtnPrimary }}>
          + Post Project
        </button>
      </div>

      {/* ── Advanced filter panel ── */}
      {showPanel && (
        <div style={{
          ...S.clientCard,
          marginBottom: 16,
          border: `1.5px solid ${COLORS.primary}33`,
          backgroundColor: `${COLORS.primary}05`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, margin: 0 }}>Advanced Filters</p>
            {hasFilters && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: COLORS.danger, fontWeight: 600,
              }}><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Clear All</span></button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Status */}
            <div>
              <Label>Status</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => toggleStatus(s)} style={{
                    padding: '5px 12px', borderRadius: 20, border: `1.5px solid`,
                    borderColor: filters.statuses.includes(s) ? COLORS.primary : COLORS.border,
                    backgroundColor: filters.statuses.includes(s) ? `${COLORS.primary}15` : COLORS.white,
                    color: filters.statuses.includes(s) ? COLORS.primary : COLORS.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>{STATUS_LABELS[s]}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {/* Project Type */}
              <div style={{ flex: '1 1 200px' }}>
                <Label>Project Type</Label>
                <select style={S.input} value={filters.projectType} onChange={(e) => set('projectType', e.target.value)}>
                  <option value="">All Types</option>
                  {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Region */}
              <div style={{ flex: '1 1 200px' }}>
                <Label>Region</Label>
                <select style={S.input} value={filters.region} onChange={(e) => set('region', e.target.value)}>
                  <option value="">All Regions</option>
                  {PHILIPPINE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Budget Range */}
              <div style={{ flex: '1 1 250px' }}>
                <Label>Budget Range (₱)</Label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" min="0" placeholder="Min"
                    value={filters.budgetMin}
                    onChange={(e) => set('budgetMin', e.target.value)}
                    style={{ ...S.input, flex: 1 }}
                  />
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>–</span>
                  <input
                    type="number" min="0" placeholder="Max"
                    value={filters.budgetMax}
                    onChange={(e) => set('budgetMax', e.target.value)}
                    style={{ ...S.input, flex: 1 }}
                  />
                </div>
              </div>

              {/* Posted Date */}
              <div style={{ flex: '1 1 280px' }}>
                <Label>Date Posted</Label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="date" value={filters.postedFrom} onChange={(e) => set('postedFrom', e.target.value)}
                    style={{ ...S.input, flex: 1, fontSize: 12, padding: '10px 8px' }} />
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>–</span>
                  <input type="date" value={filters.postedTo} onChange={(e) => set('postedTo', e.target.value)}
                    style={{ ...S.input, flex: 1, fontSize: 12, padding: '10px 8px' }} />
                </div>
              </div>

              {/* Bid Deadline */}
              <div style={{ flex: '1 1 280px' }}>
                <Label>Bid Deadline</Label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="date" value={filters.deadlineFrom} onChange={(e) => set('deadlineFrom', e.target.value)}
                    style={{ ...S.input, flex: 1, fontSize: 12, padding: '10px 8px' }} />
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>–</span>
                  <input type="date" value={filters.deadlineTo} onChange={(e) => set('deadlineTo', e.target.value)}
                    style={{ ...S.input, flex: 1, fontSize: 12, padding: '10px 8px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ── */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {chips.map((chip, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              backgroundColor: `${COLORS.primary}12`,
              color: COLORS.primary,
              border: `1px solid ${COLORS.primary}33`,
              borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 600,
            }}>
              {chip.label}
              <button onClick={chip.clear} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: COLORS.primary, fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* ── Result count ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
          {loading ? 'Loading...' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''} found`}
          {hasFilters && !loading && ` (filtered from ${projects.length})`}
        </p>
      </div>

      {/* ── Project grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.clientCard, textAlign: 'center', padding: 60 }}>
          <div style={{ marginBottom: 12 }}><Search size={48} color={COLORS.textLight} /></div>
          <p style={{ color: COLORS.textMuted, fontWeight: 600, marginBottom: 8 }}>No projects match your filters.</p>
          <p style={{ color: COLORS.textLight, fontSize: 13, marginBottom: 20 }}>Try adjusting your criteria or clear all filters.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {hasFilters && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} style={{ ...S.clientBtnSecondary, padding: '10px 20px' }}>
                Clear Filters
              </button>
            )}
            <button onClick={() => navigate('/client/new-project')} style={{ ...S.clientBtnPrimary, padding: '10px 20px' }}>
              Post a Project
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: 16 }}>
          {filtered.map((p) => {
            const bids = bidCounts[p.id] || 0;
            return (
              <ProjectCard
                key={p.id}
                project={p}
                bids={bids}
                onClick={() => navigate(`/client/projects/${p.id}`)}
                onViewBids={(e) => { e.stopPropagation(); navigate(`/client/projects/${p.id}/bids`); }}
                onRepost={handleRepost}
                onExtend={handleExtend}
              />
            );
          })}
        </div>
      )}
      {/* Extend deadline modal */}
      {extendModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setExtendModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 6 }}>Extend Bid Deadline</div>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>Choose a new closing date for this project.</p>
            <input type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, color: COLORS.text, outline: 'none', fontFamily: 'inherit', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setExtendModal(null)} style={{ flex: 1, background: COLORS.gray100, color: COLORS.textMuted, border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmExtend} style={{ flex: 2, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Extend Deadline</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 7px' }}>
      {children}
    </p>
  );
}

/* ── Status dot config ── */
const STATUS_DOT = {
  open:        { color: '#059669', label: 'Open for Bidding' },
  in_progress: { color: COLORS.primary, label: 'In Progress' },
  awarded:     { color: '#C07838', label: 'Awarded' },
  completed:   { color: '#6B7280', label: 'Completed' },
  cancelled:   { color: '#DC2626', label: 'Cancelled' },
  draft:       { color: '#A0AEC0', label: 'Draft' },
};

/* ── Clean project card ── */
function ProjectCard({ project: p, bids, onClick, onViewBids, onRepost, onExtend }) {
  const [hovered, setHovered] = useState(false);
  const dot = STATUS_DOT[p.status] || { color: COLORS.border, label: p.status };
  const typeLabel = PROJECT_TYPES.find((t) => t.value === p.project_type)?.label || p.project_type;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        border: `1px solid ${hovered ? COLORS.borderStrong : COLORS.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        boxShadow: hovered ? '0 6px 22px rgba(26,10,0,0.10)' : '0 1px 4px rgba(26,10,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Cover image ── */}
      <div style={{ height: 148, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {p.cover_image ? (
          <>
            <img
              src={p.cover_image}
              alt={p.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease', transform: hovered ? 'scale(1.04)' : 'scale(1)' }}
            />
            {/* Subtle gradient overlay so text is readable if overlaid later */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 55%)', pointerEvents: 'none' }} />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #3D1500 0%, #7B3F00 55%, #A05A1E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', top: -20, right: -20, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', bottom: -10, left: 20, pointerEvents: 'none' }} />
            <img
              src="/buildbid_logo.png"
              alt="BuildBid PH"
              style={{ height: 36, filter: 'brightness(0) invert(1)', opacity: 0.75 }}
            />
          </div>
        )}

        {/* Status dot badge — overlaid on image */}
        <div style={{
          position: 'absolute', top: 10, left: 12,
          display: 'flex', alignItems: 'center', gap: 5,
          backgroundColor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          borderRadius: 20, padding: '4px 10px',
          border: '1px solid rgba(255,255,255,0.6)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dot.color, flexShrink: 0, boxShadow: `0 0 0 2px ${dot.color}30` }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: dot.color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            {dot.label}
          </span>
        </div>

        {/* Date — top right */}
        <div style={{
          position: 'absolute', top: 10, right: 12,
          backgroundColor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          borderRadius: 20, padding: '4px 9px',
          fontSize: 10, fontWeight: 600, color: COLORS.textMuted,
          border: '1px solid rgba(255,255,255,0.6)',
        }}>
          {formatDate(p.created_at)}
        </div>
      </div>

      {/* ── Card content ── */}
      <div style={{ padding: '14px 18px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Title */}
        <h3 style={{ fontSize: 14, fontWeight: 800, color: COLORS.text, margin: '0 0 5px', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
          {truncate(p.title, 65)}
        </h3>

        {/* Location + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: COLORS.textMuted }}>
            <MapPin size={10} style={{ flexShrink: 0 }} />
            {p.location_city}, {p.location_region}
          </span>
          {p.project_type && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`, borderRadius: 4,
              padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase',
              backgroundColor: COLORS.gray50,
            }}>
              {typeLabel?.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '10px 0', marginBottom: 12,
        }}>
          <StatItem label="Budget" value={`${formatCurrency(p.budget_min)}+`} accent />
          <StatItem label="Deadline" value={formatDate(p.bid_deadline)} center />
          <StatItem label="Bids" value={bids} accent={bids > 0} right />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={e => { e.stopPropagation(); onRepost(p.id); }}
              title="Re-post as new project"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.color = COLORS.textMuted; }}
            >
              <Copy size={11} /> Re-post
            </button>
            {p.status === 'open' && (
              <button
                onClick={e => { e.stopPropagation(); onExtend(p.id, p.bid_deadline); }}
                title="Extend bid deadline"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.color = COLORS.textMuted; }}
              >
                <CalendarClock size={11} /> Extend
              </button>
            )}
          </div>
          <button
            onClick={onViewBids}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: COLORS.text, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border;  e.currentTarget.style.color = COLORS.text; }}
          >
            View Bids
            {bids > 0 && <span style={{ color: COLORS.success, fontWeight: 800 }}>{bids}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, accent, center, right }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      paddingLeft: center ? 0 : right ? 16 : 0,
      paddingRight: center ? 0 : right ? 0 : 16,
      borderRight: !right ? `1px solid ${COLORS.border}` : 'none',
      textAlign: center ? 'center' : right ? 'right' : 'left',
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ? COLORS.primary : COLORS.text }}>
        {value}
      </span>
    </div>
  );
}
