import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { COLORS } from '../../theme';
import { Search, User, Building2, CircleDollarSign, X } from 'lucide-react';

const SECTION_META = {
  users:        { label: 'Users',        icon: <User size={13} />,              color: COLORS.primary,  path: '/admin/users' },
  projects:     { label: 'Projects',     icon: <Building2 size={13} />,         color: COLORS.success,  path: '/admin/projects' },
  transactions: { label: 'Transactions', icon: <CircleDollarSign size={13} />,  color: COLORS.warning,  path: '/admin/transactions' },
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

async function runSearch(q) {
  const s = q.trim();
  const like = `%${s}%`;

  const [usersRes, projectsRes, txRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, company_name, email, role, status')
      .or(`full_name.ilike.${like},company_name.ilike.${like},email.ilike.${like}`)
      .limit(5),
    supabase
      .from('projects')
      .select('id, title, status, budget_min, budget_max')
      .ilike('title', like)
      .limit(5),
    supabase
      .from('transactions')
      .select('id, amount, status, project:projects(title)')
      .limit(5),
  ]);

  const results = {};

  if (usersRes.data?.length)    results.users        = usersRes.data;
  if (projectsRes.data?.length) results.projects     = projectsRes.data;

  // Filter transactions client-side (project title match)
  const matchingTx = (txRes.data || []).filter(tx =>
    tx.project?.title?.toLowerCase().includes(s.toLowerCase())
  );
  if (matchingTx.length) results.transactions = matchingTx;

  return results;
}

export default function AdminGlobalSearch() {
  const navigate  = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(null); // { section, index }
  const [loading, setLoading] = useState(false);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const timerRef     = useRef(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = await runSearch(query);
      setResults(res);
      setOpen(true);
      setLoading(false);
      setFocused(null);
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Click-outside closes dropdown
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
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

    if (e.key === 'Escape') { setOpen(false); return; }

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
    if (e.key === 'Enter' && focused) {
      goTo(SECTION_META[focused.sec].path);
    }
  };

  const totalCount = results ? Object.values(results).reduce((n, arr) => n + arr.length, 0) : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.gray50,
        border: `1.5px solid ${open ? COLORS.primary : COLORS.border}`,
        borderRadius: 10, padding: '0 12px',
        width: 260, height: 38,
        transition: 'border-color 0.15s, width 0.2s',
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
          placeholder="Search users, projects, transactions…"
          style={{
            flex: 1, border: 'none', background: 'none', outline: 'none',
            fontSize: 13, color: COLORS.text,
          }}
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
                        style={{
                          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                          padding: '9px 14px',
                          backgroundColor: isFocused ? `${COLORS.primary}10` : 'transparent',
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          transition: 'background-color 0.1s',
                        }}
                        onMouseEnter={() => setFocused({ sec: section, i })}
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
                          {section === 'users' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.company_name || item.full_name, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                {highlight(item.email, query)}
                                {' · '}
                                <span style={{ textTransform: 'capitalize' }}>{item.role}</span>
                                {' · '}
                                <span style={{
                                  color: item.status === 'active' ? COLORS.success : item.status === 'suspended' ? COLORS.danger : COLORS.warning,
                                  fontWeight: 600,
                                }}>{item.status?.replace(/_/g, ' ')}</span>
                              </div>
                            </>
                          )}
                          {section === 'projects' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                Status: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status?.replace(/_/g, ' ')}</span>
                                {item.budget_min != null && ` · ₱${Number(item.budget_min).toLocaleString()}–₱${Number(item.budget_max).toLocaleString()}`}
                              </div>
                            </>
                          )}
                          {section === 'transactions' && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3 }}>
                                {highlight(item.project?.title, query)}
                              </div>
                              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
                                ₱{Number(item.amount || 0).toLocaleString()}
                                {' · '}
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.status?.replace(/_/g, ' ')}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* "See all" link */}
                  <button
                    onClick={() => goTo(meta.path)}
                    style={{
                      width: '100%', textAlign: 'center', border: 'none', background: 'none',
                      cursor: 'pointer', padding: '6px 14px 10px',
                      fontSize: 11, color: meta.color, fontWeight: 600,
                    }}
                  >
                    Go to {meta.label} tab →
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
