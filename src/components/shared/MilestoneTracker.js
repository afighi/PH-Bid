import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, AlertCircle, Camera, Sparkles, Upload, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { getMilestoneApprovals, respondToMilestone, submitMilestoneForApproval, postProgressUpdate } from '../../services/milestoneService';
import { archieCheckMilestone, archieWriteProgress } from '../../services/archieService';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeQuery } from '../../hooks/useSupabaseRealtime';

const C = { brown: '#7A3E0F', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E', successLight: '#D1FAE5', danger: '#DC2626', dangerLight: '#FEE2E2' };
const S = { fontFamily: "'Inter', system-ui, sans-serif" };

const statusConfig = {
  pending:          { label: 'Awaiting Submission', color: C.muted,   bg: '#F5ECE0', icon: <Clock size={14} /> },
  submitted:        { label: 'Submitted for Review', color: C.amber,  bg: '#FEF3C7', icon: <Clock size={14} /> },
  approved:         { label: 'Approved',             color: C.success, bg: C.successLight, icon: <CheckCircle2 size={14} /> },
  disputed:         { label: 'Under Dispute',        color: C.danger,  bg: C.dangerLight, icon: <AlertCircle size={14} /> },
  request_more_info:{ label: 'More Info Requested',  color: C.amber,   bg: '#FEF3C7', icon: <AlertCircle size={14} /> },
};

export default function MilestoneTracker({ contract, project }) {
  const { profile } = useAuthStore();
  const isClient     = profile?.role === 'client';
  const isContractor = profile?.role === 'contractor';

  const milestones   = contract?.payment_schedule || [];
  const [approvals, setApprovals] = useState([]);
  const [expanded,  setExpanded]  = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Update submission form state
  const [updateForm, setUpdateForm]   = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [aiDrafting,  setAiDrafting]  = useState({});

  // Approval state
  const [approving,    setApproving]    = useState({});
  const [aiChecking,   setAiChecking]   = useState({});
  const [aiResult,     setAiResult]     = useState({});
  const [clientNotes,  setClientNotes]  = useState({});

  const load = useCallback(async () => {
    if (!contract?.id) return;
    setLoading(true);
    const data = await getMilestoneApprovals(contract.id);
    setApprovals(data);
    setLoading(false);
  }, [contract?.id]);

  useEffect(() => { load(); }, [load]);
  useRealtimeQuery(['milestone_approvals', 'progress_updates'], load,
    contract?.id ? `contract_id=eq.${contract.id}` : null, [contract?.id]);

  function getApproval(milestoneIndex) {
    return approvals.find(a => a.milestone_index === milestoneIndex);
  }

  async function handleAIDraftUpdate(milestoneIdx, milestoneName) {
    setAiDrafting(d => ({ ...d, [milestoneIdx]: true }));
    try {
      const draft = await archieWriteProgress(
        milestoneName,
        updateForm[milestoneIdx]?.update_description || '',
        updateForm[milestoneIdx]?.photos?.length || 0
      );
      setUpdateForm(f => ({ ...f, [milestoneIdx]: { ...f[milestoneIdx], update_description: draft } }));
    } finally { setAiDrafting(d => ({ ...d, [milestoneIdx]: false })); }
  }

  async function handleSubmitUpdate(milestoneIdx, milestone) {
    const form = updateForm[milestoneIdx] || {};
    if (!form.update_title?.trim() || !form.update_description?.trim()) return;
    setSubmitting(true);
    try {
      const update = await postProgressUpdate(contract.id, contract.project_id, profile.id, {
        milestone_name: milestone.name,
        percentage_complete: form.percentage_complete || milestone.percentage,
        update_title: form.update_title,
        update_description: form.update_description,
        photo_urls: form.photo_urls || [],
      });
      await submitMilestoneForApproval(contract.id, contract.project_id, milestoneIdx, milestone.name, update.id);
      await load();
      setUpdateForm(f => ({ ...f, [milestoneIdx]: {} }));
    } finally { setSubmitting(false); }
  }

  async function handleAICheck(milestoneIdx, milestone, approval) {
    setAiChecking(d => ({ ...d, [milestoneIdx]: true }));
    try {
      const raw = await archieCheckMilestone(contract, milestone, approval?.progress_update);
      const result = JSON.parse(raw);
      setAiResult(r => ({ ...r, [milestoneIdx]: result }));
    } catch { /* ignore parse error */ }
    finally { setAiChecking(d => ({ ...d, [milestoneIdx]: false })); }
  }

  async function handleApprove(milestoneIdx, approvalId, status) {
    setApproving(a => ({ ...a, [milestoneIdx]: true }));
    try {
      const result = aiResult[milestoneIdx];
      await respondToMilestone(approvalId, profile.id, status, result?.checklist || null, clientNotes[milestoneIdx] || '');
      await load();
    } finally { setApproving(a => ({ ...a, [milestoneIdx]: false })); }
  }

  if (!milestones.length) {
    return (
      <div style={{ ...S, padding: 32, textAlign: 'center', color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14 }}>
        <Clock size={28} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
        No milestones defined in this contract yet.
      </div>
    );
  }

  const totalPaid = approvals.filter(a => a.status === 'approved').reduce((sum, a) => {
    const m = milestones[a.milestone_index];
    return sum + (m ? (Number(contract.contract_amount) * (m.percentage / 100)) : 0);
  }, 0);

  return (
    <div style={{ ...S }}>
      {/* Progress summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Contract</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>₱{Number(contract.contract_amount).toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: C.successLight, border: `1px solid ${C.success}33`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: C.success, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Released</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.success }}>₱{Math.round(totalPaid).toLocaleString()}</div>
        </div>
        <div style={{ flex: 1, background: '#FEF3C7', border: '1px solid #F59E0B33', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Remaining</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#92400E' }}>₱{Math.round(Number(contract.contract_amount) - totalPaid).toLocaleString()}</div>
        </div>
      </div>

      {/* Milestone list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {milestones.map((milestone, idx) => {
          const approval     = getApproval(idx);
          const milestoneAmt = Number(contract.contract_amount) * ((milestone.percentage || 0) / 100);
          const status       = approval?.status || 'pending';
          const cfg          = statusConfig[status] || statusConfig.pending;
          const isOpen       = expanded === idx;
          const ai           = aiResult[idx];

          return (
            <div key={idx} style={{ background: C.surface, border: `1.5px solid ${status === 'approved' ? C.success : status === 'disputed' ? C.danger : C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              {/* Milestone header */}
              <div
                onClick={() => setExpanded(isOpen ? null : idx)}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: status === 'approved' ? `${C.successLight}66` : C.surface }}
              >
                {/* Status icon */}
                <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                  {cfg.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{milestone.name}</span>
                    <span style={{ fontSize: 11, background: cfg.bg, color: cfg.color, padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{milestone.description || `Day ${milestone.days_from_start || '?'} from start`}</div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: status === 'approved' ? C.success : C.text }}>₱{Math.round(milestoneAmt).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{milestone.percentage}% of contract</div>
                </div>

                {isOpen ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${C.border}` }}>

                  {/* Contractor: submit progress update */}
                  {isContractor && status !== 'approved' && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Upload size={14} color={C.brown} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Submit Milestone Update</span>
                        <button
                          onClick={() => handleAIDraftUpdate(idx, milestone.name)}
                          disabled={aiDrafting[idx]}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FFF8F0', border: `1px solid ${C.amber}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: C.amber, cursor: 'pointer', marginLeft: 'auto' }}
                        >
                          <Sparkles size={11} />{aiDrafting[idx] ? 'Drafting…' : 'Archie draft'}
                        </button>
                      </div>
                      <input
                        placeholder="Update title (e.g. Foundation pouring complete)"
                        value={updateForm[idx]?.update_title || ''}
                        onChange={e => setUpdateForm(f => ({ ...f, [idx]: { ...f[idx], update_title: e.target.value } }))}
                        style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 8 }}
                      />
                      <textarea
                        placeholder="Describe what was accomplished in this milestone…"
                        value={updateForm[idx]?.update_description || ''}
                        onChange={e => setUpdateForm(f => ({ ...f, [idx]: { ...f[idx], update_description: e.target.value } }))}
                        rows={3}
                        style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 8 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Camera size={14} color={C.muted} />
                        <span style={{ fontSize: 12, color: C.muted }}>Photo uploads: attach proofs (future: Firebase Storage integration)</span>
                        <button
                          onClick={() => handleSubmitUpdate(idx, milestone)}
                          disabled={submitting || !updateForm[idx]?.update_title?.trim()}
                          style={{ marginLeft: 'auto', background: C.brown, color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {submitting ? 'Submitting…' : 'Submit for Approval'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress update detail */}
                  {approval?.progress_update && (
                    <div style={{ marginTop: 16, background: '#FFFBF5', border: `1px solid ${C.amber}33`, borderRadius: 12, padding: '14px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, display: 'block', marginBottom: 6 }}>Contractor's Update</span>
                      <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: C.text }}>{approval.progress_update.update_title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{approval.progress_update.update_description}</p>
                      {approval.progress_update.percentage_complete && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                            <div style={{ width: `${approval.progress_update.percentage_complete}%`, height: '100%', background: C.brown, borderRadius: 3, transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.brown }}>{approval.progress_update.percentage_complete}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Client: Archie check + approve/dispute */}
                  {isClient && approval && approval.status === 'pending' && (
                    <div style={{ marginTop: 16 }}>
                      {!ai && (
                        <button
                          onClick={() => handleAICheck(idx, milestone, approval)}
                          disabled={aiChecking[idx]}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF8F0', border: `1.5px solid ${C.amber}`, borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, color: C.amber, cursor: 'pointer', width: '100%', justifyContent: 'center', marginBottom: 12 }}
                        >
                          <Sparkles size={15} />{aiChecking[idx] ? 'Archie is reviewing…' : 'Ask Archie to review this milestone'}
                        </button>
                      )}

                      {ai && (
                        <div style={{ background: ai.verdict === 'approve' ? C.successLight : '#FEF3C7', border: `1px solid ${ai.verdict === 'approve' ? C.success+'33' : '#F59E0B33'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Sparkles size={13} color={ai.verdict === 'approve' ? C.success : C.amber} />
                            <span style={{ fontWeight: 700, fontSize: 13, color: ai.verdict === 'approve' ? C.success : '#92400E' }}>
                              Archie's Verdict: {ai.verdict === 'approve' ? '✓ Ready to Approve' : ai.verdict === 'request_more_info' ? 'More Info Needed' : 'Dispute Recommended'}
                            </span>
                            <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>Confidence: {ai.confidence}%</span>
                          </div>
                          {ai.checklist?.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
                              <span style={{ color: item.status === 'pass' ? C.success : item.status === 'fail' ? C.danger : C.amber }}>
                                {item.status === 'pass' ? '✓' : item.status === 'fail' ? '✗' : '?'}
                              </span>
                              <span style={{ color: C.text }}>{item.item}</span>
                            </div>
                          ))}
                          {ai.payment_recommendation && (
                            <div style={{ marginTop: 8, fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <DollarSign size={12} />{ai.payment_recommendation}
                            </div>
                          )}
                        </div>
                      )}

                      <textarea
                        placeholder="Optional notes for the contractor…"
                        value={clientNotes[idx] || ''}
                        onChange={e => setClientNotes(n => ({ ...n, [idx]: e.target.value }))}
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: 10 }}
                      />
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleApprove(idx, approval.id, 'disputed')}
                          disabled={approving[idx]}
                          style={{ flex: 1, padding: '10px', background: C.dangerLight, color: C.danger, border: `1px solid ${C.danger}33`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          Dispute
                        </button>
                        <button
                          onClick={() => handleApprove(idx, approval.id, 'request_more_info')}
                          disabled={approving[idx]}
                          style={{ flex: 1, padding: '10px', background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B33', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          Request More Info
                        </button>
                        <button
                          onClick={() => handleApprove(idx, approval.id, 'approved')}
                          disabled={approving[idx]}
                          style={{ flex: 1, padding: '10px', background: C.success, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                        >
                          {approving[idx] ? 'Approving…' : '✓ Approve & Release Payment'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Approved status */}
                  {approval?.status === 'approved' && (
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.success, fontSize: 13, fontWeight: 600 }}>
                      <CheckCircle2 size={16} />
                      Approved on {new Date(approval.approved_at).toLocaleDateString('en-PH')} · ₱{Math.round(milestoneAmt).toLocaleString()} released
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
