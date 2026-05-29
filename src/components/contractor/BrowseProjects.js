import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import LiveBidCounter from '../shared/LiveBidCounter';
import { getOpenProjects } from '../../services/projectService';
import { getSuggestedProjects, matchLabel } from '../../services/suggestionService';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../../services/watchlistService';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency } from '../../utils/formatters';
import { PHILIPPINE_REGIONS, PROJECT_TYPES } from '../../utils/constants';
import { COLORS } from '../../theme';
import {
  MapPin, Sparkles, Search, Clock, TrendingUp, ChevronDown,
  X, Star, Zap, Building2, Home, Factory,
  Milestone, Wrench, Plug, Droplets, Sofa, HardHat,
  ArrowUpDown, LayoutGrid, Bookmark, BookmarkCheck, BarChart2, SlidersHorizontal,
} from 'lucide-react';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';
import { useBreakpoint } from '../../hooks/useBreakpoint';

function daysLeft(deadline) {
  return Math.ceil((new Date(deadline) - Date.now()) / 86400000);
}

function DaysLeftBadge({ deadline }) {
  const d = daysLeft(deadline);
  if (d <= 0)  return <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Closed</span>;
  if (d <= 2)  return <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={10} /> {d}d left</span>;
  if (d <= 7)  return <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {d}d left</span>;
  return           <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray100, padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {d}d left</span>;
}

const TYPE_META = {
  residential:    { icon: Home,      short: 'Residential' },
  commercial:     { icon: Building2, short: 'Commercial' },
  industrial:     { icon: Factory,   short: 'Industrial' },
  infrastructure: { icon: Milestone, short: 'Infrastructure' },
  renovation:     { icon: Wrench,    short: 'Renovation' },
  electrical:     { icon: Plug,      short: 'Electrical' },
  plumbing:       { icon: Droplets,  short: 'Plumbing' },
  interior:       { icon: Sofa,      short: 'Interior Design' },
};

function TypeIcon({ value, size = 12, color }) {
  const Meta = TYPE_META[value];
  if (!Meta) return <HardHat size={size} color={color} />;
  const Icon = Meta.icon;
  return <Icon size={size} color={color} />;
}

// ── Compare Modal ────────────────────────────────────────────────
function CompareModal({ projects, onClose }) {
  const fields = [
    { label: 'Budget',    fn: p => `${formatCurrency(p.budget_min)} – ${formatCurrency(p.budget_max)}` },
    { label: 'Type',      fn: p => TYPE_META[p.project_type]?.short || p.project_type },
    { label: 'Location',  fn: p => `${p.location_city}, ${p.location_region}` },
    { label: 'Deadline',  fn: p => { const d = daysLeft(p.bid_deadline); return d <= 0 ? 'Closed' : `${d} days left`; } },
    { label: 'Client Rating', fn: p => p.client?.average_rating > 0 ? `${p.client.average_rating.toFixed(1)} / 5` : 'No rating' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700, overflow: 'auto', maxHeight: '85vh', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.gray50 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={16} /> Compare Projects</div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}><X size={14} /></button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.gray50 }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${COLORS.border}`, width: 120 }}>Field</th>
                {projects.map(p => (
                  <th key={p.id} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, fontWeight: 800, color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(({ label, fn }) => (
                <tr key={label} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', background: COLORS.gray50, whiteSpace: 'nowrap' }}>{label}</td>
                  {projects.map(p => (
                    <td key={p.id} style={{ padding: '12px 20px', fontSize: 13, color: COLORS.text }}>{fn(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 12 }}>
          {projects.map(p => (
            <button key={p.id} style={{ flex: 1, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              onClick={onClose}>
              Bid on this one
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────
function ProjectCard({ project, onView, onBid, matchScore, featured, watched, onToggleWatch, onCompare, inCompare }) {
  const [hov,      setHov]      = useState(false);
  const [watching, setWatching] = useState(false);
  const typeValue = project.project_type;
  const typeShort = TYPE_META[typeValue]?.short || typeValue;
  const match     = matchScore != null ? matchLabel(matchScore) : null;
  const days      = daysLeft(project.bid_deadline);
  const urgent    = days <= 3 && days > 0;

  return (
    <div
      onClick={() => onView(project.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#fff',
        borderRadius: 16,
        border: `1.5px solid ${hov ? COLORS.borderStrong : featured ? COLORS.accent + '55' : COLORS.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        boxShadow: hov
          ? '0 12px 36px rgba(26,10,0,0.10)'
          : featured
          ? '0 4px 16px rgba(192,120,56,0.12)'
          : '0 2px 8px rgba(26,10,0,0.05)',
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all 0.22s ease',
      }}
    >
      {/* Cover image */}
      <div style={{ height: 160, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {project.cover_image ? (
          <>
            <img src={project.cover_image} alt={project.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hov ? 'scale(1.05)' : 'scale(1)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 60%)', pointerEvents: 'none' }} />
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%', position: 'relative',
            background: 'linear-gradient(135deg, #3D1500 0%, #7B3F00 55%, #A05A1E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', top: -30, right: -30 }} />
            <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', bottom: -15, left: 20 }} />
            <img src="/buildbid_logo.png" alt="BuildBid PH"
              style={{ height: 38, filter: 'brightness(0) invert(1)', opacity: 0.7 }} />
          </div>
        )}

        {/* Type chip */}
        <div style={{
          position: 'absolute', top: 10, left: 12,
          background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(8px)',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color: COLORS.primary,
          letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <TypeIcon value={typeValue} size={11} color={COLORS.primary} />
          {typeShort}
        </div>

        {/* Match or Featured badge */}
        {match ? (
          <div style={{
            position: 'absolute', top: 10, right: 12,
            background: match.color, borderRadius: 20, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Sparkles size={10} /> {matchScore}% match
          </div>
        ) : featured ? (
          <div style={{
            position: 'absolute', top: 10, right: 12,
            background: COLORS.accent, borderRadius: 20, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Star size={10} fill="#fff" /> Featured
          </div>
        ) : null}

        {/* Urgent ribbon */}
        {urgent && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to right, #DC2626cc, #DC262699)',
            backdropFilter: 'blur(4px)',
            padding: '5px 12px',
            fontSize: 11, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Zap size={11} fill="#fff" /> Closing in {days} day{days !== 1 ? 's' : ''} — bid soon
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        <h3 style={{
          margin: '0 0 6px', fontSize: 15, fontWeight: 700,
          color: COLORS.text, lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {project.title}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.textMuted, marginBottom: 16 }}>
          <MapPin size={12} />{project.location_city}, {project.location_region}
        </div>

        <div style={{
          borderRadius: 12, padding: '12px 16px', marginBottom: 14,
          background: 'linear-gradient(135deg, #FAF5EC 0%, #F5ECE0 100%)',
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Budget</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: COLORS.primary, letterSpacing: '-0.02em' }}>
            {formatCurrency(project.budget_min)}
            <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.textMuted, margin: '0 4px' }}>–</span>
            {formatCurrency(project.budget_max)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'auto', paddingBottom: 14 }}>
          <DaysLeftBadge deadline={project.bid_deadline} />
          {project.client?.average_rating > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray100, padding: '3px 9px', borderRadius: 20 }}>
              <Star size={10} fill={COLORS.accent} color={COLORS.accent} />{project.client.average_rating.toFixed(1)} client
            </span>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <LiveBidCounter projectId={project.id} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={async e => { e.stopPropagation(); setWatching(true); await onToggleWatch(project.id, watched); setWatching(false); }}
                title={watched ? 'Remove from watchlist' : 'Save to watchlist'}
                style={{ width: 32, height: 32, border: `1px solid ${watched ? COLORS.accent : COLORS.border}`, borderRadius: 9, background: watched ? COLORS.accentLight : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: watched ? COLORS.accent : COLORS.textMuted, transition: 'all 0.15s', opacity: watching ? 0.5 : 1 }}
              >
                {watched ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onCompare(project); }}
                title={inCompare ? 'Remove from compare' : 'Add to compare'}
                style={{ width: 32, height: 32, border: `1px solid ${inCompare ? COLORS.primary : COLORS.border}`, borderRadius: 9, background: inCompare ? COLORS.primaryLight : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: inCompare ? COLORS.primary : COLORS.textMuted, transition: 'all 0.15s' }}
              >
                <BarChart2 size={13} />
              </button>
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onBid(project.id); }}
            style={{ width: '100%', background: hov ? COLORS.primaryDark : COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s', boxShadow: hov ? '0 4px 14px rgba(122,62,15,0.35)' : 'none' }}
          >
            Place Bid
          </button>
        </div>
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest first' },
  { value: 'closing',      label: 'Closing soon' },
  { value: 'budget_high',  label: 'Budget: High to Low' },
  { value: 'budget_low',   label: 'Budget: Low to High' },
  { value: 'most_bids',    label: 'Most bids' },
];

function sortProjects(projects, sort) {
  const arr = [...projects];
  switch (sort) {
    case 'newest':      return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'closing':     return arr.sort((a, b) => new Date(a.bid_deadline) - new Date(b.bid_deadline));
    case 'budget_high': return arr.sort((a, b) => b.budget_max - a.budget_max);
    case 'budget_low':  return arr.sort((a, b) => a.budget_min - b.budget_min);
    case 'most_bids':   return arr.sort((a, b) => (b.bid_count || 0) - (a.bid_count || 0));
    default:            return arr;
  }
}

// ── Sidebar filter panel ─────────────────────────────────────────
function FilterSidebar({ activeType, setActiveType, filters, setF, clearAll, hasFilters, allProjects }) {
  const typeCounts = useMemo(() => {
    const counts = {};
    allProjects.forEach(p => { counts[p.project_type] = (counts[p.project_type] || 0) + 1; });
    return counts;
  }, [allProjects]);

  return (
    <div style={{
      width: 240, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>
      {/* Category */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={() => setActiveType('')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: !activeType ? `${COLORS.primary}14` : 'transparent',
              color: !activeType ? COLORS.primary : COLORS.textMuted,
              fontWeight: !activeType ? 700 : 500, fontSize: 13, textAlign: 'left',
              transition: 'all 0.12s',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LayoutGrid size={14} /> All Projects
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, background: COLORS.gray100, padding: '1px 7px', borderRadius: 20 }}>
              {allProjects.length}
            </span>
          </button>
          {PROJECT_TYPES.map(t => {
            const Icon = TYPE_META[t.value]?.icon || HardHat;
            const short = TYPE_META[t.value]?.short || t.value;
            const count = typeCounts[t.value] || 0;
            const active = activeType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setActiveType(active ? '' : t.value)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? `${COLORS.primary}14` : 'transparent',
                  color: active ? COLORS.primary : COLORS.textMuted,
                  fontWeight: active ? 700 : 500, fontSize: 13, textAlign: 'left',
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} /> {short}
                </span>
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? COLORS.primary : COLORS.textMuted, background: active ? `${COLORS.primary}20` : COLORS.gray100, padding: '1px 7px', borderRadius: 20 }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: COLORS.border }} />

      {/* Region */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Region</div>
        <select
          value={filters.region} onChange={e => setF('region', e.target.value)}
          style={{ width: '100%', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', background: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <option value="">All Regions</option>
          {PHILIPPINE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Budget range */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Budget Range</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="number" value={filters.minBudget} onChange={e => setF('minBudget', e.target.value)} placeholder="Min (PHP)"
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit' }} />
          <input type="number" value={filters.maxBudget} onChange={e => setF('maxBudget', e.target.value)} placeholder="Max (PHP)"
            style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>

      {hasFilters && (
        <>
          <div style={{ height: 1, background: COLORS.border }} />
          <button onClick={clearAll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <X size={13} /> Clear all filters
          </button>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function BrowseProjects() {
  const navigate    = useNavigate();
  const { profile } = useAuthStore();
  const { isMobile, isTablet } = useBreakpoint();

  const [allProjects,  setAllProjects]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [sort,         setSort]         = useState('newest');
  const [activeType,   setActiveType]   = useState('');
  const [filters,      setFilters]      = useState({ search: '', region: '', minBudget: '', maxBudget: '' });
  const [watchedIds,   setWatchedIds]   = useState(new Set());
  const [showMobFilters, setShowMobFilters] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const fetchProjects = useCallback(() => {
    getOpenProjects().then(data => { setAllProjects(data); setLoading(false); });
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useRealtimeQuery('projects', fetchProjects);

  useEffect(() => {
    if (profile?.id) {
      getWatchlist(profile.id).then(list => setWatchedIds(new Set(list.map(w => w.project_id))));
    }
  }, [profile?.id]);

  const handleToggleWatch = async (projectId, isWatched) => {
    if (isWatched) {
      await removeFromWatchlist(profile.id, projectId);
      setWatchedIds(prev => { const s = new Set(prev); s.delete(projectId); return s; });
    } else {
      await addToWatchlist(profile.id, projectId);
      setWatchedIds(prev => new Set([...prev, projectId]));
    }
  };

  const handleCompare = (project) => {
    setCompareList(prev => {
      if (prev.find(p => p.id === project.id)) return prev.filter(p => p.id !== project.id);
      if (prev.length >= 3) return prev;
      return [...prev, project];
    });
  };

  const suggestions = useMemo(() => getSuggestedProjects(allProjects, profile, 3), [allProjects, profile]);

  const filtered = useMemo(() => {
    let list = allProjects.filter(p => {
      if (activeType        && p.project_type !== activeType)                           return false;
      if (filters.region    && p.location_region !== filters.region)                   return false;
      if (filters.minBudget && Number(p.budget_max) < Number(filters.minBudget))       return false;
      if (filters.maxBudget && Number(p.budget_min) > Number(filters.maxBudget))       return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return sortProjects(list, sort);
  }, [allProjects, activeType, filters, sort]);

  const hasFilters = activeType || Object.values(filters).some(Boolean);
  const setF = (k, v) => setFilters(prev => ({ ...prev, [k]: v }));
  const clearAll = () => { setActiveType(''); setFilters({ search: '', region: '', minBudget: '', maxBudget: '' }); };

  const goView = id => navigate(`/contractor/projects/${id}`);
  const goBid  = id => navigate(`/contractor/projects/${id}/bid`);

  return (
    <DashboardLayout title="Browse Projects">

      {/* ── Search bar ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        background: '#fff', border: `1.5px solid ${COLORS.border}`,
        borderRadius: 100, padding: '10px 16px',
        boxShadow: '0 2px 12px rgba(26,10,0,0.06)',
        marginBottom: 28,
      }}>
        <Search size={17} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
        <input
          value={filters.search}
          onChange={e => setF('search', e.target.value)}
          placeholder="Search projects by title, scope, or location…"
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 14,
            color: COLORS.text, background: 'transparent',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />
        {filters.search && (
          <button onClick={() => setF('search', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, display: 'flex', alignItems: 'center' }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Mobile filter toggle ── */}
      {(isMobile || isTablet) && (
        <button
          onClick={() => setShowMobFilters(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: showMobFilters ? COLORS.primary : '#fff', color: showMobFilters ? '#fff' : COLORS.textMuted, border: `1.5px solid ${showMobFilters ? COLORS.primary : COLORS.border}`, borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s' }}
        >
          <SlidersHorizontal size={14} /> Filters
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />}
        </button>
      )}

      {/* Mobile filters panel */}
      {(isMobile || isTablet) && showMobFilters && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 16, marginBottom: 20 }}>
          <FilterSidebar
            activeType={activeType} setActiveType={setActiveType}
            filters={filters} setF={setF} clearAll={clearAll}
            hasFilters={hasFilters} allProjects={allProjects}
          />
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexDirection: isMobile || isTablet ? 'column' : 'row' }}>

        {/* Left sidebar — desktop only */}
        {!isMobile && !isTablet && (
          <FilterSidebar
            activeType={activeType}
            setActiveType={setActiveType}
            filters={filters}
            setF={setF}
            clearAll={clearAll}
            hasFilters={hasFilters}
            allProjects={allProjects}
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, width: '100%' }}>

          {/* AI Suggestions strip */}
          {!loading && suggestions.length > 0 && !hasFilters && (
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Sparkles size={18} color={COLORS.accent} />
                <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>Picked for You</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>Based on your profile and specializations</span>
                <span style={{ marginLeft: 'auto', background: `${COLORS.accent}22`, color: COLORS.accent, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${COLORS.accent}44` }}>
                  AI Match
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {suggestions.map(p => (
                  <ProjectCard key={p.id} project={p} onView={goView} onBid={goBid} matchScore={p.matchScore} featured
                    watched={watchedIds.has(p.id)} onToggleWatch={handleToggleWatch}
                    onCompare={handleCompare} inCompare={!!compareList.find(c => c.id === p.id)} />
                ))}
              </div>
              <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${COLORS.border}, transparent)`, margin: '32px 0 0' }} />
            </div>
          )}

          {/* Results header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>
                {hasFilters ? 'Search Results' : 'Open Projects'}
              </span>
              <span style={{ fontSize: 13, color: COLORS.textMuted }}>
                {loading ? '…' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`}
              </span>
              {activeType && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.primary, background: `${COLORS.primary}14`, padding: '3px 10px', borderRadius: 20 }}>
                  <TypeIcon value={activeType} size={11} color={COLORS.primary} />
                  {TYPE_META[activeType]?.short || activeType}
                  <button onClick={() => setActiveType('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: COLORS.primary }}>
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            {/* Sort dropdown */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <ArrowUpDown size={14} color={COLORS.textMuted} style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
              <select
                value={sort} onChange={e => setSort(e.target.value)}
                style={{
                  border: `1.5px solid ${COLORS.border}`, borderRadius: 100,
                  padding: '8px 36px 8px 30px', fontSize: 13, fontWeight: 600,
                  color: COLORS.text, background: '#fff', outline: 'none',
                  cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
                }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} color={COLORS.textMuted} style={{ position: 'absolute', right: 12, pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
                  <div style={{ height: 160, background: 'linear-gradient(90deg, #F5ECE0 25%, #FAF5EC 50%, #F5ECE0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ height: 16, background: COLORS.gray100, borderRadius: 8, width: '75%' }} />
                    <div style={{ height: 12, background: COLORS.gray100, borderRadius: 8, width: '45%' }} />
                    <div style={{ height: 52, background: COLORS.gray50, borderRadius: 12, marginTop: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, textAlign: 'center', padding: '64px 32px' }}>
              <Search size={44} color={COLORS.border} style={{ margin: '0 auto 16px', display: 'block' }} />
              <div style={{ fontWeight: 700, fontSize: 17, color: COLORS.text, marginBottom: 6 }}>No projects found</div>
              <p style={{ color: COLORS.textMuted, fontSize: 14, margin: '0 0 20px' }}>Try adjusting your filters or search term.</p>
              {hasFilters && <button onClick={clearAll} style={{ background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Clear Filters</button>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p} onView={goView} onBid={goBid}
                  watched={watchedIds.has(p.id)} onToggleWatch={handleToggleWatch}
                  onCompare={handleCompare} inCompare={!!compareList.find(c => c.id === p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 900, background: COLORS.sidebarBg, borderRadius: 100, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <BarChart2 size={16} color="#fff" />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{compareList.length} selected</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {compareList.map(p => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                {p.title.slice(0, 20)}{p.title.length > 20 ? '…' : ''}
                <button onClick={() => handleCompare(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', padding: 0, alignItems: 'center' }}><X size={10} /></button>
              </span>
            ))}
          </div>
          <button onClick={() => setShowCompare(true)} disabled={compareList.length < 2}
            style={{ background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 100, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: compareList.length < 2 ? 'not-allowed' : 'pointer', opacity: compareList.length < 2 ? 0.5 : 1 }}>
            Compare
          </button>
          <button onClick={() => setCompareList([])} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 100, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {showCompare && <CompareModal projects={compareList} onClose={() => setShowCompare(false)} />}

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
    </DashboardLayout>
  );
}
