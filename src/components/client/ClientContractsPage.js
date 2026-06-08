import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layout/DashboardLayout';
import ContractView from '../shared/ContractView';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { getContractsForUser } from '../../services/contractService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import {
  FileText, PenLine, CheckCircle2, Clock, AlertTriangle,
  ArrowUpRight, Building2, CalendarDays, CircleDollarSign, ChevronRight,
} from 'lucide-react';

/* ── Status config ───────────────────────────────────────────────── */
const CONTRACT_STATUS = {
  pending_signatures: { label: 'Awaiting Signatures', color: COLORS.warning,   bg: '#FEF3C7', icon: <PenLine size={13} /> },
  active:             { label: 'Active',               color: COLORS.success,   bg: '#D1FAE5', icon: <CheckCircle2 size={13} /> },
  completed:          { label: 'Completed',            color: COLORS.textMuted, bg: '#F1F5F9', icon: <CheckCircle2 size={13} /> },
  disputed:           { label: 'Disputed',             color: COLORS.danger,    bg: '#FEE2E2', icon: <AlertTriangle size={13} /> },
};

function StatusChip({ status }) {
  const s = CONTRACT_STATUS[status] || CONTRACT_STATUS.pending_signatures;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {s.icon}{s.label}
    </span>
  );
}

function SectionHeader({ title, count, color = COLORS.text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '-0.01em' }}>{title}</div>
      {count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 20 }}>{count}</span>
      )}
    </div>
  );
}

export default function ClientContractsPage() {
  const { profile }  = useAuthStore();
  const navigate     = useNavigate();

  const [contracts,       setContracts]       = useState([]);
  const [awardedProjects, setAwardedProjects] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeContract,  setActiveContract]  = useState(null); // projectId for ContractView
  const [filter,          setFilter]          = useState('all'); // all | active | pending | completed

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [contractData, projectData] = await Promise.all([
        getContractsForUser(profile.id),
        supabase
          .from('projects')
          .select(`
            id, title, status, awarded_bid_id, created_at,
            location_city, location_region,
            bid:bids!awarded_bid_id(
              id, bid_amount, proposed_start_date, proposed_end_date,
              contractor:profiles!contractor_id(id, full_name, company_name, average_rating)
            )
          `)
          .eq('client_id', profile.id)
          .eq('status', 'awarded')
          .order('created_at', { ascending: false })
          .then(({ data }) => data || []),
      ]);

      // Awarded projects that don't yet have a contract
      const contractedProjectIds = new Set(contractData.map(c => c.project_id));
      const uncontracted = projectData.filter(p => !contractedProjectIds.has(p.id));

      setContracts(contractData);
      setAwardedProjects(uncontracted);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = filter === 'all'
    ? contracts
    : contracts.filter(c => {
        if (filter === 'active')    return c.status === 'active';
        if (filter === 'pending')   return c.status === 'pending_signatures';
        if (filter === 'completed') return c.status === 'completed';
        return true;
      });

  const stats = {
    active:    contracts.filter(c => c.status === 'active').length,
    pending:   contracts.filter(c => c.status === 'pending_signatures').length,
    completed: contracts.filter(c => c.status === 'completed').length,
    awarded:   awardedProjects.length,
  };

  const needsSignature = contracts.filter(
    c => c.status === 'pending_signatures' && !c.client_signed_at
  );

  if (activeContract) {
    return (
      <DashboardLayout title="Contract Details">
        <ContractView
          projectId={activeContract}
          userId={profile.id}
          role="client"
          onClose={() => { setActiveContract(null); loadData(); }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Contracts">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: COLORS.text, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Contracts</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>Awarded bids, active contracts, and completed projects.</p>
        </div>

        {/* ── Needs signature alert ── */}
        {needsSignature.length > 0 && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <PenLine size={18} color="#D97706" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                {needsSignature.length} contract{needsSignature.length > 1 ? 's' : ''} awaiting your signature
              </div>
              <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                Sign to activate the contract and allow work to begin.
              </div>
            </div>
            <button
              onClick={() => setActiveContract(needsSignature[0].project_id)}
              style={{ ...S.btnPrimary, padding: '8px 16px', fontSize: 12, flexShrink: 0 }}
            >
              Review & Sign
            </button>
          </div>
        )}

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Awarded (no contract)', value: stats.awarded,   color: COLORS.primary, bg: '#F5E6D3', icon: <Building2 size={20} color={COLORS.primary} /> },
            { label: 'Pending Signature',     value: stats.pending,   color: '#D97706',      bg: '#FEF3C7', icon: <PenLine size={20} color="#D97706" /> },
            { label: 'Active Contracts',      value: stats.active,    color: COLORS.success, bg: '#D1FAE5', icon: <CheckCircle2 size={20} color={COLORS.success} /> },
            { label: 'Completed',             value: stats.completed, color: COLORS.textMuted, bg: '#F1F5F9', icon: <CheckCircle2 size={20} color={COLORS.textMuted} /> },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} style={{ background: '#FFF', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                {icon}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: COLORS.textMuted }}>Loading…</div>
        ) : (
          <>
            {/* ── Awarded projects without contracts ── */}
            {awardedProjects.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <SectionHeader title="Awarded — Contract Not Yet Created" count={awardedProjects.length} color={COLORS.primary} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {awardedProjects.map(p => {
                    const bid = Array.isArray(p.bid) ? p.bid[0] : p.bid;
                    const contractor = bid?.contractor;
                    return (
                      <div key={p.id} style={{ background: '#FFF', borderRadius: 14, border: `1.5px solid ${COLORS.primary}44`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>{p.title}</div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Building2 size={11} /> {contractor?.company_name || contractor?.full_name || 'Contractor'}
                            </span>
                            {bid?.bid_amount && (
                              <span style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CircleDollarSign size={11} /> {formatCurrency(bid.bid_amount)}
                              </span>
                            )}
                            {bid?.proposed_start_date && (
                              <span style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CalendarDays size={11} /> {formatDate(bid.proposed_start_date)} → {formatDate(bid.proposed_end_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            onClick={() => navigate(`/client/projects/${p.id}`)}
                            style={{ ...S.btnSecondary, padding: '8px 14px', fontSize: 12, gap: 4 }}
                          >
                            View Project <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Filter tabs ── */}
            {contracts.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'all',       label: `All (${contracts.length})` },
                  { key: 'pending',   label: `Pending (${stats.pending})` },
                  { key: 'active',    label: `Active (${stats.active})` },
                  { key: 'completed', label: `Completed (${stats.completed})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${filter === tab.key ? COLORS.primary : COLORS.border}`,
                      background: filter === tab.key ? '#F5E6D3' : '#FFF',
                      color: filter === tab.key ? COLORS.primary : COLORS.textMuted,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Contract list ── */}
            {contracts.length === 0 ? (
              <div style={{ background: '#FFF', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: '56px 32px', textAlign: 'center' }}>
                <FileText size={40} color={COLORS.border} style={{ display: 'block', margin: '0 auto 14px' }} />
                <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 6 }}>No contracts yet</div>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 20px' }}>
                  Contracts are generated after you award a bid. Go to a project and award the best bid to get started.
                </p>
                <button onClick={() => navigate('/client/projects')} style={{ ...S.btnPrimary, padding: '10px 20px' }}>
                  View My Projects
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted, fontSize: 13 }}>
                No contracts in this category.
              </div>
            ) : (
              <>
                <SectionHeader title="Contracts" count={filtered.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filtered.map(c => {
                    const mySigned  = !!c.client_signed_at;
                    const theySigned = !!c.contractor_signed_at;
                    const needsSign = !mySigned && c.status === 'pending_signatures';
                    const sc = CONTRACT_STATUS[c.status] || CONTRACT_STATUS.pending_signatures;

                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveContract(c.project_id)}
                        style={{
                          background: '#FFF', borderRadius: 14,
                          border: `1.5px solid ${needsSign ? '#FCD34D' : COLORS.border}`,
                          padding: '16px 20px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 16,
                          transition: 'all 0.15s',
                          boxShadow: needsSign ? '0 0 0 3px #FCD34D33' : 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,10,0,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = needsSign ? '#FCD34D' : COLORS.border; e.currentTarget.style.boxShadow = needsSign ? '0 0 0 3px #FCD34D33' : 'none'; }}
                      >
                        {/* Status icon */}
                        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: sc.color }}>
                          <FileText size={20} />
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.project?.title || 'Unnamed Project'}
                          </div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Building2 size={11} /> {c.contractor?.company_name || c.contractor?.full_name}
                            </span>
                            <span style={{ fontSize: 12, color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CalendarDays size={11} /> {formatDate(c.start_date)} → {formatDate(c.end_date)}
                            </span>
                          </div>
                          {/* Signature status */}
                          {c.status === 'pending_signatures' && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                              <span style={{ fontSize: 11, color: mySigned ? COLORS.success : '#D97706', fontWeight: 600 }}>
                                You: {mySigned ? '✓ Signed' : 'Not signed'}
                              </span>
                              <span style={{ fontSize: 11, color: theySigned ? COLORS.success : COLORS.textMuted, fontWeight: 600 }}>
                                Contractor: {theySigned ? '✓ Signed' : 'Pending'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                          <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.primary }}>{formatCurrency(c.contract_amount)}</div>
                          <StatusChip status={c.status} />
                          {needsSign && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <PenLine size={11} /> Needs your signature
                            </span>
                          )}
                        </div>

                        <ChevronRight size={16} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
