import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import { getTransactions } from '../../services/transactionService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { CreditCard } from 'lucide-react';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

export default function ContractorTransactions() {
  const { profile }  = useAuthStore();
  const [txns,    setTxns]    = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTxns = useCallback(() => {
    if (!profile) return;
    getTransactions(profile.id, 'contractor').then((data) => { setTxns(data); setLoading(false); });
  }, [profile]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);
  useRealtimeQuery('transactions', fetchTxns, profile?.id ? `receiver_id=eq.${profile.id}` : null, [profile?.id]);

  const totals = {
    received: txns.filter((t) => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0),
    pending:  txns.filter((t) => t.status === 'pending').reduce((s, t) => s + Number(t.amount), 0),
  };

  return (
    <DashboardLayout title="Earnings">
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div style={{ ...S.card, borderLeft: `4px solid ${COLORS.success}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>TOTAL RECEIVED</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.success, margin: 0 }}>{formatCurrency(totals.received)}</p>
        </div>
        <div style={{ ...S.card, borderLeft: `4px solid ${COLORS.warning}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>PENDING</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.warning, margin: 0 }}>{formatCurrency(totals.pending)}</p>
        </div>
        <div style={{ ...S.card, borderLeft: `4px solid ${COLORS.primary}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>TRANSACTIONS</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.primary, margin: 0 }}>{txns.length}</p>
        </div>
      </div>

      {/* Transactions table */}
      <div style={S.card}>
        <h3 style={{ ...S.h3, marginBottom: 20 }}>Payment History</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>Loading...</div>
        ) : txns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ marginBottom: 12 }}><CreditCard size={48} color={COLORS.textLight} /></div>
            <p style={{ color: COLORS.textMuted }}>No payments received yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  {['Date', 'Project', 'Milestone', 'Client', 'Amount', 'Method', 'Status'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray50}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                    <td style={{ padding: '12px', fontSize: 12, color: COLORS.textMuted }}>{formatDateTime(t.created_at)}</td>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 600, color: COLORS.text }}>{t.project?.title || '—'}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: COLORS.textMuted }}>{t.milestone_name || '—'}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: COLORS.text }}>{t.sender?.company_name || t.sender?.full_name || '—'}</td>
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 800, color: COLORS.success }}>+{formatCurrency(t.amount)}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: COLORS.textMuted, textTransform: 'capitalize' }}>
                      {t.payment_method?.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px' }}><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
