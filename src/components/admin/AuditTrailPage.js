import { useState, useEffect, useMemo, Fragment } from 'react';
import { getAuditLogs } from '../../services/auditService';
import { COLORS, S } from '../../theme';
import { formatDateTime, formatRelative } from '../../utils/formatters';
import {
  ScrollText, Download, RefreshCw, Search, X,
  ChevronDown, ChevronUp, ShieldAlert, User,
  Building2, ClipboardList, CircleDollarSign, Lock,
} from 'lucide-react';

// ─── Action metadata (label + badge colour) ───────────────────────
const ACTIONS = {
  USER_SIGNED_UP:         { label: 'User Signed Up',          category: 'auth',    bg: '#F5E6D3', text: '#5A2D00' },
  USER_LOGGED_IN:         { label: 'User Logged In',          category: 'auth',    bg: '#F5E6D3', text: '#5A2D00' },
  USER_LOGGED_OUT:        { label: 'User Logged Out',         category: 'auth',    bg: '#F1F5F9', text: '#475569' },
  EMAIL_VERIFIED:         { label: 'Email Verified',          category: 'auth',    bg: '#DCFCE7', text: '#15803D' },
  PASSWORD_RESET_SENT:    { label: 'Password Reset Sent',     category: 'auth',    bg: '#FEF9C3', text: '#854D0E' },
  CONTRACTOR_APPROVED:    { label: 'Contractor Approved',     category: 'admin',   bg: '#DCFCE7', text: '#15803D' },
  USER_SUSPENDED:         { label: 'User Suspended',          category: 'admin',   bg: '#FEE2E2', text: '#991B1B' },
  USER_REACTIVATED:       { label: 'User Reactivated',        category: 'admin',   bg: '#DCFCE7', text: '#15803D' },
  PROJECT_CREATED:        { label: 'Project Created',         category: 'project', bg: '#EDE9FE', text: '#5B21B6' },
  PROJECT_STATUS_CHANGED: { label: 'Project Status Changed',  category: 'project', bg: '#EDE9FE', text: '#5B21B6' },
  DOCUMENT_UPLOADED:      { label: 'Document Uploaded',       category: 'project', bg: '#EDE9FE', text: '#5B21B6' },
  BID_SUBMITTED:          { label: 'Bid Submitted',           category: 'bid',     bg: '#FEF3C7', text: '#92400E' },
  BID_REVISED:            { label: 'Bid Revised',             category: 'bid',     bg: '#FEF3C7', text: '#92400E' },
  BID_AWARDED:            { label: 'Bid Awarded',             category: 'bid',     bg: '#DCFCE7', text: '#15803D' },
  BID_WITHDRAWN:          { label: 'Bid Withdrawn',           category: 'bid',     bg: '#FEE2E2', text: '#991B1B' },
  PAYMENT_INITIATED:      { label: 'Payment Initiated',       category: 'payment', bg: '#F0FDF4', text: '#166534' },
  PAYMENT_CONFIRMED:      { label: 'Payment Confirmed',       category: 'payment', bg: '#DCFCE7', text: '#15803D' },
  PAYMENT_RELEASED:       { label: 'Payment Released',        category: 'payment', bg: '#DCFCE7', text: '#15803D' },
};

const ROLE_STYLES = {
  admin:      { bg: '#FEE2E2', text: '#991B1B' },
  client:     { bg: COLORS.primaryLight, text: COLORS.darkBlue },
  contractor: { bg: '#FEF3C7', text: '#92400E' },
  system:     { bg: COLORS.gray100, text: COLORS.textMuted },
};

const RESOURCE_ICONS = {
  auth:        <Lock size={13} />,
  user:        <User size={13} />,
  project:     <Building2 size={13} />,
  bid:         <ClipboardList size={13} />,
  transaction: <CircleDollarSign size={13} />,
};

// ─── Small components ─────────────────────────────────────────────
function ActionBadge({ action }) {
  const meta = ACTIONS[action] || { label: action, bg: COLORS.gray100, text: COLORS.textMuted };
  return (
    <span style={{
      backgroundColor: meta.bg, color: meta.text,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
      display: 'inline-block', whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.system;
  return (
    <span style={{
      backgroundColor: style.bg, color: style.text,
      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700,
      display: 'inline-block', textTransform: 'capitalize', marginTop: 3,
    }}>
      {role || 'system'}
    </span>
  );
}

function ResourceCell({ type, name }) {
  if (!type && !name) return <span style={{ color: COLORS.textLight }}>—</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
      <span style={{ color: COLORS.textMuted, marginTop: 1, flexShrink: 0 }}>
        {RESOURCE_ICONS[type] || null}
      </span>
      <div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' }}>{type || '—'}</div>
        {name && <div style={{ fontSize: 12, color: COLORS.text, fontWeight: 500, marginTop: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>}
      </div>
    </div>
  );
}

function DetailsSummary({ action, details }) {
  if (!details || Object.keys(details).length === 0) return null;
  const d = details;
  const fmt = (n) => n != null ? `₱${Number(n).toLocaleString('en-PH')}` : '';
  const cap = (s) => s ? s.replace(/_/g, ' ') : '';

  switch (action) {
    case 'USER_SIGNED_UP':
      return <>Role: <strong>{cap(d.role)}</strong> · {d.email}</>;
    case 'USER_LOGGED_IN':
      return <>{d.email}</>;
    case 'EMAIL_VERIFIED':
      return <>{d.email}</>;
    case 'PASSWORD_RESET_SENT':
      return <>{d.email}</>;
    case 'CONTRACTOR_APPROVED':
      return <>{d.target_name} ({d.target_email})</>;
    case 'USER_SUSPENDED':
    case 'USER_REACTIVATED':
      return <>{d.target_name} · <span style={{ textTransform: 'capitalize' }}>{cap(d.target_role)}</span></>;
    case 'PROJECT_CREATED':
      return <>{cap(d.project_type)} · {fmt(d.budget_min)} – {fmt(d.budget_max)}</>;
    case 'PROJECT_STATUS_CHANGED':
      return <>{d.triggered_by === 'payment' ? 'Auto: ' : ''}<strong>{cap(d.old_status)}</strong> → <strong>{cap(d.new_status)}</strong></>;
    case 'DOCUMENT_UPLOADED':
      return <>{d.file_name}</>;
    case 'BID_SUBMITTED':
    case 'BID_REVISED':
      return <>{fmt(d.bid_amount)} · Revision #{d.revision_number}</>;
    case 'BID_AWARDED':
      return <>{d.contractor_name} · {fmt(d.bid_amount)}</>;
    case 'BID_WITHDRAWN':
      return <>{d.project_title}</>;
    case 'PAYMENT_INITIATED':
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RELEASED':
      return <>{fmt(d.amount)} · {cap(d.transaction_type)} via {cap(d.payment_method)}{d.milestone_name ? ` (${d.milestone_name})` : ''}</>;
    default:
      return null;
  }
}

const PAGE_SIZE = 100;

export default function AuditTrailPage() {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [error,       setError]       = useState(null);

  // Server-side filters (re-fetch on change)
  const [filterRole,         setFilterRole]         = useState('');
  const [filterAction,       setFilterAction]       = useState('');
  const [filterResourceType, setFilterResourceType] = useState('');
  const [filterDateFrom,     setFilterDateFrom]     = useState('');
  const [filterDateTo,       setFilterDateTo]       = useState('');

  // Client-side search (instant, no re-fetch)
  const [search, setSearch] = useState('');


  const loadLogs = async (reset = true) => {
    reset ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const data = await getAuditLogs({
        actorRole:    filterRole         || undefined,
        action:       filterAction       || undefined,
        resourceType: filterResourceType || undefined,
        dateFrom:     filterDateFrom     || undefined,
        dateTo:       filterDateTo       || undefined,
        limit:        PAGE_SIZE,
        offset:       reset ? 0 : logs.length,
        search:       search || undefined,
      });
      setLogs(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      if (reset) setExpandedId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Re-fetch when server-side filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadLogs(true); }, [filterRole, filterAction, filterResourceType, filterDateFrom, filterDateTo]);

  // Client-side text search on loaded data
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(l =>
      l.actor_name?.toLowerCase().includes(s) ||
      l.resource_name?.toLowerCase().includes(s) ||
      (ACTIONS[l.action]?.label || l.action)?.toLowerCase().includes(s) ||
      l.actor_role?.toLowerCase().includes(s)
    );
  }, [logs, search]);

  const hasActiveFilters = filterRole || filterAction || filterResourceType || filterDateFrom || filterDateTo || search;

  const clearFilters = () => {
    setFilterRole('');
    setFilterAction('');
    setFilterResourceType('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Resource Type', 'Resource', 'Details'];
    const rows = filtered.map(l => [
      formatDateTime(l.created_at),
      l.actor_name || '',
      l.actor_role || '',
      ACTIONS[l.action]?.label || l.action,
      l.resource_type || '',
      l.resource_name || '',
      JSON.stringify(l.details || {}),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={S.rowBetween}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${COLORS.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ScrollText size={22} color={COLORS.primary} />
          </div>
          <div>
            <h2 style={{ ...S.h2, marginBottom: 2 }}>Audit Trail</h2>
            <p style={{ ...S.body, margin: 0 }}>Complete record of all platform activity across all users</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => loadLogs(true)} disabled={loading}
            style={{ ...S.btnSecondary, padding: '9px 16px', fontSize: 13, gap: 6 }}>
            <RefreshCw size={14} style={{ ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
            Refresh
          </button>
          <button onClick={exportCSV} disabled={filtered.length === 0}
            style={{ ...S.btnPrimary, padding: '9px 16px', fontSize: 13, gap: 6, opacity: filtered.length === 0 ? 0.5 : 1 }}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ ...S.card, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Role */}
          <div style={S.formGroup}>
            <label style={S.label}>Actor Role</label>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={S.input}>
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="client">Client</option>
              <option value="contractor">Contractor</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Action */}
          <div style={S.formGroup}>
            <label style={S.label}>Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)} style={S.input}>
              <option value="">All Actions</option>
              <optgroup label="── Authentication">
                <option value="USER_SIGNED_UP">User Signed Up</option>
                <option value="USER_LOGGED_IN">User Logged In</option>
                <option value="USER_LOGGED_OUT">User Logged Out</option>
                <option value="EMAIL_VERIFIED">Email Verified</option>
                <option value="PASSWORD_RESET_SENT">Password Reset Sent</option>
              </optgroup>
              <optgroup label="── Admin Actions">
                <option value="CONTRACTOR_APPROVED">Contractor Approved</option>
                <option value="USER_SUSPENDED">User Suspended</option>
                <option value="USER_REACTIVATED">User Reactivated</option>
              </optgroup>
              <optgroup label="── Projects">
                <option value="PROJECT_CREATED">Project Created</option>
                <option value="PROJECT_STATUS_CHANGED">Project Status Changed</option>
                <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
              </optgroup>
              <optgroup label="── Bids">
                <option value="BID_SUBMITTED">Bid Submitted</option>
                <option value="BID_REVISED">Bid Revised</option>
                <option value="BID_AWARDED">Bid Awarded</option>
                <option value="BID_WITHDRAWN">Bid Withdrawn</option>
              </optgroup>
              <optgroup label="── Payments">
                <option value="PAYMENT_INITIATED">Payment Initiated</option>
                <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
                <option value="PAYMENT_RELEASED">Payment Released</option>
              </optgroup>
            </select>
          </div>

          {/* Resource type */}
          <div style={S.formGroup}>
            <label style={S.label}>Resource Type</label>
            <select value={filterResourceType} onChange={e => setFilterResourceType(e.target.value)} style={S.input}>
              <option value="">All Types</option>
              <option value="auth">Authentication</option>
              <option value="user">User</option>
              <option value="project">Project</option>
              <option value="bid">Bid</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'flex-end' }}>

          {/* Date range */}
          <div style={S.formGroup}>
            <label style={S.label}>Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={S.input} />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={S.input} />
          </div>

          {/* Clear */}
          <div style={{ marginBottom: 16 }}>
            <button onClick={clearFilters} disabled={!hasActiveFilters}
              style={{ ...S.btnSecondary, padding: '10px 18px', opacity: hasActiveFilters ? 1 : 0.35, gap: 6 }}>
              <X size={14} /> Clear Filters
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by actor name, resource name, or action…"
            style={{ ...S.input, paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>

        {/* Table header bar */}
        <div style={{ padding: '14px 24px', borderBottom: `1px solid ${COLORS.border}`, ...S.rowBetween }}>
          <span style={{ fontSize: 14, color: COLORS.textMuted }}>
            {loading
              ? 'Loading…'
              : filtered.length !== logs.length
                ? <><strong style={{ color: COLORS.text }}>{filtered.length}</strong> matching of <strong style={{ color: COLORS.text }}>{logs.length}</strong> loaded entries</>
                : <><strong style={{ color: COLORS.text }}>{logs.length}</strong> {logs.length === PAGE_SIZE ? '(showing latest 100 — scroll down to load more)' : 'entries'}</>
            }
          </span>
          {hasActiveFilters && (
            <span style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600 }}>
              Filters active
            </span>
          )}
        </div>

        {error && (
          <div style={{ ...S.alertError, margin: 20 }}>
            <ShieldAlert size={14} style={{ marginRight: 6 }} />
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: COLORS.textMuted }}>
            <ScrollText size={36} color={COLORS.textLight} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Loading audit logs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <ScrollText size={40} color={COLORS.textLight} style={{ marginBottom: 12 }} />
            <p style={{ color: COLORS.textMuted, margin: '0 0 6px' }}>
              {logs.length === 0 ? 'No audit logs yet.' : 'No entries match your filters.'}
            </p>
            {logs.length === 0 && (
              <p style={{ color: COLORS.textLight, fontSize: 12, margin: 0 }}>
                Actions will appear here once users start using the platform.
              </p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  {['Timestamp', 'Actor', 'Action', 'Resource', 'Details', 'Expand'].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left', padding: '10px 16px',
                      fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase',
                      whiteSpace: 'nowrap', backgroundColor: COLORS.gray50,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        style={{
                          borderBottom: isExpanded ? 'none' : `1px solid ${COLORS.border}`,
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? `${COLORS.primary}08` : undefined,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = COLORS.gray50; }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.backgroundColor = ''; }}
                      >
                        {/* Timestamp */}
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{formatDateTime(log.created_at)}</div>
                          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{formatRelative(log.created_at)}</div>
                        </td>

                        {/* Actor */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', minWidth: 130 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{log.actor_name || '—'}</div>
                          <RoleBadge role={log.actor_role} />
                        </td>

                        {/* Action */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <ActionBadge action={log.action} />
                        </td>

                        {/* Resource */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                          <ResourceCell type={log.resource_type} name={log.resource_name} />
                        </td>

                        {/* Details summary */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', maxWidth: 260 }}>
                          <div style={{ fontSize: 12, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <DetailsSummary action={log.action} details={log.details} />
                          </div>
                        </td>

                        {/* Expand toggle */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 11, color: COLORS.primary, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {isExpanded ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand</>}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: `1px solid ${COLORS.border}`, backgroundColor: `${COLORS.primary}05` }}>
                          <td colSpan={6} style={{ padding: '0 16px 20px 16px' }}>
                            <div style={{ paddingTop: 12 }}>
                              {/* Key facts grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
                                {[
                                  { label: 'Log ID',       value: log.id },
                                  { label: 'Actor ID',     value: log.actor_id },
                                  { label: 'Resource ID',  value: log.resource_id },
                                  { label: 'Resource Type',value: log.resource_type },
                                ].filter(i => i.value).map(({ label, value }) => (
                                  <div key={label} style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                    <div style={{ fontSize: 11, color: COLORS.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Full details JSON */}
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>Event Details</div>
                                  <div style={{ backgroundColor: COLORS.gray100, borderRadius: 10, padding: '14px 16px', border: `1px solid ${COLORS.border}` }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <tbody>
                                        {Object.entries(log.details).map(([k, v]) => (
                                          <tr key={k}>
                                            <td style={{ padding: '4px 12px 4px 0', verticalAlign: 'top', width: '30%' }}>
                                              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, fontFamily: 'monospace' }}>{k}</span>
                                            </td>
                                            <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                                              <span style={{ fontSize: 12, color: COLORS.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                {v === null ? <em style={{ color: COLORS.textLight }}>null</em>
                                                 : typeof v === 'object' ? JSON.stringify(v)
                                                 : String(v)}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More */}
        {!loading && hasMore && !search && (
          <div style={{ padding: 20, textAlign: 'center', borderTop: `1px solid ${COLORS.border}` }}>
            <button onClick={() => loadLogs(false)} disabled={loadingMore}
              style={{ ...S.btnSecondary, minWidth: 160, justifyContent: 'center' }}>
              {loadingMore ? 'Loading…' : 'Load next 100 entries'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
