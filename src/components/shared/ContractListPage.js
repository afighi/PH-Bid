import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getContractsForUser } from '../../services/contractService';
import ContractView from './ContractView';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FileText, PenLine } from 'lucide-react';

function StatusChip({ status }) {
  const map = {
    pending_signatures: { label: 'Awaiting Signatures', color: COLORS.warning,   bg: COLORS.warningLight  },
    active:             { label: 'Active',               color: COLORS.success,   bg: COLORS.successLight  },
    completed:          { label: 'Completed',            color: COLORS.textMuted, bg: COLORS.gray100       },
    disputed:           { label: 'Disputed',             color: COLORS.danger,    bg: COLORS.dangerLight   },
    cancelled:          { label: 'Cancelled',            color: COLORS.textMuted, bg: COLORS.gray100       },
  };
  const s = map[status] || map.pending_signatures;
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>;
}

export default function ContractListPage() {
  const { profile } = useAuthStore();
  const [selected,  setSelected]  = useState(null);

  const { data: contracts, loading } = useSupabaseRealtime(
    'contracts',
    () => getContractsForUser(profile.id),
    null,
    [profile?.id]
  );

  if (selected) {
    return (
      <DashboardLayout title="Contract">
        <ContractView
          projectId={selected.project_id}
          userId={profile.id}
          role={profile.role}
          onClose={() => setSelected(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contracts">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>Contracts</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>All your signed and pending contracts.</div>
        </div>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 56, color: COLORS.textMuted }}>Loading…</div>
      ) : contracts.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: '56px 32px', textAlign: 'center' }}>
          <FileText size={40} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: 6 }}>No contracts yet</div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>Contracts are created after a bid is awarded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contracts.map(c => {
            const mySigned = profile.role === 'client' ? c.client_signed_at : c.contractor_signed_at;
            const other    = profile.role === 'client' ? c.contractor : c.client;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${COLORS.border}`, padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.borderStrong; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,10,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 3 }}>{c.project?.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>
                    {profile.role === 'client' ? 'Contractor' : 'Client'}: {other?.company_name || other?.full_name} · {formatDate(c.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(c.contract_amount)}</div>
                  <StatusChip status={c.status} />
                  {!mySigned && c.status === 'pending_signatures' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: COLORS.accent, background: COLORS.accentLight, padding: '3px 9px', borderRadius: 20 }}>
                      <PenLine size={10} /> Sign
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
