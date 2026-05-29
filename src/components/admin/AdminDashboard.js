import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminQueue } from '../../hooks/useRealtime';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';
import DashboardLayout from '../layout/DashboardLayout';
import { supabase } from '../../config/supabase';
import StatusBadge from '../shared/StatusBadge';
import AuditTrailPage from './AuditTrailPage';
import BackupRestore from './BackupRestore';
import {
  getPlatformStats, getAllUsers, getAllProjects, getAllTransactions,
  approveContractor, suspendUser, reactivateUser,
} from '../../services/adminService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import {
  Users, Building2, CircleDollarSign, AlertTriangle, CheckCircle2,
  Mail, Phone, Landmark, Check, X, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, Eye, Download,
} from 'lucide-react';
import { ArchieBanner } from '../shared/ArchiePanel';

/* ── Stat card ────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, alert, trend, sublabel }) {
  const c = alert && value > 0 ? COLORS.danger : color;
  return (
    <div style={{
      backgroundColor: '#FFF',
      borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.06)',
      padding: '20px 24px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background accent */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', backgroundColor: `${c}08`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        {trend && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend > 0 ? '#059669' : '#DC2626', backgroundColor: trend > 0 ? '#F0FDF4' : '#FFF0F0', padding: '3px 8px', borderRadius: 20, border: `1px solid ${trend > 0 ? '#A7F3D0' : '#FCA5A5'}` }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div style={{ fontSize: 28, fontWeight: 900, color: c, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

/* ── Details modal ────────────────────────────────────────────── */
function DetailsModal({ item, type, onClose }) {
  if (!item) return null;

  const FIELD = (label, value) => (
    <div key={label} style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );

  let title = '';
  let fields = [];

  if (type === 'user') {
    title = item.company_name || item.full_name || 'User Details';
    fields = [
      ['Full Name', item.full_name],
      ['Company', item.company_name],
      ['Email', item.email],
      ['Phone', item.phone],
      ['Role', item.role],
      ['Status', item.status?.replace(/_/g, ' ')],
      ['Joined', formatDate(item.created_at)],
      ['City', item.company_city],
      ['Region', item.company_region],
      ['Address', item.company_address],
      ['TIN Number', item.tin_number],
      ...(item.role === 'contractor' ? [
        ['PCAB License', item.license_number],
        ['PCAB Classification', item.pcab_classification],
        ['Years Experience', item.years_experience != null ? `${item.years_experience} years` : null],
        ['Specializations', Array.isArray(item.specializations) && item.specializations.length ? item.specializations.join(', ') : null],
      ] : []),
    ];
  } else if (type === 'project') {
    title = item.title || 'Project Details';
    fields = [
      ['Title', item.title],
      ['Type', item.project_type?.replace(/_/g, ' ')],
      ['Status', item.status?.replace(/_/g, ' ')],
      ['Client', item.client?.company_name || item.client?.full_name],
      ['Location', [item.location_city, item.location_region].filter(Boolean).join(', ')],
      ['Budget Range', `${formatCurrency(item.budget_min)} – ${formatCurrency(item.budget_max)}`],
      ['Bid Deadline', item.bid_deadline ? formatDate(item.bid_deadline) : null],
      ['Posted', formatDate(item.created_at)],
      ['Description', item.description],
      ['Scope of Work', item.scope_of_work],
    ];
  } else if (type === 'transaction') {
    title = `Transaction #${item.id?.slice(0, 8).toUpperCase()}`;
    fields = [
      ['From', item.sender?.company_name || item.sender?.full_name],
      ['From Role', item.sender?.role],
      ['To', item.receiver?.company_name || item.receiver?.full_name],
      ['To Role', item.receiver?.role],
      ['Type', item.transaction_type?.replace(/_/g, ' ')],
      ['Amount', formatCurrency(item.amount)],
      ['Status', item.status?.replace(/_/g, ' ')],
      ['Date', formatDate(item.created_at)],
      ['Reference', item.reference_number],
      ['Project', item.project?.title],
      ['Notes', item.notes],
    ];
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(15,23,42,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: '#FFF',
        borderRadius: 20,
        width: '100%',
        maxWidth: 520,
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {type === 'user' ? 'User Profile' : type === 'project' ? 'Project Details' : 'Transaction Record'}
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8,
              background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: COLORS.textMuted, flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px', overflowY: 'auto' }}>
          {fields.map(([label, value]) =>
            value != null && value !== '' ? FIELD(label, value) : null
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...S.btnSecondary, padding: '9px 20px', fontSize: 13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Report generator ─────────────────────────────────────────── */
function generateReport(type, data, stats) {
  const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const reportDate = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
  const title = type === 'users' ? 'User Registry Report'
    : type === 'projects' ? 'Project Portfolio Report'
    : 'Transaction Ledger Report';

  let tableHeaders = '';
  let tableRows = '';
  let summaryCards = '';

  if (type === 'users') {
    const activeCount = data.filter(u => u.status === 'active').length;
    const pendingCount = data.filter(u => u.status === 'pending').length;
    const contractorCount = data.filter(u => u.role === 'contractor').length;
    const clientCount = data.filter(u => u.role === 'client').length;

    summaryCards = `
      <div class="summary-grid">
        <div class="summary-card"><div class="sum-value">${data.length}</div><div class="sum-label">Total Users</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#059669">${activeCount}</div><div class="sum-label">Active</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#D97706">${pendingCount}</div><div class="sum-label">Pending</div></div>
        <div class="summary-card"><div class="sum-value">${contractorCount}</div><div class="sum-label">Contractors</div></div>
        <div class="summary-card"><div class="sum-value">${clientCount}</div><div class="sum-label">Clients</div></div>
      </div>`;

    tableHeaders = `<th>No.</th><th>Full Name</th><th>Company</th><th>Email Address</th><th>Phone</th><th>Role</th><th>Status</th><th>Registration Date</th>`;
    tableRows = data.map((u, i) => {
      const statusColor = u.status === 'active' ? '#059669' : u.status === 'suspended' ? '#DC2626' : '#D97706';
      return `<tr>
        <td style="color:#94a3b8;font-weight:500">${i + 1}</td>
        <td style="font-weight:600">${u.full_name || '—'}</td>
        <td>${u.company_name || '—'}</td>
        <td style="color:#7B3F00">${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td><span class="badge badge-role" style="text-transform:capitalize">${u.role}</span></td>
        <td><span class="badge" style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;text-transform:capitalize">${(u.status || '').replace(/_/g, ' ')}</span></td>
        <td>${formatDate(u.created_at)}</td>
      </tr>`;
    }).join('');
  } else if (type === 'projects') {
    const openCount = data.filter(p => p.status === 'open').length;
    const awardedCount = data.filter(p => p.status === 'awarded').length;
    const completedCount = data.filter(p => p.status === 'completed').length;

    summaryCards = `
      <div class="summary-grid">
        <div class="summary-card"><div class="sum-value">${data.length}</div><div class="sum-label">Total Projects</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#7B3F00">${openCount}</div><div class="sum-label">Open for Bids</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#D97706">${awardedCount}</div><div class="sum-label">Awarded</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#059669">${completedCount}</div><div class="sum-label">Completed</div></div>
      </div>`;

    tableHeaders = `<th>No.</th><th>Project Title</th><th>Type</th><th>Client</th><th>Location</th><th>Budget Range (₱)</th><th>Bid Deadline</th><th>Status</th><th>Posted Date</th>`;
    tableRows = data.map((p, i) => {
      const statusColor = p.status === 'open' ? '#7B3F00' : p.status === 'completed' ? '#059669' : p.status === 'cancelled' ? '#DC2626' : '#D97706';
      return `<tr>
        <td style="color:#94a3b8;font-weight:500">${i + 1}</td>
        <td style="font-weight:600;max-width:200px">${p.title || '—'}</td>
        <td style="text-transform:capitalize;color:#64748b">${(p.project_type || '').replace(/_/g,' ')}</td>
        <td>${p.client?.company_name || p.client?.full_name || '—'}</td>
        <td>${[p.location_city, p.location_region].filter(Boolean).join(', ') || '—'}</td>
        <td style="font-weight:600;white-space:nowrap">${formatCurrency(p.budget_min)} – ${formatCurrency(p.budget_max)}</td>
        <td style="white-space:nowrap">${p.bid_deadline ? formatDate(p.bid_deadline) : '—'}</td>
        <td><span class="badge" style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;text-transform:capitalize">${(p.status || '').replace(/_/g,' ')}</span></td>
        <td>${formatDate(p.created_at)}</td>
      </tr>`;
    }).join('');
  } else {
    const completedTx = data.filter(t => t.status === 'completed').length;
    const totalAmt = data.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const completedAmt = data.filter(t => t.status === 'completed').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    summaryCards = `
      <div class="summary-grid">
        <div class="summary-card"><div class="sum-value">${data.length}</div><div class="sum-label">Total Transactions</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#059669">${completedTx}</div><div class="sum-label">Completed</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#7B3F00;font-size:18px">${formatCurrency(totalAmt)}</div><div class="sum-label">Total Volume</div></div>
        <div class="summary-card"><div class="sum-value" style="color:#059669;font-size:18px">${formatCurrency(completedAmt)}</div><div class="sum-label">Cleared Amount</div></div>
      </div>`;

    tableHeaders = `<th>No.</th><th>Transaction ID</th><th>From (Payer)</th><th>To (Payee)</th><th>Type</th><th>Amount (₱)</th><th>Status</th><th>Date</th>`;
    tableRows = data.map((t, i) => {
      const statusColor = t.status === 'completed' ? '#059669' : t.status === 'failed' ? '#DC2626' : '#D97706';
      return `<tr>
        <td style="color:#94a3b8;font-weight:500">${i + 1}</td>
        <td style="color:#64748b;font-size:11px;font-family:monospace">${(t.id || '').slice(0, 12).toUpperCase()}...</td>
        <td><span style="font-weight:600">${t.sender?.company_name || t.sender?.full_name || '—'}</span><br><span style="font-size:10px;color:#94a3b8;text-transform:capitalize">${t.sender?.role || ''}</span></td>
        <td><span style="font-weight:600">${t.receiver?.company_name || t.receiver?.full_name || '—'}</span><br><span style="font-size:10px;color:#94a3b8;text-transform:capitalize">${t.receiver?.role || ''}</span></td>
        <td style="text-transform:capitalize;color:#64748b">${(t.transaction_type || '').replace(/_/g,' ')}</td>
        <td style="font-weight:700;color:#0f172a;white-space:nowrap">${formatCurrency(t.amount)}</td>
        <td><span class="badge" style="background:${statusColor}15;color:${statusColor};border:1px solid ${statusColor}40;text-transform:capitalize">${(t.status || '').replace(/_/g,' ')}</span></td>
        <td style="white-space:nowrap">${formatDate(t.created_at)}</td>
      </tr>`;
    }).join('');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BuildBid PH — ${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    .page { background: #fff; max-width: 1100px; margin: 24px auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }

    /* Header */
    .report-header { background: #1A0A00; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
    .brand-mark { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .brand-icon { width: 44px; height: 44px; background: #7B3F00; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 20px; }
    .brand-name { font-size: 20px; font-weight: 900; color: #fff; letter-spacing: -0.03em; }
    .brand-name span { color: #60A5FA; }
    .brand-sub { font-size: 11px; color: #475569; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
    .report-title { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.03em; margin-bottom: 4px; }
    .report-subtitle { font-size: 13px; color: #64748b; }
    .report-meta { text-align: right; }
    .report-meta .meta-row { font-size: 12px; color: #64748b; line-height: 2; }
    .report-meta .meta-value { color: #94a3b8; font-weight: 500; }
    .confidential { display: inline-block; background: rgba(37,99,235,0.2); color: #60A5FA; border: 1px solid rgba(37,99,235,0.3); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 8px; }

    /* Summary */
    .summary-section { padding: 24px 40px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .summary-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
    .summary-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 20px; min-width: 120px; flex: 1; }
    .sum-value { font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -0.03em; margin-bottom: 4px; }
    .sum-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }

    /* Table */
    .table-section { padding: 24px 40px 40px; }
    .table-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #0f172a; }
    th { color: #94a3b8; text-align: left; padding: 11px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
    td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; color: #0f172a; vertical-align: middle; }
    tr:hover td { background: #f8fafc; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
    .badge-role { background: #F5E6D3; color: #7B3F00; border: 1px solid #E8D5C0; }
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; }

    /* Footer */
    .report-footer { padding: 20px 40px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
    .footer-brand { font-size: 12px; font-weight: 700; color: #64748b; }
    .footer-brand span { color: #7B3F00; }
    .footer-right { font-size: 11px; color: #94a3b8; text-align: right; }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; border-radius: 0; max-width: 100%; }
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="report-header">
      <div>
        <div class="brand-mark">
          <div class="brand-icon">B</div>
          <div>
            <div class="brand-name">Build<span>Bid</span> PH</div>
            <div class="brand-sub">Construction Bidding Platform</div>
          </div>
        </div>
        <div class="report-title">${title}</div>
        <div class="report-subtitle">Official Administrative Report — For Internal Use</div>
      </div>
      <div class="report-meta">
        <div class="meta-row">Generated: <span class="meta-value">${now}</span></div>
        <div class="meta-row">Report Date: <span class="meta-value">${reportDate}</span></div>
        <div class="meta-row">Total Records: <span class="meta-value">${data.length}</span></div>
        <div class="meta-row">Prepared by: <span class="meta-value">Admin Console</span></div>
        <div class="confidential">Confidential</div>
      </div>
    </div>

    <div class="summary-section">
      <div class="summary-title">Executive Summary</div>
      ${summaryCards}
    </div>

    <div class="table-section">
      <div class="table-title">Detailed Records</div>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows || '<tr><td colspan="9" class="empty-state">No records found matching the current filters.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="report-footer">
      <div class="footer-brand">Build<span>Bid</span> PH — Platform Report</div>
      <div class="footer-right">
        <div>This document is confidential and for internal use only.</div>
        <div>© ${new Date().getFullYear()} BuildBid PH. All rights reserved.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }
}

/* ── Tab helper ───────────────────────────────────────────────── */
function pathToTab(pathname) {
  if (pathname.startsWith('/admin/users'))        return 'users';
  if (pathname.startsWith('/admin/projects'))     return 'projects';
  if (pathname.startsWith('/admin/transactions')) return 'transactions';
  if (pathname.startsWith('/admin/audit'))        return 'audit';
  if (pathname.startsWith('/admin/backup'))       return 'backup';
  return 'overview';
}

/* ── Admin dashboard ──────────────────────────────────────────── */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = pathToTab(location.pathname);

  const [stats,        setStats]        = useState({});
  const [users,        setUsers]        = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState(null);
  const [archieOpen,   setArchieOpen]   = useState(false);

  /* Detail modal */
  const [detail, setDetail] = useState({ item: null, type: null });

  /* Project filters */
  const [projectSearch,      setProjectSearch]      = useState('');
  const [projectStatus,      setProjectStatus]      = useState('');
  const [projectType,        setProjectType]        = useState('');
  const [projectRegion,      setProjectRegion]      = useState('');
  const [projectBudgetMin,   setProjectBudgetMin]   = useState('');
  const [projectBudgetMax,   setProjectBudgetMax]   = useState('');
  const [projectDateFrom,    setProjectDateFrom]    = useState('');
  const [projectDateTo,      setProjectDateTo]      = useState('');
  const [projectDeadline,    setProjectDeadline]    = useState('');
  const [projectFiltersOpen, setProjectFiltersOpen] = useState(false);
  const [projectPage,        setProjectPage]        = useState(0);

  /* User filters */
  const [userSearch,       setUserSearch]       = useState('');
  const [userRoleFilter,   setUserRoleFilter]   = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  /* Real-time registrations from Firebase */
  const liveUsers = useAdminQueue();

  const mergedUsers = useMemo(() => {
    const liveIds = new Set(liveUsers.map(u => u.id));
    const supabaseOnly = users.filter(u => !liveIds.has(u.id));
    return [...liveUsers, ...supabaseOnly].sort((a, b) => {
      const aT = a.created_at ? (typeof a.created_at === 'number' ? a.created_at : new Date(a.created_at).getTime()) : 0;
      const bT = b.created_at ? (typeof b.created_at === 'number' ? b.created_at : new Date(b.created_at).getTime()) : 0;
      return bT - aT;
    });
  }, [liveUsers, users]);

  const uniqueProjectTypes   = useMemo(() => [...new Set(projects.map(p => p.project_type).filter(Boolean))].sort(), [projects]);
  const uniqueProjectRegions = useMemo(() => [...new Set(projects.map(p => p.location_region).filter(Boolean))].sort(), [projects]);

  const filteredProjects = useMemo(() => {
    let r = projects;
    if (projectSearch.trim()) {
      const s = projectSearch.toLowerCase();
      r = r.filter(p => p.title?.toLowerCase().includes(s) || p.client?.company_name?.toLowerCase().includes(s) || p.client?.full_name?.toLowerCase().includes(s) || p.location_city?.toLowerCase().includes(s));
    }
    if (projectStatus)    r = r.filter(p => p.status === projectStatus);
    if (projectType)      r = r.filter(p => p.project_type === projectType);
    if (projectRegion)    r = r.filter(p => p.location_region === projectRegion);
    if (projectBudgetMin) r = r.filter(p => p.budget_max >= Number(projectBudgetMin));
    if (projectBudgetMax) r = r.filter(p => p.budget_min <= Number(projectBudgetMax));
    if (projectDateFrom)  r = r.filter(p => new Date(p.created_at) >= new Date(projectDateFrom));
    if (projectDateTo)    r = r.filter(p => new Date(p.created_at) <= new Date(projectDateTo + 'T23:59:59'));
    if (projectDeadline === 'active')  r = r.filter(p => p.bid_deadline && new Date(p.bid_deadline) > new Date());
    if (projectDeadline === 'expired') r = r.filter(p => !p.bid_deadline || new Date(p.bid_deadline) <= new Date());
    return r;
  }, [projects, projectSearch, projectStatus, projectType, projectRegion, projectBudgetMin, projectBudgetMax, projectDateFrom, projectDateTo, projectDeadline]);

  const activeProjectFilters = [projectStatus, projectType, projectRegion, projectBudgetMin, projectBudgetMax, projectDateFrom, projectDateTo, projectDeadline].filter(Boolean).length;

  const PROJECT_PAGE_SIZE = 20;
  const projectTotalPages = Math.ceil(filteredProjects.length / PROJECT_PAGE_SIZE);
  const pagedProjects     = filteredProjects.slice(projectPage * PROJECT_PAGE_SIZE, (projectPage + 1) * PROJECT_PAGE_SIZE);

  const filteredUsers = useMemo(() => {
    let r = mergedUsers;
    if (userRoleFilter)   r = r.filter(u => u.role === userRoleFilter);
    if (userStatusFilter) r = r.filter(u => u.status === userStatusFilter);
    if (userSearch.trim()) {
      const s = userSearch.toLowerCase();
      r = r.filter(u => {
        const specs = Array.isArray(u.specializations) ? u.specializations.join(' ') : String(u.specializations || '');
        return (
          u.full_name?.toLowerCase().includes(s)          ||
          u.company_name?.toLowerCase().includes(s)       ||
          u.email?.toLowerCase().includes(s)              ||
          u.phone?.replace(/\s/g, '').includes(s.replace(/\s/g, '')) ||
          u.role?.toLowerCase().includes(s)               ||
          u.status?.replace(/_/g, ' ').toLowerCase().includes(s) ||
          u.license_number?.toLowerCase().includes(s)     ||
          u.pcab_classification?.toLowerCase().includes(s)||
          u.tin_number?.toLowerCase().includes(s)         ||
          u.company_city?.toLowerCase().includes(s)       ||
          u.company_region?.toLowerCase().includes(s)     ||
          u.company_address?.toLowerCase().includes(s)    ||
          specs.toLowerCase().includes(s)                 ||
          String(u.years_experience ?? '').includes(s)
        );
      });
    }
    return r;
  }, [mergedUsers, userSearch, userRoleFilter, userStatusFilter]);

  const activeUserFilters = [userRoleFilter, userStatusFilter].filter(Boolean).length;
  const clearUserFilters  = () => { setUserSearch(''); setUserRoleFilter(''); setUserStatusFilter(''); };
  const clearProjectFilters = () => {
    setProjectSearch(''); setProjectStatus(''); setProjectType(''); setProjectRegion('');
    setProjectBudgetMin(''); setProjectBudgetMax(''); setProjectDateFrom(''); setProjectDateTo(''); setProjectDeadline('');
  };

  const fetchUsers = useCallback(() => {
    Promise.all([getPlatformStats(), getAllUsers()]).then(([s, u]) => {
      setStats(s); setUsers(u); setLoading(false);
    });
  }, []);

  const fetchProjects = useCallback(() => {
    getAllProjects().then(setProjects);
  }, []);

  const fetchTransactions = useCallback(() => {
    getAllTransactions().then(setTransactions);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useRealtimeQuery('profiles', fetchUsers);

  useEffect(() => {
    if (tab === 'projects'     && projects.length === 0)     fetchProjects();
    if (tab === 'transactions' && transactions.length === 0) fetchTransactions();
  }, [tab, projects.length, transactions.length, fetchProjects, fetchTransactions]);

  useRealtimeQuery('projects',     fetchProjects,     null, []);
  useRealtimeQuery('transactions', fetchTransactions, null, []);

  useEffect(() => { setProjectPage(0); }, [projectSearch, projectStatus, projectType, projectRegion, projectBudgetMin, projectBudgetMax, projectDateFrom, projectDateTo, projectDeadline]);

  const handleApprove = async (userId) => {
    setProcessing(userId);
    try {
      await approveContractor(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      setStats(s => ({ ...s, pendingContractors: Math.max(0, (s.pendingContractors || 0) - 1) }));
    } finally { setProcessing(null); }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Suspend this user? They will be locked out immediately.')) return;
    setProcessing(userId);
    try {
      await suspendUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
    } finally { setProcessing(null); }
  };

  const handleReactivate = async (userId) => {
    setProcessing(userId);
    try {
      await reactivateUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
    } finally { setProcessing(null); }
  };

  const handleToggleVerify = async (userId, currentVerified) => {
    setProcessing(userId);
    try {
      const updates = { is_verified: !currentVerified, verified_at: !currentVerified ? new Date().toISOString() : null };
      await supabase.from('profiles').update(updates).eq('id', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    } finally { setProcessing(null); }
  };

  const pending     = mergedUsers.filter(u => u.status === 'pending');
  const contractors = mergedUsers.filter(u => u.role === 'contractor');
  const clients     = mergedUsers.filter(u => u.role === 'client');

  /* Shared table header style */
  const TH = { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#F8FAFC' };
  const CARD = { backgroundColor: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', padding: 24 };

  if (loading) {
    return (
      <DashboardLayout title="Admin Console">
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.2)', borderTopColor: COLORS.primary, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Console">

      {/* ── Detail modal ── */}
      <DetailsModal item={detail.item} type={detail.type} onClose={() => setDetail({ item: null, type: null })} />

      {/* ── Archie welcome banner ── */}
      <ArchieBanner
        role="admin"
        profile={null}
        stats={stats}
        onOpenChat={() => setArchieOpen(true)}
      />

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Users"      value={stats.totalUsers || 0}               icon={<Users size={22} color={COLORS.primary} />} color={COLORS.primary} />
        <StatCard label="Pending Approval" value={stats.pendingContractors || 0}        icon={<AlertTriangle size={22} color={COLORS.warning} />} color={COLORS.warning} alert />
        <StatCard label="Open Projects"    value={stats.openProjects || 0}              icon={<Building2 size={22} color={COLORS.success} />} color={COLORS.success} />
        <StatCard label="Platform Volume"  value={formatCurrency(stats.totalVolume || 0)} icon={<CircleDollarSign size={22} color={COLORS.success} />} color={COLORS.success} />
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 24 }}>
          <div style={CARD}>
            <div style={{ ...S.rowBetween, marginBottom: 20 }}>
              <h3 style={S.h3}>Platform Breakdown</h3>
              <span style={{ fontSize: 11, color: COLORS.textLight }}>All time statistics</span>
            </div>

            {/* Quick metrics strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Total Projects', value: stats.totalProjects || 0, note: 'All time' },
                { label: 'Total Bids', value: stats.totalBids || 0, note: 'Submitted bids' },
                { label: 'Active Clients', value: clients.filter(c => c.status === 'active').length, note: 'Verified accounts' },
              ].map(({ label, value, note }) => (
                <div key={label} style={{ backgroundColor: COLORS.gray50, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>{value}</div>
                  </div>
                  <div style={{ fontSize: 10, color: COLORS.textLight, fontWeight: 500, textAlign: 'right' }}>{note}</div>
                </div>
              ))}
            </div>

            {[
              { label: 'Total Projects',      value: stats.totalProjects || 0,     color: COLORS.primary,  icon: '🏗️' },
              { label: 'Total Bids Placed',   value: stats.totalBids || 0,         color: '#8B5CF6',       icon: '📋' },
              { label: 'Client Accounts',     value: clients.length,               color: COLORS.success,  icon: '👥' },
              { label: 'Contractor Accounts', value: contractors.length,           color: COLORS.warning,  icon: '🔨' },
              { label: 'Total Transactions',  value: stats.totalTransactions || 0, color: COLORS.text,     icon: '💰' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${COLORS.border}`, gap: 12 }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, backgroundColor: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted, flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFBF5' }}>
            <h3 style={{ ...S.h3, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={17} color={COLORS.warning} /> Needs Attention
            </h3>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: COLORS.textMuted }}>
                <CheckCircle2 size={32} color={COLORS.success} style={{ marginBottom: 8 }} />
                <p style={{ margin: 0 }}>All contractors approved!</p>
              </div>
            ) : (
              <>
                {pending.slice(0, 5).map(u => (
                  <div key={u.id} style={{ ...S.rowBetween, padding: '14px 0', borderBottom: `1px solid ${COLORS.border}`, gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: `${COLORS.primary}15`, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {(u.company_name || u.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.company_name || u.full_name}</p>
                        <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatDate(u.created_at)}</p>
                      </div>
                    </div>
                    <button onClick={() => handleApprove(u.id)} disabled={processing === u.id}
                      style={{ ...S.btnSuccess, padding: '7px 14px', fontSize: 12, borderRadius: 20, flexShrink: 0, opacity: processing === u.id ? 0.7 : 1 }}>
                      Approve
                    </button>
                  </div>
                ))}
                {pending.length > 5 && (
                  <button onClick={() => navigate('/admin/users')} style={{ ...S.btnSecondary, marginTop: 14, width: '100%', justifyContent: 'center', borderRadius: 20 }}>
                    View all {pending.length} pending →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════ USERS ══════════ */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Search & filter bar */}
          <div style={CARD}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, pointerEvents: 'none' }} />
              <input
                type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search name, email, company, phone, PCAB, TIN, region, city, specialization…"
                style={{ ...S.input, paddingLeft: 38 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</span>
              {[{ value: '', label: 'All' }, { value: 'admin', label: 'Admin' }, { value: 'client', label: 'Client' }, { value: 'contractor', label: 'Contractor' }].map(({ value, label }) => (
                <button key={value || 'r-all'} onClick={() => setUserRoleFilter(v => v === value ? '' : value)}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: `1.5px solid ${userRoleFilter === value ? COLORS.primary : COLORS.border}`, backgroundColor: userRoleFilter === value ? COLORS.primary : 'transparent', color: userRoleFilter === value ? '#fff' : COLORS.textMuted }}>
                  {label}
                </button>
              ))}
              <div style={{ width: 1, height: 20, backgroundColor: COLORS.border, margin: '0 4px' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</span>
              {[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'pending_verification', label: 'Unverified' }, { value: 'suspended', label: 'Suspended' }].map(({ value, label }) => (
                <button key={value || 's-all'} onClick={() => setUserStatusFilter(v => v === value ? '' : value)}
                  style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: `1.5px solid ${userStatusFilter === value ? COLORS.primary : COLORS.border}`, backgroundColor: userStatusFilter === value ? COLORS.primary : 'transparent', color: userStatusFilter === value ? '#fff' : COLORS.textMuted }}>
                  {label}
                </button>
              ))}
              {(userSearch || activeUserFilters > 0) && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}><strong style={{ color: COLORS.text }}>{filteredUsers.length}</strong> of {mergedUsers.length}</span>
                  <button onClick={clearUserFilters} style={{ ...S.btnSecondary, padding: '5px 13px', fontSize: 12, gap: 5, color: COLORS.danger, borderColor: COLORS.danger }}>
                    <X size={12} /> Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pending contractors */}
          {pending.length > 0 && (
            <div style={CARD}>
              <h3 style={{ ...S.h3, marginBottom: 20 }}>⏳ Pending Approval ({pending.length})</h3>
              {pending.map(u => (
                <div key={u.id} style={{ border: `1px solid ${COLORS.warning}44`, backgroundColor: `${COLORS.warning}08`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
                  <div style={{ ...S.rowBetween, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, margin: '0 0 4px' }}>{u.company_name || u.full_name}</p>
                      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> {u.email}</p>
                      <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> {u.phone || 'No phone'} <Landmark size={13} style={{ marginLeft: 6 }} /> PCAB: {u.license_number || 'Not provided'}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDetail({ item: u, type: 'user' })} style={{ ...S.btnSecondary, padding: '9px 14px', gap: 6, fontSize: 12 }}>
                        <Eye size={13} /> Details
                      </button>
                      <button onClick={() => handleApprove(u.id)} disabled={processing === u.id} style={{ ...S.btnSuccess, padding: '9px 16px', opacity: processing === u.id ? 0.7 : 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Check size={13} /> Approve</span>
                      </button>
                      <button onClick={() => handleSuspend(u.id)} disabled={processing === u.id} style={{ ...S.btnDanger, padding: '9px 16px', opacity: processing === u.id ? 0.7 : 1 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><X size={13} /> Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All users table */}
          <div style={CARD}>
            <div style={{ ...S.rowBetween, marginBottom: 20 }}>
              <h3 style={S.h3}>
                {filteredUsers.length === mergedUsers.length
                  ? `All Users (${mergedUsers.length})`
                  : <>{filteredUsers.length} <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 14 }}>of {mergedUsers.length} users</span></>
                }
              </h3>
              <button onClick={() => generateReport('users', filteredUsers, stats)}
                style={{ ...S.btnSecondary, gap: 7, padding: '8px 16px', fontSize: 12 }}>
                <Download size={14} /> Export Report
              </button>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Users size={40} color={COLORS.textLight} style={{ marginBottom: 12 }} />
                <p style={{ color: COLORS.textMuted, margin: '0 0 10px' }}>No users match your search.</p>
                <button onClick={clearUserFilters} style={{ ...S.btnSecondary, fontSize: 13, padding: '8px 16px' }}>Clear filters</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                      {['Name / Company', 'Contact', 'Role', 'Details', 'Status', 'Joined', 'Actions'].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                        <td style={{ padding: '12px' }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, margin: '0 0 2px' }}>{u.full_name}</p>
                          {u.company_name && <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>{u.company_name}</p>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 2px' }}>{u.email}</p>
                          {u.phone && <p style={{ fontSize: 12, color: COLORS.textLight, margin: 0 }}>{u.phone}</p>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ ...S.badgeBlue, textTransform: 'capitalize' }}>{u.role}</span>
                        </td>
                        <td style={{ padding: '12px', maxWidth: 200 }}>
                          {u.role === 'contractor' && (
                            <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.7 }}>
                              {u.license_number && <div>PCAB: <strong style={{ color: COLORS.text }}>{u.license_number}</strong></div>}
                              {u.company_region && <div>{u.company_city ? `${u.company_city}, ` : ''}{u.company_region}</div>}
                            </div>
                          )}
                          {u.role === 'client' && u.tin_number && (
                            <div style={{ fontSize: 11, color: COLORS.textMuted }}>TIN: <strong style={{ color: COLORS.text }}>{u.tin_number}</strong></div>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}><StatusBadge status={u.status} /></td>
                        <td style={{ padding: '12px', fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setDetail({ item: u, type: 'user' })}
                              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Eye size={12} /> Details
                            </button>
                            {u.status === 'pending' && (
                              <button onClick={() => handleApprove(u.id)} disabled={processing === u.id}
                                style={{ ...S.btnSuccess, padding: '5px 10px', fontSize: 11, opacity: processing === u.id ? 0.7 : 1 }}>
                                Approve
                              </button>
                            )}
                            {u.status === 'active' && u.role !== 'admin' && (
                              <button onClick={() => handleSuspend(u.id)} disabled={processing === u.id}
                                style={{ ...S.btnDanger, padding: '5px 10px', fontSize: 11, opacity: processing === u.id ? 0.7 : 1 }}>
                                Suspend
                              </button>
                            )}
                            {u.status === 'suspended' && (
                              <button onClick={() => handleReactivate(u.id)} disabled={processing === u.id}
                                style={{ ...S.btnSuccess, padding: '5px 10px', fontSize: 11, opacity: processing === u.id ? 0.7 : 1 }}>
                                Reactivate
                              </button>
                            )}
                            {u.role === 'contractor' && u.status === 'active' && (
                              <button onClick={() => handleToggleVerify(u.id, u.is_verified)} disabled={processing === u.id}
                                style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${u.is_verified ? COLORS.success : COLORS.border}`, background: u.is_verified ? COLORS.successLight : 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: u.is_verified ? COLORS.success : COLORS.textMuted, opacity: processing === u.id ? 0.7 : 1 }}>
                                {u.is_verified ? 'Verified' : 'Verify'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ PROJECTS ══════════ */}
      {tab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Filter bar */}
          <div style={CARD}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, pointerEvents: 'none' }} />
                <input type="text" value={projectSearch} onChange={e => setProjectSearch(e.target.value)}
                  placeholder="Search by title, client, or city…" style={{ ...S.input, paddingLeft: 38 }} />
              </div>
              <button onClick={() => setProjectFiltersOpen(v => !v)}
                style={{ ...S.btnSecondary, padding: '10px 16px', gap: 8, backgroundColor: (projectFiltersOpen || activeProjectFilters > 0) ? `${COLORS.primary}10` : 'transparent', borderColor: activeProjectFilters > 0 ? COLORS.primary : undefined, flexShrink: 0 }}>
                <SlidersHorizontal size={15} /> Filters
                {activeProjectFilters > 0 && (
                  <span style={{ backgroundColor: COLORS.primary, color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {activeProjectFilters}
                  </span>
                )}
                {projectFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {(activeProjectFilters > 0 || projectSearch) && (
                <button onClick={clearProjectFilters} style={{ ...S.btnSecondary, padding: '10px 14px', gap: 6, color: COLORS.danger, borderColor: COLORS.danger, flexShrink: 0 }}>
                  <X size={14} /> Clear
                </button>
              )}
            </div>

            {projectFiltersOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div>
                    <label style={S.label}>Status</label>
                    <select value={projectStatus} onChange={e => setProjectStatus(e.target.value)} style={{ ...S.input, marginTop: 4 }}>
                      <option value="">All Statuses</option>
                      {['open','awarded','in_progress','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Project Type</label>
                    <select value={projectType} onChange={e => setProjectType(e.target.value)} style={{ ...S.input, marginTop: 4 }}>
                      <option value="">All Types</option>
                      {uniqueProjectTypes.map(t => <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Region</label>
                    <select value={projectRegion} onChange={e => setProjectRegion(e.target.value)} style={{ ...S.input, marginTop: 4 }}>
                      <option value="">All Regions</option>
                      {uniqueProjectRegions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Min Budget (₱)</label>
                    <input type="number" value={projectBudgetMin} min="0" onChange={e => setProjectBudgetMin(e.target.value)} placeholder="e.g. 100000" style={{ ...S.input, marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={S.label}>Max Budget (₱)</label>
                    <input type="number" value={projectBudgetMax} min="0" onChange={e => setProjectBudgetMax(e.target.value)} placeholder="e.g. 5000000" style={{ ...S.input, marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={S.label}>Bid Deadline</label>
                    <select value={projectDeadline} onChange={e => setProjectDeadline(e.target.value)} style={{ ...S.input, marginTop: 4 }}>
                      <option value="">Any Deadline</option>
                      <option value="active">Still Accepting Bids</option>
                      <option value="expired">Deadline Passed</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Posted From</label>
                    <input type="date" value={projectDateFrom} onChange={e => setProjectDateFrom(e.target.value)} style={{ ...S.input, marginTop: 4 }} />
                  </div>
                  <div>
                    <label style={S.label}>Posted To</label>
                    <input type="date" value={projectDateTo} onChange={e => setProjectDateTo(e.target.value)} style={{ ...S.input, marginTop: 4 }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results table */}
          <div style={CARD}>
            <div style={{ ...S.rowBetween, marginBottom: 20 }}>
              <h3 style={S.h3}>
                {filteredProjects.length === projects.length
                  ? `All Projects (${projects.length})`
                  : <>{filteredProjects.length} <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 14 }}>of {projects.length} projects</span></>
                }
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {filteredProjects.length > 0 && (
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                    Showing {projectPage * PROJECT_PAGE_SIZE + 1}–{Math.min((projectPage + 1) * PROJECT_PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length}
                  </span>
                )}
                <button onClick={() => generateReport('projects', filteredProjects, stats)}
                  style={{ ...S.btnSecondary, gap: 7, padding: '8px 16px', fontSize: 12 }}>
                  <Download size={14} /> Export Report
                </button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Building2 size={40} color={COLORS.textLight} style={{ marginBottom: 12 }} />
                <p style={{ color: COLORS.textMuted }}>No projects yet.</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <Building2 size={40} color={COLORS.textLight} style={{ marginBottom: 12 }} />
                <p style={{ color: COLORS.textMuted, margin: '0 0 8px' }}>No projects match your filters.</p>
                <button onClick={clearProjectFilters} style={{ ...S.btnSecondary, fontSize: 13, padding: '8px 16px' }}>Clear filters</button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                      {['Project', 'Client', 'Location', 'Budget', 'Bid Deadline', 'Status', 'Posted', ''].map(h => (
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedProjects.map(p => {
                      const deadlinePassed = p.bid_deadline && new Date(p.bid_deadline) <= new Date();
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                          <td style={{ padding: '12px', maxWidth: 220 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                            <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0, textTransform: 'capitalize' }}>{p.project_type?.replace(/_/g, ' ')}</p>
                          </td>
                          <td style={{ padding: '12px', fontSize: 13, color: COLORS.textMuted }}>{p.client?.company_name || p.client?.full_name || '—'}</td>
                          <td style={{ padding: '12px', fontSize: 13, color: COLORS.textMuted }}>{p.location_city}, {p.location_region}</td>
                          <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap' }}>{formatCurrency(p.budget_min)} – {formatCurrency(p.budget_max)}</td>
                          <td style={{ padding: '12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {p.bid_deadline ? (
                              <span style={{ color: deadlinePassed ? COLORS.textMuted : COLORS.text }}>
                                {formatDate(p.bid_deadline)}
                                {deadlinePassed && <span style={{ marginLeft: 5, fontSize: 10, color: COLORS.danger, fontWeight: 700 }}>CLOSED</span>}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '12px' }}><StatusBadge status={p.status} /></td>
                          <td style={{ padding: '12px', fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>{formatDate(p.created_at)}</td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => setDetail({ item: p, type: 'project' })}
                              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Eye size={12} /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {projectTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 20, marginTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                {[['«', 0], ['‹', projectPage - 1]].map(([label, target]) => (
                  <button key={label} onClick={() => setProjectPage(Math.max(0, target))} disabled={projectPage === 0}
                    style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${COLORS.border}`, background: 'none', cursor: projectPage === 0 ? 'not-allowed' : 'pointer', color: projectPage === 0 ? COLORS.textLight : COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
                    {label}
                  </button>
                ))}
                {Array.from({ length: projectTotalPages }, (_, i) => i)
                  .filter(i => i === 0 || i === projectTotalPages - 1 || Math.abs(i - projectPage) <= 2)
                  .reduce((acc, i, idx, arr) => { if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…'); acc.push(i); return acc; }, [])
                  .map((item, idx) => item === '…'
                    ? <span key={`e${idx}`} style={{ padding: '0 4px', color: COLORS.textLight, fontSize: 13 }}>…</span>
                    : <button key={item} onClick={() => setProjectPage(item)}
                        style={{ width: 34, height: 34, borderRadius: 7, border: `1px solid ${item === projectPage ? COLORS.primary : COLORS.border}`, backgroundColor: item === projectPage ? COLORS.primary : 'transparent', color: item === projectPage ? '#fff' : COLORS.textMuted, fontSize: 13, fontWeight: item === projectPage ? 700 : 500, cursor: 'pointer' }}>
                        {item + 1}
                      </button>
                  )}
                {[['›', projectPage + 1], ['»', projectTotalPages - 1]].map(([label, target]) => (
                  <button key={label} onClick={() => setProjectPage(Math.min(projectTotalPages - 1, target))} disabled={projectPage === projectTotalPages - 1}
                    style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${COLORS.border}`, background: 'none', cursor: projectPage === projectTotalPages - 1 ? 'not-allowed' : 'pointer', color: projectPage === projectTotalPages - 1 ? COLORS.textLight : COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ AUDIT ══════════ */}
      {tab === 'audit' && <AuditTrailPage />}

      {/* ══════════ BACKUP & RESTORE ══════════ */}
      {tab === 'backup' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ ...S.h3, margin: '0 0 4px' }}>Backup & Restore</h3>
            <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
              Download a full export of all database tables, or restore from a previous backup file.
            </p>
          </div>
          <BackupRestore />
        </div>
      )}

      {/* ══════════ TRANSACTIONS ══════════ */}
      {tab === 'transactions' && (
        <div style={CARD}>
          <div style={{ ...S.rowBetween, marginBottom: 20 }}>
            <h3 style={S.h3}>All Transactions ({transactions.length})</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted }}>
                Total: <strong style={{ color: COLORS.success }}>{formatCurrency(stats.totalVolume || 0)}</strong>
              </div>
              <button onClick={() => generateReport('transactions', transactions, stats)}
                style={{ ...S.btnSecondary, gap: 7, padding: '8px 16px', fontSize: 12 }}>
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <CircleDollarSign size={40} color={COLORS.textLight} style={{ marginBottom: 12 }} />
              <p style={{ color: COLORS.textMuted }}>No transactions yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                    {['From', 'To', 'Type', 'Amount', 'Status', 'Date', ''].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                      <td style={{ padding: '12px', fontSize: 13, color: COLORS.text }}>
                        {t.sender?.company_name || t.sender?.full_name || '—'}
                        <span style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', textTransform: 'capitalize' }}>{t.sender?.role}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: COLORS.text }}>
                        {t.receiver?.company_name || t.receiver?.full_name || '—'}
                        <span style={{ fontSize: 11, color: COLORS.textMuted, display: 'block', textTransform: 'capitalize' }}>{t.receiver?.role}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ ...S.badgeBlue, fontSize: 11, textTransform: 'capitalize' }}>{t.transaction_type?.replace(/_/g, ' ') || '—'}</span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 14, fontWeight: 700, color: COLORS.success }}>{formatCurrency(t.amount)}</td>
                      <td style={{ padding: '12px' }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: '12px', fontSize: 12, color: COLORS.textMuted }}>{formatDate(t.created_at)}</td>
                      <td style={{ padding: '12px' }}>
                        <button onClick={() => setDetail({ item: t, type: 'transaction' })}
                          style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
}
