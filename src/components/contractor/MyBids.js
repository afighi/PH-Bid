import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import { getMyBids, withdrawBid } from '../../services/bidService';
import { formatCurrency, formatDate, truncate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { ClipboardList, MapPin, Pencil, Trophy } from 'lucide-react';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

export default function MyBids() {
  const { profile }  = useAuthStore();
  const navigate     = useNavigate();
  const [bids,     setBids]    = useState([]);
  const [loading,  setLoading] = useState(true);
  const [filter,   setFilter]  = useState('all');
  const [withdrawing, setWithdrawing] = useState(null);

  const fetchBids = useCallback(() => {
    if (!profile) return;
    getMyBids(profile.id).then((data) => { setBids(data); setLoading(false); });
  }, [profile]);

  useEffect(() => { fetchBids(); }, [fetchBids]);
  useRealtimeQuery('bids', fetchBids, profile?.id ? `contractor_id=eq.${profile.id}` : null, [profile?.id]);

  const statuses = ['all', 'submitted', 'awarded', 'rejected', 'withdrawn'];
  const filtered = filter === 'all' ? bids : bids.filter((b) => b.status === filter);

  const [withdrawModal,  setWithdrawModal]  = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  const handleWithdraw = (bidId) => { setWithdrawReason(''); setWithdrawModal(bidId); };

  const confirmWithdraw = async () => {
    const bidId = withdrawModal;
    setWithdrawModal(null);
    setWithdrawing(bidId);
    try {
      await withdrawBid(bidId, withdrawReason.trim() || null);
      setBids(prev => prev.map(b => b.id === bidId ? { ...b, status: 'withdrawn', withdrawal_reason: withdrawReason.trim() || null } : b));
    } finally {
      setWithdrawing(null);
    }
  };

  const BID_BORDER = { awarded: COLORS.success, rejected: COLORS.danger, withdrawn: COLORS.textLight };

  return (
    <DashboardLayout title="My Bids">
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {statuses.map((s) => {
          const count = s === 'all' ? bids.length : bids.filter((b) => b.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              backgroundColor: filter === s ? COLORS.primary : COLORS.gray100,
              color: filter === s ? '#fff' : COLORS.textMuted,
              fontWeight: filter === s ? 700 : 500, fontSize: 13,
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>Loading your bids...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
          <div style={{ marginBottom: 12 }}><ClipboardList size={48} color={COLORS.textLight} /></div>
          <p style={{ color: COLORS.textMuted }}>No bids in this category.</p>
          {filter === 'all' && (
            <button onClick={() => navigate('/contractor/browse')} style={{ ...S.btnPrimary, marginTop: 16 }}>
              Browse Projects →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((b) => (
            <div key={b.id} style={{
              ...S.card,
              borderLeft: `4px solid ${BID_BORDER[b.status] || COLORS.primary}`,
            }}>
              <div style={{ ...S.rowBetween, flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: '0 0 4px' }}>
                    {truncate(b.project?.title, 70)}
                  </h3>
                  <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {b.project?.location_city} · Bid deadline: {formatDate(b.project?.bid_deadline)}</span>
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
                <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, margin: '0 0 2px' }}>YOUR BID</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary, margin: 0 }}>{formatCurrency(b.bid_amount)}</p>
                </div>
                <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, margin: '0 0 2px' }}>START DATE</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>{formatDate(b.proposed_start_date)}</p>
                </div>
                <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, margin: '0 0 2px' }}>COMPLETION</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>{formatDate(b.proposed_end_date)}</p>
                </div>
                <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 700, margin: '0 0 2px' }}>REVISION</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: 0 }}>#{b.revision_number || 1}</p>
                </div>
              </div>

              {/* Cover letter preview */}
              <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, margin: '0 0 14px' }}>
                {truncate(b.cover_letter, 150)}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                {b.status === 'submitted' && (
                  <>
                    <button
                      onClick={() => navigate(`/contractor/projects/${b.project?.id}/bid`)}
                      style={{ ...S.btnSecondary, padding: '8px 16px', fontSize: 13 }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Pencil size={14} /> Revise Bid</span>
                    </button>
                    <button
                      onClick={() => handleWithdraw(b.id)}
                      disabled={withdrawing === b.id}
                      style={{ ...S.btnDanger, padding: '8px 16px', fontSize: 13, opacity: withdrawing === b.id ? 0.7 : 1 }}
                    >
                      {withdrawing === b.id ? 'Withdrawing...' : 'Withdraw'}
                    </button>
                  </>
                )}
                {b.status === 'awarded' && (
                  <div style={{ ...S.badgeGreen, padding: '10px 16px', fontSize: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Trophy size={16} /> Awarded — Contact client to sign contract</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdraw reason modal */}
      {withdrawModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setWithdrawModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, marginBottom: 6 }}>Withdraw Bid</div>
            <p style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>This cannot be undone. Optionally tell us why:</p>
            <select value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)}
              style={{ width: '100%', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit', background: '#fff', marginBottom: 16, cursor: 'pointer' }}>
              <option value="">-- Select a reason (optional) --</option>
              <option value="No longer available">No longer available</option>
              <option value="Found another project">Found another project</option>
              <option value="Project requirements changed">Project requirements changed</option>
              <option value="Budget does not match my costs">Budget does not match my costs</option>
              <option value="Other">Other</option>
            </select>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setWithdrawModal(null)} style={{ flex: 1, background: COLORS.gray100, color: COLORS.textMuted, border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmWithdraw} style={{ flex: 2, background: COLORS.danger, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Confirm Withdraw</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
