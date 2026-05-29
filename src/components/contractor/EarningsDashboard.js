import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getMyBids } from '../../services/bidService';
import { supabase } from '../../config/supabase';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TrendingUp, Trophy, ClipboardList, CircleDollarSign, BarChart3 } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      border: `1px solid ${COLORS.border}`,
      padding: '20px 20px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <div>
        <div style={{
          fontWeight: 900, color: COLORS.text, letterSpacing: '-0.02em',
          fontSize: 'clamp(15px, 2vw, 22px)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 90, fontSize: 12, color: COLORS.textMuted, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: COLORS.gray100, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ width: 20, fontSize: 12, fontWeight: 700, color: COLORS.text, textAlign: 'right', flexShrink: 0 }}>{count}</div>
    </div>
  );
}

function WinRateRing({ rate }) {
  const r    = 28;
  const circ = 2 * Math.PI * r;
  const fill = circ * (rate / 100);
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={40} cy={40} r={r} fill="none" stroke={COLORS.gray100} strokeWidth={8} />
        <circle cx={40} cy={40} r={r} fill="none"
          stroke={rate >= 50 ? COLORS.success : rate >= 25 ? COLORS.warning : COLORS.danger}
          strokeWidth={8} strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: COLORS.text, letterSpacing: '-0.02em' }}>{rate}%</div>
      </div>
    </div>
  );
}

export default function EarningsDashboard() {
  const { profile } = useAuthStore();
  const { isMobile } = useBreakpoint();
  const [transactions, setTransactions] = useState([]);
  const [loadingTx,    setLoadingTx]    = useState(true);

  const { data: bids, loading: loadingBids } = useSupabaseRealtime(
    'bids',
    () => getMyBids(profile.id),
    `contractor_id=eq.${profile.id}`,
    [profile?.id]
  );

  useEffect(() => {
    if (!profile?.id) return;
    const fetchTx = () =>
      supabase
        .from('transactions')
        .select('*, project:projects(title)')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { setTransactions(data || []); setLoadingTx(false); });

    fetchTx();

    const channel = supabase
      .channel(`tx-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `receiver_id=eq.${profile.id}` }, fetchTx)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  const stats = useMemo(() => {
    const awarded   = bids.filter(b => b.status === 'awarded');
    const submitted = bids.filter(b => b.status === 'submitted');
    const withdrawn = bids.filter(b => b.status === 'withdrawn');
    const rejected  = bids.filter(b => b.status === 'rejected');
    const winRate   = bids.length > 0 ? Math.round((awarded.length / bids.length) * 100) : 0;

    const totalEarned = transactions
      .filter(t => t.status === 'completed')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const pending = transactions
      .filter(t => t.status === 'pending')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const avgBid = bids.length > 0
      ? bids.reduce((s, b) => s + Number(b.bid_amount || 0), 0) / bids.length
      : 0;

    return { awarded, submitted, withdrawn, rejected, winRate, totalEarned, pending, avgBid };
  }, [bids, transactions]);

  const loading = loadingBids || loadingTx;

  if (loading) return (
    <DashboardLayout title="Earnings & Performance">
      <div style={{ textAlign: 'center', padding: 80, color: COLORS.textMuted }}>Loading…</div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Earnings & Performance">

      {/* ── KPI grid — 2 rows of 3 and 2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard
          label="Total Earned"
          value={formatCurrency(stats.totalEarned)}
          sub="From completed payments"
          icon={CircleDollarSign}
          color={COLORS.success}
          bg={COLORS.successLight}
        />
        <StatCard
          label="Pending Payout"
          value={formatCurrency(stats.pending)}
          sub="Awaiting release"
          icon={TrendingUp}
          color={COLORS.warning}
          bg={COLORS.warningLight}
        />
        <StatCard
          label="Avg Bid Amount"
          value={formatCurrency(stats.avgBid)}
          sub="Across all bids"
          icon={BarChart3}
          color={COLORS.textMuted}
          bg={COLORS.gray100}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard
          label="Bids Won"
          value={stats.awarded.length}
          sub={`${stats.winRate}% win rate · ${bids.length} total bids`}
          icon={Trophy}
          color={COLORS.accent}
          bg={COLORS.accentLight}
        />
        <StatCard
          label="Active Bids"
          value={stats.submitted.length}
          sub="Awaiting client decision"
          icon={ClipboardList}
          color={COLORS.primary}
          bg={COLORS.primaryLight}
        />
      </div>

      {/* ── Middle row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Bid breakdown + win rate ring */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: '20px 22px' }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, marginBottom: 18 }}>Bid Breakdown</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <MiniBar label="Awarded"   count={stats.awarded.length}   max={bids.length} color={COLORS.success} />
              <MiniBar label="Submitted" count={stats.submitted.length} max={bids.length} color={COLORS.primary} />
              <MiniBar label="Rejected"  count={stats.rejected.length}  max={bids.length} color={COLORS.danger}  />
              <MiniBar label="Withdrawn" count={stats.withdrawn.length} max={bids.length} color={COLORS.textMuted} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <WinRateRing rate={stats.winRate} />
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Win Rate</div>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.textMuted }}>
            Total bids placed: <strong style={{ color: COLORS.text }}>{bids.length}</strong>
          </div>
        </div>

        {/* Recent payments */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 800, fontSize: 15, color: COLORS.text, flexShrink: 0 }}>
            Recent Payments
          </div>
          {transactions.length === 0 ? (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: COLORS.textMuted, fontSize: 13, flex: 1 }}>
              No payments yet.
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {transactions.slice(0, 8).map(t => (
                <div key={t.id} style={{ padding: '12px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.project?.title || 'Project'}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDate(t.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: t.status === 'completed' ? COLORS.success : COLORS.warning }}>
                      {formatCurrency(t.amount)}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.textMuted, textTransform: 'capitalize' }}>{t.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Awarded bids ── */}
      {stats.awarded.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 800, fontSize: 15, color: COLORS.text }}>
            Awarded Bids
          </div>
          {stats.awarded.map((b, i) => (
            <div key={b.id} style={{
              padding: '14px 22px',
              borderBottom: i < stats.awarded.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.project?.title}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  {b.project?.location_city} · {formatDate(b.created_at)}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.success, flexShrink: 0 }}>
                {formatCurrency(b.bid_amount)}
              </div>
            </div>
          ))}
        </div>
      )}

    </DashboardLayout>
  );
}
