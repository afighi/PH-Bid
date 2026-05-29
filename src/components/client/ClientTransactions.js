import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import StatusBadge from '../shared/StatusBadge';
import { useAuthStore } from '../../stores/authStore';
import { getTransactions, createPendingTransaction, confirmPaymongoTransaction, releasePayment } from '../../services/transactionService';
import { createPaymentLink, getPaymentLinkStatus } from '../../services/paymongoService';
import { getPayableProjects } from '../../services/projectService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { TRANSACTION_TYPES } from '../../utils/constants';
import { COLORS, S } from '../../theme';
import { CreditCard, FileEdit, Lightbulb, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

const TABS = ['paymongo', 'manual'];

export default function ClientTransactions() {
  const { profile } = useAuthStore();

  const [txns,           setTxns]           = useState([]);
  const [payableProjects, setPayableProjects] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showForm,       setShowForm]       = useState(false);
  const [activeTab,      setActiveTab]      = useState('paymongo');
  const [error,          setError]          = useState('');
  const [submitting,     setSubmitting]     = useState(false);

  // PayMongo flow state
  const [pmStep, setPmStep] = useState('form'); // 'form' | 'waiting' | 'verifying'
  const [pmLink, setPmLink] = useState(null);
  const [pmTxId, setPmTxId] = useState(null);

  const [pmForm, setPmForm] = useState({
    projectId: '', amount: '', transactionType: 'milestone_payment',
    milestoneName: '', notes: '',
  });

  // Manual payment form state
  const [manForm, setManForm] = useState({
    projectId: '', amount: '', transactionType: 'milestone_payment',
    milestoneName: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '',
  });

  const fetchData = useCallback(() => {
    if (!profile) return;
    Promise.all([
      getTransactions(profile.id, 'client'),
      getPayableProjects(profile.id),
    ]).then(([txData, projects]) => {
      setTxns(txData);
      setPayableProjects(projects);
      setLoading(false);
    });
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeQuery('transactions', fetchData, profile?.id ? `sender_id=eq.${profile.id}` : null, [profile?.id]);

  // Derive contractor info from the selected project — no UID exposed to user
  const selectedProject = payableProjects.find((p) => p.id === pmForm.projectId);
  const selectedContractor = selectedProject?.awarded_bid?.contractor;
  const selectedContractorId = selectedProject?.awarded_bid?.contractor_id;

  const selectedManProject = payableProjects.find((p) => p.id === manForm.projectId);
  const selectedManContractor = selectedManProject?.awarded_bid?.contractor;
  const selectedManContractorId = selectedManProject?.awarded_bid?.contractor_id;

  const totals = {
    paid:    txns.filter((t) => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0),
    pending: txns.filter((t) => t.status === 'pending').reduce((s, t)  => s + Number(t.amount), 0),
  };

  // ── STEP 1: Create PayMongo link and open checkout ──────────────
  const handleCreatePaymongoLink = async () => {
    if (!pmForm.projectId) { setError('Please select a project.'); return; }
    if (!pmForm.amount)    { setError('Please enter an amount.'); return; }
    if (!selectedContractorId) { setError('No awarded contractor found for this project.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const contractorName = selectedContractor?.company_name || selectedContractor?.full_name || '';
      const desc = pmForm.milestoneName
        ? `BuildBid PH — ${pmForm.milestoneName}`
        : `BuildBid PH Payment to ${contractorName}`;

      const link = await createPaymentLink({
        amount:      Number(pmForm.amount),
        description: desc,
        remarks:     selectedProject?.title || '',
      });

      // Save pending transaction — contractor ID resolved server-side, never shown to client
      const tx = await createPendingTransaction({
        projectId:       pmForm.projectId,
        senderId:        profile.id,
        receiverId:      selectedContractorId,
        amount:          Number(pmForm.amount),
        transactionType: pmForm.transactionType,
        milestoneName:   pmForm.milestoneName,
        paymongoLinkId:  link.id,
        notes:           pmForm.notes,
      });

      setPmLink(link);
      setPmTxId(tx.id);
      setTxns((prev) => [tx, ...prev]);
      setPmStep('waiting');

      // Open PayMongo checkout in new tab
      window.open(link.attributes.checkout_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── STEP 2: Client clicks "I've Paid" → verify with PayMongo ───
  const handleVerifyPayment = async () => {
    setError('');
    setSubmitting(true);
    setPmStep('verifying');
    try {
      const status = await getPaymentLinkStatus(pmLink.id);

      if (status === 'paid') {
        const updated = await confirmPaymongoTransaction(
          pmTxId, selectedContractorId, pmForm.projectId,
          Number(pmForm.amount), pmForm.milestoneName, pmForm.transactionType,
        );
        setTxns((prev) => prev.map((t) => t.id === pmTxId ? updated : t));
        // Refresh payable projects — final payment may have closed this project
        getPayableProjects(profile.id).then(setPayableProjects);
        resetForm();
        alert('Payment confirmed! The contractor has been notified.');
      } else if (status === 'expired') {
        setError('This payment link has expired. Please create a new payment.');
        setPmStep('form');
      } else {
        setError('Payment not yet received. Please complete the payment on the PayMongo page and try again.');
        setPmStep('waiting');
      }
    } catch (err) {
      setError(err.message);
      setPmStep('waiting');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Manual payment release ──────────────────────────────────────
  const handleManualRelease = async () => {
    if (!manForm.projectId)      { setError('Please select a project.'); return; }
    if (!manForm.amount)         { setError('Please enter an amount.'); return; }
    if (!manForm.paymentMethod)  { setError('Please select a payment method.'); return; }
    if (!selectedManContractorId){ setError('No awarded contractor found for this project.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const newTx = await releasePayment({
        projectId:       manForm.projectId,
        receiverId:      selectedManContractorId,
        senderId:        profile.id,
        amount:          Number(manForm.amount),
        transactionType: manForm.transactionType,
        milestoneName:   manForm.milestoneName,
        paymentMethod:   manForm.paymentMethod,
        referenceNumber: manForm.referenceNumber,
        notes:           manForm.notes,
      });
      setTxns((prev) => [newTx, ...prev]);
      // Refresh payable projects — final payment may have closed this project
      getPayableProjects(profile.id).then(setPayableProjects);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setPmStep('form');
    setPmLink(null);
    setPmTxId(null);
    setError('');
    setPmForm({ projectId: '', amount: '', transactionType: 'milestone_payment', milestoneName: '', notes: '' });
    setManForm({ projectId: '', amount: '', transactionType: 'milestone_payment', milestoneName: '', paymentMethod: 'bank_transfer', referenceNumber: '', notes: '' });
  };

  return (
    <DashboardLayout title="Payments">

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div style={{ ...S.clientCard, borderLeft: `4px solid ${COLORS.danger}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>TOTAL RELEASED</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.danger, margin: 0 }}>{formatCurrency(totals.paid)}</p>
        </div>
        <div style={{ ...S.clientCard, borderLeft: `4px solid ${COLORS.warning}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>PENDING</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.warning, margin: 0 }}>{formatCurrency(totals.pending)}</p>
        </div>
        <div style={{ ...S.clientCard, borderLeft: `4px solid ${COLORS.primary}` }}>
          <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 600 }}>TRANSACTIONS</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: COLORS.primary, margin: 0 }}>{txns.length}</p>
        </div>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div style={{ ...S.clientCard, marginBottom: 24, border: `1.5px solid ${COLORS.primary}` }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${COLORS.border}` }}>
            {[
              { key: 'paymongo', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} /> Pay via PayMongo</span>, sublabel: 'GCash · Maya · Card' },
              { key: 'manual',   label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileEdit size={16} /> Manual / Bank Transfer</span>, sublabel: 'Record external payment' },
            ].map(({ key, label, sublabel }) => (
              <button key={key} onClick={() => { setActiveTab(key); setError(''); setPmStep('form'); }}
                style={{
                  flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer', background: 'none',
                  borderBottom: activeTab === key ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                  marginBottom: -2, textAlign: 'center',
                }}>
                <p style={{ fontWeight: activeTab === key ? 700 : 500, fontSize: 14, color: activeTab === key ? COLORS.primary : COLORS.textMuted, margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 11, color: COLORS.textLight, margin: 0 }}>{sublabel}</p>
              </button>
            ))}
          </div>

          {error && <div style={S.alertError}>{error}</div>}

          {/* ── PAYMONGO TAB ── */}
          {activeTab === 'paymongo' && (
            <>
              {/* Step 1: Form */}
              {pmStep === 'form' && (
                <>
                  <div style={{
                    backgroundColor: `${COLORS.primaryLight}22`, border: `1px solid ${COLORS.primaryLight}`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: COLORS.darkBlue,
                  }}>
                    <Lightbulb size={16} color={COLORS.warning} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> <strong>How it works:</strong> Select your project → fill in the amount → click <em>Generate Payment Link</em> → pay via GCash, Maya, or card → come back and click <em>I've Paid</em> to confirm. Max ₱100,000 per link — split large contracts into milestones.
                  </div>

                  {payableProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted }}>
                      <p style={{ margin: 0 }}>No awarded or in-progress projects found. Payments can only be made to contractors you have awarded a project to.</p>
                    </div>
                  ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
                      <label style={S.label}>Project *</label>
                      <select style={S.input} value={pmForm.projectId}
                        onChange={(e) => setPmForm({ ...pmForm, projectId: e.target.value })}>
                        <option value="">— Select a project —</option>
                        {payableProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.title} ({p.status.replace('_', ' ')})</option>
                        ))}
                      </select>
                    </div>

                    {/* Show the awarded contractor name — read-only, no UID */}
                    {selectedContractor && (
                      <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
                        <label style={S.label}>Paying To</label>
                        <div style={{
                          ...S.input, backgroundColor: COLORS.gray50,
                          color: COLORS.text, fontWeight: 600, cursor: 'default',
                        }}>
                          {selectedContractor.company_name || selectedContractor.full_name}
                        </div>
                      </div>
                    )}

                    <div style={S.formGroup}>
                      <label style={S.label}>Amount (PHP) *</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontWeight: 700 }}>₱</span>
                        <input style={{ ...S.input, paddingLeft: 26 }} type="number" value={pmForm.amount}
                          onChange={(e) => setPmForm({ ...pmForm, amount: e.target.value })}
                          placeholder="50000" min="100" max="100000" />
                      </div>
                      <p style={{ fontSize: 11, color: COLORS.textLight, margin: '4px 0 0' }}>Min ₱100 · Max ₱100,000</p>
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Payment Type *</label>
                      <select style={S.input} value={pmForm.transactionType}
                        onChange={(e) => setPmForm({ ...pmForm, transactionType: e.target.value })}>
                        {Object.entries(TRANSACTION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Milestone Name</label>
                      <input style={S.input} value={pmForm.milestoneName}
                        onChange={(e) => setPmForm({ ...pmForm, milestoneName: e.target.value })}
                        placeholder="e.g. Foundation completion" />
                    </div>
                    <div style={S.formGroup}>
                      <label style={S.label}>Notes</label>
                      <input style={S.input} value={pmForm.notes}
                        onChange={(e) => setPmForm({ ...pmForm, notes: e.target.value })}
                        placeholder="Any additional notes" />
                    </div>
                  </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={resetForm} style={{ ...S.clientBtnSecondary, flex: 1, justifyContent: 'center' }}>Cancel</button>
                    {payableProjects.length > 0 && (
                      <button onClick={handleCreatePaymongoLink} disabled={submitting}
                        style={{ ...S.clientBtnPrimary, flex: 2, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                        {submitting ? 'Creating link...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> Generate Payment Link</span>}
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Waiting for payment */}
              {(pmStep === 'waiting' || pmStep === 'verifying') && pmLink && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div style={{ marginBottom: 12 }}><CreditCard size={48} color={COLORS.textLight} /></div>
                  <h3 style={{ ...S.h3, marginBottom: 8 }}>Complete your payment</h3>
                  <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>
                    A PayMongo payment page was opened in a new tab.<br />
                    Pay <strong style={{ color: COLORS.primary }}>{formatCurrency(Number(pmForm.amount))}</strong> via GCash, Maya, or card.
                  </p>

                  {/* Payment link reference */}
                  <div style={{
                    backgroundColor: COLORS.gray50, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '10px 16px', marginBottom: 20,
                    display: 'inline-block', textAlign: 'left',
                  }}>
                    <p style={{ fontSize: 11, color: COLORS.textMuted, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase' }}>Payment Link ID</p>
                    <p style={{ fontSize: 13, fontFamily: 'monospace', color: COLORS.text, margin: 0 }}>{pmLink.id}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => window.open(pmLink.attributes.checkout_url, '_blank', 'noopener,noreferrer')}
                      style={{ ...S.clientBtnSecondary, padding: '10px 20px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkIcon size={14} /> Reopen Payment Page</span>
                    </button>
                    <button onClick={handleVerifyPayment} disabled={submitting}
                      style={{ ...S.btnSuccess, padding: '10px 24px', opacity: submitting ? 0.7 : 1 }}>
                      {pmStep === 'verifying' ? 'Verifying...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} /> I've Paid — Confirm</span>}
                    </button>
                  </div>
                  <button onClick={resetForm} style={{ background: 'none', border: 'none', color: COLORS.textMuted, fontSize: 13, cursor: 'pointer', marginTop: 16 }}>
                    Cancel this payment
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── MANUAL TAB ── */}
          {activeTab === 'manual' && (
            <>
              {payableProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: COLORS.textMuted }}>
                  <p style={{ margin: 0 }}>No awarded or in-progress projects found. Payments can only be made to contractors you have awarded a project to.</p>
                </div>
              ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
                  <label style={S.label}>Project *</label>
                  <select style={S.input} value={manForm.projectId}
                    onChange={(e) => setManForm({ ...manForm, projectId: e.target.value })}>
                    <option value="">— Select a project —</option>
                    {payableProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title} ({p.status.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>

                {selectedManContractor && (
                  <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
                    <label style={S.label}>Paying To</label>
                    <div style={{ ...S.input, backgroundColor: COLORS.gray50, color: COLORS.text, fontWeight: 600, cursor: 'default' }}>
                      {selectedManContractor.company_name || selectedManContractor.full_name}
                    </div>
                  </div>
                )}

                <div style={S.formGroup}>
                  <label style={S.label}>Amount (PHP) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, fontWeight: 700 }}>₱</span>
                    <input style={{ ...S.input, paddingLeft: 26 }} type="number" value={manForm.amount}
                      onChange={(e) => setManForm({ ...manForm, amount: e.target.value })} placeholder="250000" />
                  </div>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Payment Type *</label>
                  <select style={S.input} value={manForm.transactionType}
                    onChange={(e) => setManForm({ ...manForm, transactionType: e.target.value })}>
                    {Object.entries(TRANSACTION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Milestone Name</label>
                  <input style={S.input} value={manForm.milestoneName}
                    onChange={(e) => setManForm({ ...manForm, milestoneName: e.target.value })}
                    placeholder="Foundation completion" />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Payment Method *</label>
                  <select style={S.input} value={manForm.paymentMethod}
                    onChange={(e) => setManForm({ ...manForm, paymentMethod: e.target.value })}>
                    {[
                      { value: 'bank_transfer',  label: 'Bank Transfer' },
                      { value: 'check',          label: 'Check' },
                      { value: 'cash',           label: 'Cash' },
                      { value: 'online_banking', label: 'Online Banking' },
                    ].map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Reference / Check Number</label>
                  <input style={S.input} value={manForm.referenceNumber}
                    onChange={(e) => setManForm({ ...manForm, referenceNumber: e.target.value })}
                    placeholder="Bank ref, check no., etc." />
                </div>
                <div style={{ ...S.formGroup, gridColumn: '1/-1' }}>
                  <label style={S.label}>Notes</label>
                  <textarea style={{ ...S.input, minHeight: 60 }} value={manForm.notes}
                    onChange={(e) => setManForm({ ...manForm, notes: e.target.value })}
                    placeholder="Any additional notes..." />
                </div>
              </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={resetForm} style={{ ...S.clientBtnSecondary, flex: 1, justifyContent: 'center' }}>Cancel</button>
                {payableProjects.length > 0 && (
                  <button onClick={handleManualRelease} disabled={submitting}
                    style={{ ...S.btnSuccess, flex: 2, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? 'Saving...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} /> Confirm Payment Release</span>}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Transactions table */}
      <div style={S.clientCard}>
        <div style={{ ...S.rowBetween, marginBottom: 20 }}>
          <h3 style={S.h3}>Payment History</h3>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={S.clientBtnPrimary}>
              + New Payment
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: COLORS.textMuted }}>Loading...</div>
        ) : txns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ marginBottom: 12 }}><CreditCard size={48} color={COLORS.textLight} /></div>
            <p style={{ color: COLORS.textMuted }}>No payment transactions yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  {['Date', 'Milestone', 'Amount', 'Method', 'Reference', 'Status'].map((h) => (
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
                    <td style={{ padding: '12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, margin: '0 0 2px' }}>{t.milestone_name || '—'}</p>
                      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: 0, textTransform: 'capitalize' }}>
                        {TRANSACTION_TYPES[t.transaction_type] || t.transaction_type}
                      </p>
                    </td>
                    <td style={{ padding: '12px', fontSize: 14, fontWeight: 800, color: COLORS.danger }}>
                      –{formatCurrency(t.amount)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {t.payment_method === 'paymongo' ? (
                        <span style={{ ...S.badgeBlue, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CreditCard size={12} /> PayMongo</span>
                      ) : (
                        <span style={{ fontSize: 13, color: COLORS.textMuted, textTransform: 'capitalize' }}>
                          {t.payment_method?.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: COLORS.textMuted, fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.reference_number || '—'}
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
