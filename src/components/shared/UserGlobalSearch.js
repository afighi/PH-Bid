import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { useAuthStore } from '../../stores/authStore';
import { COLORS } from '../../theme';
import { Search, Building2, ClipboardList, CircleDollarSign, X } from 'lucide-react';

// ── Role-specific section config ─────────────────────────────────────
const SECTION_META = {
  // Client
  my_projects: {
    label: 'My Projects',
    icon: <Building2 size={13} />,
    color: COLORS.primary,
    path: '/client/projects',
  },
  bids_received: {
    label: 'Bids Received',
    icon: <ClipboardList size={13} />,
    color: COLORS.success,
    path: '/client/projects',
  },
  my_payments: {
    label: 'Payments',
    icon: <CircleDollarSign size={13} />,
    color: COLORS.warning,
    path: '/client/transactions',
  },

  // Contractor
  open_projects: {
    label: 'Browse Projects',
    icon: <Building2 size={13} />,
    color: COLORS.primary,
    path: '/contractor/browse',
  },
  my_bids: {
    label: 'My Bids',
    icon: <ClipboardList size={13} />,
    color: COLORS.success,
    path: '/contractor/my-bids',
  },
  my_earnings: {
    label: 'Earnings',
    icon: <CircleDollarSign size={13} />,
    color: COLORS.warning,
    path: '/contractor/transactions',
  },
};

function highlight(text, query) {
  if (!query || !text) return text || '';
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: `${COLORS.primary}30`, color: COLORS.primary, borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

async function searchClient(q, profileId) {
  const like = `%${q}%`;
  const results = {};

  const [projRes, bidsRes, txRes] = await Promise.all([
    // Client's own projects
    supabase
      .from('projects')
      .select('id, title, status, budget_min, budget_max, location_city, created_at')
      .eq('client_id', profileId)
      .ilike('title', like)
      .limit(5),

    // Bids received on client's projects — search by contractor name or project title
    supabase
      .from('bids')
      .select(`id, bid_amount, status, project:projects!project_id(id, title, client_id), contractor:profiles!contractor_id(full_name, company_name)`)
      .eq('is_latest_revision', true)
      .or(`contractor.company_name.ilike.${like},contractor.full_name.ilike.${like},project.title.ilike.${like}`)
      .limit(5),

    // Client's outgoing payments
    supabase
      .from('transactions')
      .select(`id, amount, status, transaction_type, milestone_name, project:projects!project_id(id, title, client_id)`)
      .eq('sender_id', profileId)
      .ilike('project.title', like)
      .limit(5),
  ]);

  if (projRes.data?.length) results.my_projects = projRes.data;

  // Filter bids to only those on this client's projects
  const myBids = (bidsRes.data || []).filter(b => b.project?.client_id === profileId);
  if (myBids.length) results.bids_received = myBids;

  const myTx = (txRes.data || []).filter(t => t.project?.client_id === profileId);
  if (myTx.length) results.my_payments = myTx;

  return results;
}

async function searchContractor(q, profileId) {
  const like = `%${q}%`;
  const results = {};

  const [projRes, bidsRes, txRes] = await Promise.all([
    // Open projects matching query
    supabase
      .from('projects')
      .select('id, title, status, budget_min, budget_max, location_city, location_region, project_type, bid_deadline')
      .eq('status', 'open')
      .gt('bid_deadline', new Date().toISOString())
      .or(`title.ilike.${like},location_city.ilike.${like},location_region.ilike.${like},project_type.ilike.${like}`)
      .limit(5),

    // Contractor's own bids
    supabase
      .from('bids')
      .select(`id, bid_amount, status, project:projects!project_id(id, title)`)
      .eq('contractor_id', profileId)
      .eq('is_latest_revision', true)
      .ilike('project.title', like)
      .limit(5),

    // Contractor's incoming payments
    supabase
      .from('transactions')
      .select(`id, amount, status, transaction_type, milestone_name, project:projects!project_id(id, title)`)
      .eq('receiver_id', profileId)
      .ilike('project.title', like)
      .limit(5),
  ]);

  if (projRes.data?.length)  results.open_projects = projRes.data;

  const myBids = (bidsRes.data || []).filter(b => b.project?.title?.toLowerCase().includes(q.toLowerCase()));
  if (myBids.length) results.my_bids = myBids;

  const myTx = (txRes.data || []).filter(t => t.project?.title?.toLowerCase().includes(q.toLowerCase()));
  if (myTx.length) results.my_earnings = myTx;

  return results;
}

export default function UserGlobalSearch() {
  const { profile }   = useAuthStore();
  const navigate      = useNavigate();
  const [query,       setQuery]   = useState('');
  const [results,     setResults] = useState(null);
  const [open,        setOpen]    = useState(false);
  const [focused,     setFocused] = useState(null);
  const [loading,     setLoading] = useState(false);

  const containerRef  = useRef(null);
  const inputRef      = useRef(null);
  const timerRef      = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!profile?.id || query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = profile.role === 'client'
        ? await searchClient(query.trim(), profile.id)
        : await searchContractor(query.trim(), profile.id);
      setResults(res);
      setOpen(true);
      setLoading(false);
      setFocused(null);
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query, profile?.id, profile?.role]);

  // Click-outside closes
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clear = () => { setQuery(''); setResults(null); setOpen(false); inputRef.current?.focus(); };

  const goTo = useCallback((path) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
  }, [navigate]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open || !results) return;
    const sections = Object.keys(results);
    const flat = sections.flatMap(sec => results[sec].map((_, i) => ({ sec, i })));
    if (!flat.length) return;

    if (e.key === 'Escape')  { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(prev => {
        if (!prev) return flat[0];
        const cur = flat.findIndex(f => f.sec === prev.sec && f.i === prev.i);
        return flat[(cur + 1) % flat.length];
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(prev => {
        if (!prev) return flat[flat.length - 1];
        const cur = flat.findIndex(f => f.sec === prev.sec && f.i === prev.i);
        return flat[(cur - 1 + flat.length) % flat.length];
      });
    }
    if (e.key === 'Enter' && focused) goTo(SECTION_META[focused.sec].path);
  };

  const totalCount = results ? Object.values(results).reduce((n, a) => n + a.length, 0) : 0;

  const placeholder = profile?.role === 'client'
    ? 'Search projects, bids, payments…'
    : 'Search projects, bids, earnings…';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.gray50,
        border: `1.5px solid ${open ? COLORS.primary : COLORS.border}`,
        borderRadius: 10, padding: '0 12px',
        width: 248, height: 38,
        transition: 'border-color 0.15s',
      }}>
        {loading
          ? <span style={{ color: COLORS.textMuted, fontSize: 13, flexShrink: 0 }}>…</span>
          : <Search size={14} color={open ? COLORS.primary : COLORS.textMuted} style={{ flexShrink: 0 }} />
        }
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: COLORS.text }}
        />
        {query && (
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: COLORS.textMuted }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 440, overflowY: 'auto',
          backgroundColor: '#fff',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 200,
        }}>
          {totalCount === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: COLORS.textMuted, fontSize: 13 }}>
              No results for "<strong>{query}</strong>"
            </div>
          ) : (
            Object.entries(results).map(([section, items]) => {
              const meta = SECTION_META[section];
              if (!meta) return null;
              return (
                <div key={section}>
                  {/* Section header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 14px 6px',
                    fontSize: 11, fontWeight: 700, color: meta.color,
                    textTransform: 'uppercase', letterSpacing: 0.6,
                    borderTop: `1px solid ${COLORS.border}`,
                  }}>
                    {meta.icon} {meta.label}
                    <span style={{ marginLeft: 'auto', fontWeight: 500, color: COLORS.textMuted, textTransform: 'none', fontSize: 11 }}>
                      {items.length} result{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items */}
                  {items.map((item, i) => {
                    const isFocused = focused?.sec === section && focused?.i === i;
                    return (
                      <button
                        key={item.id}
                        onClick={() => goTo(meta.path)}
                        onMouseEnter={() => setFocused({ sec: section, i })}
                        style={{
                          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                          padding: '9px 14px',
                          backgroundColor: isFocused ? `${COLORS.primary}10` : 'transparent',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          transition: 'background-color 0.1s',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          backgroundColor: `${meta.color}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: meta.color, marginTop: 1,
                        }}>
                          {meta.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          {/* my_projects */}
                          {section === 'my_projects' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status?.replace(/_/g, ' ')}</span>
                                {item.location_city && ` · ${item.location_city}`}
                                {item.budget_min != null && ` · ₱${Number(item.budget_min).toLocaleString()}–₱${Number(item.budget_max).toLocaleString()}`}
                              </div>
                            </>
                          )}
                          {/* bids_received */}
                          {section === 'bids_received' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.contractor?.company_name || item.contractor?.full_name, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                {highlight(item.project?.title, query)}
                                {' · '}₱{Number(item.bid_amount).toLocaleString()}
                                {' · '}
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>
                              </div>
                            </>
                          )}
                          {/* my_payments */}
                          {section === 'my_payments' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.project?.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                ₱{Number(item.amount).toLocaleString()}
                                {item.milestone_name && ` · ${item.milestone_name}`}
                                {' · '}
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>
                              </div>
                            </>
                          )}
                          {/* open_projects */}
                          {section === 'open_projects' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                {highlight(item.project_type, query)}
                                {item.location_city && ` · ${highlight(item.location_city, query)}`}
                                {item.budget_min != null && ` · ₱${Number(item.budget_min).toLocaleString()}–₱${Number(item.budget_max).toLocaleString()}`}
                              </div>
                            </>
                          )}
                          {/* my_bids */}
                          {section === 'my_bids' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.project?.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                ₱{Number(item.bid_amount).toLocaleString()}
                                {' · '}
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>
                              </div>
                            </>
                          )}
                          {/* my_earnings */}
                          {section === 'my_earnings' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.project?.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                ₱{Number(item.amount).toLocaleString()}
                                {item.milestone_name && ` · ${item.milestone_name}`}
                                {' · '}
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Go to tab link */}
                  <button
                    onClick={() => goTo(meta.path)}
                    style={{
                      width: '100%', textAlign: 'center', border: 'none', background: 'none',
                      cursor: 'pointer', padding: '6px 14px 10px',
                      fontSize: 11, color: meta.color, fontWeight: 600,
                    }}
                  >
                    Go to {meta.label} →
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
