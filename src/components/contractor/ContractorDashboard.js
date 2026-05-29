import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import ProfileCompletion from './ProfileCompletion';
import { useAuthStore } from '../../stores/authStore';
import { getMyBids } from '../../services/bidService';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Search, ClipboardList, Trophy, CircleDollarSign, Eye, X, Download, ArrowUpRight } from 'lucide-react';
import { ArchieBanner } from '../shared/ArchiePanel';
import ArchieChat from '../shared/ArchiePanel';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

/* ── Bid detail modal ─────────────────────────────────────────── */
function BidModal({ bid, onClose }) {
  if (!bid) return null;
  const FIELD = (label, value) => value != null && value !== '' ? (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.text, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  const p = bid.project;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Bid Details</div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.02em' }}>{truncate(p?.title, 50)}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px', overflowY: 'auto' }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: `${COLORS.primary}08`, border: `1px solid ${COLORS.primary}22`, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted }}>YOUR BID AMOUNT</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: COLORS.primary, letterSpacing: '-0.03em' }}>{formatCurrency(bid.bid_amount)}</span>
          </div>
          {FIELD('Bid Status', bid.status?.replace(/_/g, ' '))}
          {FIELD('Submitted', formatDate(bid.created_at))}
          {p && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 0 6px' }}>Project Information</div>
              {FIELD('Project Title', p.title)}
              {FIELD('Type', p.project_type?.replace(/_/g, ' '))}
              {FIELD('Location', [p.location_city, p.location_region].filter(Boolean).join(', '))}
              {FIELD('Client Budget', `${formatCurrency(p.budget_min)} – ${formatCurrency(p.budget_max)}`)}
              {FIELD('Bid Deadline', p.bid_deadline ? formatDate(p.bid_deadline) : null)}
              {FIELD('Project Status', p.status?.replace(/_/g, ' '))}
            </>
          )}
          {bid.cover_letter && (
            <div style={{ paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cover Letter</div>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.65, margin: 0, backgroundColor: COLORS.gray50, borderRadius: 8, padding: 12 }}>{bid.cover_letter}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...S.btnSecondary, flex: 1, justifyContent: 'center', padding: '10px 0' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Report generator ─────────────────────────────────────────── */
function generateBidReport(bids, profile) {
  const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  const awarded = bids.filter(b => b.status === 'awarded');
  const totalValue = awarded.reduce((s, b) => s + Number(b.bid_amount), 0);

  const rows = bids.map(b => `
    <tr>
      <td>${truncate(b.project?.title, 50) || '—'}</td>
      <td><strong>₱${Number(b.bid_amount).toLocaleString('en-PH')}</strong></td>
      <td style="text-transform:capitalize">${(b.status || '').replace(/_/g, ' ')}</td>
      <td>${[b.project?.location_city, b.project?.location_region].filter(Boolean).join(', ') || '—'}</td>
      <td>${b.project?.bid_deadline ? formatDate(b.project.bid_deadline) : '—'}</td>
      <td>${formatDate(b.created_at)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BuildBid PH — Bid History Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0f172a; margin-bottom: 32px; }
    .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.03em; }
    .brand span { color: #7B3F00; }
    .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.8; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
    .stat-value { font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1; }
    .stat-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Build<span>Bid</span> PH</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Contractor Bid History Report</div>
    </div>
    <div class="meta">
      <div><strong>${profile?.company_name || profile?.full_name}</strong></div>
      <div>Generated: ${now}</div>
      <div>Total Bids: ${bids.length}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-value">${bids.length}</div><div class="stat-label">Total Bids</div></div>
    <div class="stat"><div class="stat-value">${bids.filter(b=>b.status==='submitted').length}</div><div class="stat-label">Under Review</div></div>
    <div class="stat"><div class="stat-value">${awarded.length}</div><div class="stat-label">Awarded</div></div>
    <div class="stat"><div class="stat-value">₱${totalValue.toLocaleString('en-PH')}</div><div class="stat-label">Awarded Value</div></div>
  </div>
  <table>
    <thead><tr><th>Project</th><th>Bid Amount</th><th>Status</th><th>Location</th><th>Deadline</th><th>Submitted</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">No bids found</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>BuildBid PH — Contractor Report</span>
    <span>Confidential · For internal use only</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
}

/* ── Stat card ────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color }) {
  const valStr = String(value);
  const fontSize = valStr.length > 10 ? 14 : valStr.length > 7 ? 17 : 22;
  return (
    <div style={{ backgroundColor: '#FFF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.03)', minWidth: 0 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize, fontWeight: 900, color: COLORS.text, letterSpacing: '-0.02em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, marginTop: 4, letterSpacing: '0.02em' }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Contractor dashboard ─────────────────────────────────────── */
export default function ContractorDashboard() {
  const { profile } = useAuthStore();
  const navigate    = useNavigate();
  const [bids,       setBids]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedBid, setSelectedBid] = useState(null);
  const [archieOpen, setArchieOpen] = useState(false);

  const fetchBids = useCallback(() => {
    if (!profile) return;
    getMyBids(profile.id).then(data => { setBids(data); setLoading(false); });
  }, [profile]);

  useEffect(() => { fetchBids(); }, [fetchBids]);
  useRealtimeQuery('bids', fetchBids, profile?.id ? `contractor_id=eq.${profile.id}` : null, [profile?.id]);

  const stats = {
    total:     bids.length,
    submitted: bids.filter(b => b.status === 'submitted').length,
    awarded:   bids.filter(b => b.status === 'awarded').length,
    rejected:  bids.filter(b => b.status === 'rejected').length,
  };

  const totalBidValue = bids.filter(b => b.status === 'awarded').reduce((s, b) => s + Number(b.bid_amount), 0);
  const recentBids    = bids.slice(0, 8);

  return (
    <DashboardLayout title="Contractor Dashboard">
      <BidModal bid={selectedBid} onClose={() => setSelectedBid(null)} />

      {/* ── Archie welcome banner ── */}
      <ArchieBanner
        role="contractor"
        profile={profile}
        stats={stats}
        onOpenChat={() => { setArchieOpen(false); setTimeout(() => setArchieOpen(true), 0); }}
      />
      <ArchieChat
        role="contractor"
        profile={profile}
        stats={stats}
        defaultOpen={archieOpen}
        onClose={() => setArchieOpen(false)}
      />

      {/* ── Action row ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => generateBidReport(bids, profile)}
          style={{ backgroundColor: '#fff', color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <Download size={14} /> Bid Report
        </button>
        <button onClick={() => navigate('/contractor/browse')}
          style={{ backgroundColor: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 10px rgba(123,63,0,0.28)' }}>
          <Search size={14} /> Browse Projects
        </button>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Bids"    value={stats.total}              icon={<ClipboardList size={20} color={COLORS.primary} />} color={COLORS.primary} />
        <StatCard label="Under Review"  value={stats.submitted}          icon={<ClipboardList size={20} color={COLORS.warning} />} color={COLORS.warning} />
        <StatCard label="Awarded"       value={stats.awarded}            icon={<Trophy size={20} color={COLORS.success} />} color={COLORS.success} />
        <StatCard label="Awarded Value" value={formatCurrency(totalBidValue)} icon={<CircleDollarSign size={20} color={COLORS.success} />} color={COLORS.success} />
      </div>

      {/* ── Profile completion ── */}
      <ProfileCompletion />

      {/* ── Recent bids ── */}
      <div style={{ backgroundColor: '#FFF', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)', marginTop: 4 }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: COLORS.text, letterSpacing: '-0.01em' }}>My Recent Bids</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.textMuted }}>Your latest bid submissions</p>
          </div>
          <button onClick={() => navigate('/contractor/my-bids')} style={{ ...S.btnSecondary, padding: '7px 14px', fontSize: 12, gap: 5 }}>
            View All <ArrowUpRight size={12} />
          </button>
        </div>

        <div style={{ padding: '0 4px' }}>
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, border: `3px solid rgba(37,99,235,0.2)`, borderTopColor: COLORS.primary, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : recentBids.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ marginBottom: 12 }}><ClipboardList size={40} color={COLORS.textLight} /></div>
              <p style={{ color: COLORS.textMuted, fontWeight: 600, margin: '0 0 6px' }}>No bids submitted yet</p>
              <p style={{ color: COLORS.textMuted, fontSize: 13, margin: '0 0 20px' }}>Browse open projects and submit your first bid</p>
              <button onClick={() => navigate('/contractor/browse')} style={{ ...S.btnPrimary, padding: '10px 22px', gap: 6 }}>
                <Search size={14} /> Browse Open Projects
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  {['Project', 'Location', 'My Bid', 'Status', 'Deadline', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 18px', fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', backgroundColor: '#FAFAFA' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBids.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: i < recentBids.length - 1 ? `1px solid ${COLORS.border}` : 'none', backgroundColor: b.status === 'awarded' ? `${COLORS.success}06` : '' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = b.status === 'awarded' ? `${COLORS.success}06` : ''}>
                    <td style={{ padding: '13px 18px', maxWidth: 220 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {truncate(b.project?.title, 40)}
                      </p>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0 }}>
                        {formatDate(b.created_at)}
                      </p>
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: COLORS.textMuted }}>
                      {b.project?.location_city || '—'}
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: b.status === 'awarded' ? COLORS.success : COLORS.text, whiteSpace: 'nowrap' }}>
                      {formatCurrency(b.bid_amount)}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: '13px 18px', fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                      {b.project?.bid_deadline ? formatDate(b.project.bid_deadline) : '—'}
                    </td>
                    <td style={{ padding: '13px 18px' }}>
                      <button
                        onClick={() => setSelectedBid(b)}
                        style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: COLORS.primary, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                      >
                        <Eye size={12} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </DashboardLayout>
  );
}
