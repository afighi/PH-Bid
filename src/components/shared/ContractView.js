import { useState } from 'react';
import { X, FileText, CheckCircle, Clock, PenLine } from 'lucide-react';
import { COLORS } from '../../theme';
import { getContractForProject, signContract } from '../../services/contractService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';

function StatusChip({ status }) {
  const map = {
    pending_signatures: { label: 'Awaiting Signatures', color: COLORS.warning,     bg: COLORS.warningLight  },
    active:             { label: 'Active',               color: COLORS.success,     bg: COLORS.successLight  },
    completed:          { label: 'Completed',            color: COLORS.textMuted,   bg: COLORS.gray100       },
    disputed:           { label: 'Disputed',             color: COLORS.danger,      bg: COLORS.dangerLight   },
    cancelled:          { label: 'Cancelled',            color: COLORS.textMuted,   bg: COLORS.gray100       },
  };
  const s = map[status] || map.pending_signatures;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

export default function ContractView({ projectId, userId, role, onClose }) {
  const { data: contracts, loading } = useSupabaseRealtime(
    'contracts',
    () => getContractForProject(projectId).then(c => c ? [c] : []),
    `project_id=eq.${projectId}`,
    [projectId]
  );

  const contract = contracts[0] || null;
  const [signing, setSigning] = useState(false);
  const [error,   setError]   = useState('');

  const mySignedAt   = role === 'client' ? contract?.client_signed_at : contract?.contractor_signed_at;
  const bothSigned   = contract?.client_signed_at && contract?.contractor_signed_at;

  const handleSign = async () => {
    setSigning(true);
    setError('');
    try {
      await signContract(contract.id, role);
    } catch (e) {
      setError(e.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (!contract) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <FileText size={40} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No contract yet</div>
      <p style={{ color: COLORS.textMuted, fontSize: 13 }}>A contract will appear here once the client generates one after awarding the bid.</p>
    </div>
  );

  const Row = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${COLORS.border}`, gap: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.text, textAlign: 'right' }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.gray50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={20} color={COLORS.primary} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>Contract</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>{contract.project?.title}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusChip status={contract.status} />
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Amount hero */}
        <div style={{ background: 'linear-gradient(135deg, #FAF5EC, #F5ECE0)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Contract Amount</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: COLORS.primary, letterSpacing: '-0.03em' }}>{formatCurrency(contract.contract_amount)}</div>
        </div>

        {/* Details */}
        <Row label="Client"      value={contract.client?.company_name || contract.client?.full_name} />
        <Row label="Contractor"  value={contract.contractor?.company_name || contract.contractor?.full_name} />
        <Row label="Start Date"  value={contract.start_date ? formatDate(contract.start_date) : null} />
        <Row label="End Date"    value={contract.end_date ? formatDate(contract.end_date) : null} />
        <Row label="License"     value={contract.contractor?.license_number} />
        <Row label="PCAB Class"  value={contract.contractor?.pcab_classification} />

        {contract.scope_summary && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Scope</div>
            <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, margin: 0, background: COLORS.gray50, padding: '12px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>{contract.scope_summary}</p>
          </div>
        )}

        {contract.terms_and_conditions && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Terms & Conditions</div>
            <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', background: COLORS.gray50, padding: '12px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>{contract.terms_and_conditions}</p>
          </div>
        )}

        {/* Signatures */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Client', signedAt: contract.client_signed_at, name: contract.client?.full_name },
            { label: 'Contractor', signedAt: contract.contractor_signed_at, name: contract.contractor?.company_name || contract.contractor?.full_name },
          ].map(({ label, signedAt, name }) => (
            <div key={label} style={{ padding: '14px 16px', borderRadius: 12, border: `1.5px solid ${signedAt ? COLORS.success + '55' : COLORS.border}`, background: signedAt ? COLORS.successLight : COLORS.gray50 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{name}</div>
              {signedAt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: COLORS.success }}>
                  <CheckCircle size={11} /> Signed {formatDate(signedAt)}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: COLORS.textMuted }}>
                  <Clock size={11} /> Pending signature
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sign action */}
        {!mySignedAt && !bothSigned && (
          <div style={{ marginTop: 20 }}>
            {error && <div style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button
              onClick={handleSign}
              disabled={signing}
              style={{
                width: '100%', background: COLORS.primary, color: '#fff',
                border: 'none', borderRadius: 12, padding: '13px 0',
                fontSize: 14, fontWeight: 700, cursor: signing ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: signing ? 0.7 : 1, transition: 'opacity 0.15s',
              }}
            >
              <PenLine size={15} /> {signing ? 'Signing…' : 'Sign Contract'}
            </button>
            <p style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', margin: '8px 0 0' }}>
              By signing, you agree to the terms and conditions above.
            </p>
          </div>
        )}

        {bothSigned && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, background: COLORS.successLight, borderRadius: 12, padding: '14px 16px', border: `1px solid ${COLORS.success}44` }}>
            <CheckCircle size={18} color={COLORS.success} />
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.success }}>Contract is fully signed and active.</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
