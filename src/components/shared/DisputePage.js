import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getDisputesForUser, raiseDispute } from '../../services/disputeService';
import { supabase } from '../../config/supabase';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS } from '../../theme';
import { formatDate } from '../../utils/formatters';
import { AlertTriangle, Plus, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';

function StatusChip({ status }) {
  const map = {
    open:         { label: 'Open',         color: COLORS.danger,   bg: COLORS.dangerLight  },
    under_review: { label: 'Under Review', color: COLORS.warning,  bg: COLORS.warningLight },
    resolved:     { label: 'Resolved',     color: COLORS.success,  bg: COLORS.successLight },
    dismissed:    { label: 'Dismissed',    color: COLORS.textMuted,bg: COLORS.gray100      },
  };
  const s = map[status] || map.open;
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>;
}

function DisputeCard({ dispute, userId }) {
  const [open, setOpen] = useState(false);
  const isRaiser = dispute.raised_by === userId;
  const other    = isRaiser ? dispute.against_profile : dispute.raised_by_profile;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${COLORS.border}`, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>{dispute.title}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            {dispute.project?.title} · {isRaiser ? 'You filed against ' : 'Filed against you by '}
            <strong>{other?.company_name || other?.full_name}</strong> · {formatDate(dispute.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <StatusChip status={dispute.status} />
          {open ? <ChevronUp size={14} color={COLORS.textMuted} /> : <ChevronDown size={14} color={COLORS.textMuted} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</div>
            <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, margin: '0 0 16px', background: COLORS.gray50, padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
              {dispute.description}
            </p>

            {dispute.resolution && (
              <div style={{ background: COLORS.successLight, border: `1px solid ${COLORS.success}44`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.success, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Resolution</div>
                <p style={{ fontSize: 13, color: COLORS.text, margin: 0, lineHeight: 1.7 }}>{dispute.resolution}</p>
                {dispute.resolved_at && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Resolved {formatDate(dispute.resolved_at)}</div>}
              </div>
            )}

            {dispute.evidence_urls?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Evidence</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {dispute.evidence_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: COLORS.primary, background: COLORS.primaryLight, padding: '5px 12px', borderRadius: 20, textDecoration: 'none' }}>
                      <FileText size={12} /> File {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RaiseDisputeModal({ userId, role, onClose, onSuccess }) {
  const [form,     setForm]    = useState({ projectId: '', title: '', description: '' });
  const [projects, setProjects] = useState([]);
  const [otherParty, setOtherParty] = useState(null);
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState('');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const col = role === 'client' ? 'client_id' : 'contractor_id';
    supabase
      .from('projects')
      .select('id, title, client_id, awarded_bid_id, status')
      .eq(col, userId)
      .in('status', ['awarded', 'in_progress', 'completed'])
      .then(({ data }) => setProjects(data || []));
  }, [userId, role]);

  useEffect(() => {
    if (!form.projectId) { setOtherParty(null); return; }
    const proj = projects.find(p => p.id === form.projectId);
    if (!proj) return;
    if (role === 'client') {
      supabase.from('bids').select('contractor_id, contractor:profiles!contractor_id(full_name, company_name)')
        .eq('id', proj.awarded_bid_id).maybeSingle()
        .then(({ data }) => setOtherParty(data ? { id: data.contractor_id, name: data.contractor?.company_name || data.contractor?.full_name } : null));
    } else {
      supabase.from('profiles').select('id, full_name, company_name').eq('id', proj.client_id).single()
        .then(({ data }) => setOtherParty(data ? { id: data.id, name: data.company_name || data.full_name } : null));
    }
  }, [form.projectId, projects, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.projectId || !otherParty) {
      setError('Please select a project and fill in all fields.'); return;
    }
    setSaving(true); setError('');
    try {
      await raiseDispute({ projectId: form.projectId, raisedBy: userId, against: otherParty.id, title: form.title, description: form.description });
      onSuccess();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const selectStyle = { width: '100%', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' };
  const inputStyle  = { width: '100%', boxSizing: 'border-box', border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: COLORS.text, outline: 'none', fontFamily: 'inherit' };
  const Label = ({ t }) => <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{t}</div>;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.gray50 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color={COLORS.danger} /> File a Dispute
          </div>
          <button onClick={onClose} style={{ background: 'none', border: `1px solid ${COLORS.border}`, borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 22 }}>
          <div style={{ marginBottom: 14 }}>
            <Label t="Project *" />
            <select value={form.projectId} onChange={e => setF('projectId', e.target.value)} style={selectStyle}>
              <option value="">Select a project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            {projects.length === 0 && <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>No awarded/active projects found.</div>}
          </div>

          {otherParty && (
            <div style={{ background: COLORS.gray50, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
              Against: <strong style={{ color: COLORS.text }}>{otherParty.name}</strong>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <Label t="Dispute Title *" />
            <input type="text" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Brief subject of the dispute" style={inputStyle}
              onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Label t="Description *" />
            <textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Explain the issue in detail…" rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = COLORS.primary} onBlur={e => e.target.style.borderColor = COLORS.border} />
          </div>

          {error && <div style={{ background: COLORS.dangerLight, color: COLORS.danger, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: COLORS.gray100, color: COLORS.textMuted, border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, background: COLORS.danger, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Filing…' : 'File Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DisputePage() {
  const { profile } = useAuthStore();
  const [showModal, setShowModal] = useState(false);

  const { data: disputes, loading } = useSupabaseRealtime(
    'disputes',
    () => getDisputesForUser(profile.id),
    null,
    [profile?.id]
  );

  return (
    <DashboardLayout title="Disputes">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>Disputes</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>File and track disputes with other parties.</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.danger, color: '#fff', border: 'none', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={15} /> File Dispute
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: COLORS.textMuted }}>Loading…</div>
      ) : disputes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${COLORS.border}`, padding: '56px 32px', textAlign: 'center' }}>
          <AlertTriangle size={40} color={COLORS.border} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text, marginBottom: 6 }}>No disputes</div>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>You have no active or past disputes. Hopefully it stays that way!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {disputes.map(d => <DisputeCard key={d.id} dispute={d} userId={profile.id} />)}
        </div>
      )}

      {showModal && (
        <RaiseDisputeModal
          userId={profile.id}
          role={profile.role}
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
