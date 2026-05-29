import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import { getOrCreateReferralCode, getMyReferrals, sendReferralInvite } from '../../services/referralService';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS } from '../../theme';
import { formatDate } from '../../utils/formatters';
import { Users, Copy, Check, Mail, Send } from 'lucide-react';

function StatusChip({ status }) {
  const map = {
    pending:   { label: 'Invited',   color: COLORS.textMuted, bg: COLORS.gray100      },
    signed_up: { label: 'Signed Up', color: COLORS.success,   bg: COLORS.successLight },
    active:    { label: 'Active',    color: COLORS.primary,   bg: COLORS.primaryLight },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>;
}

export default function ReferralPage() {
  const { profile } = useAuthStore();
  const [code,    setCode]    = useState('');
  const [copied,  setCopied]  = useState(false);
  const [email,   setEmail]   = useState('');
  const [sending, setSending] = useState(false);
  const [msg,     setMsg]     = useState('');
  const [error,   setError]   = useState('');

  const { data: referrals } = useSupabaseRealtime(
    'referrals',
    () => getMyReferrals(profile.id),
    `referrer_id=eq.${profile.id}`,
    [profile?.id]
  );

  useEffect(() => {
    if (profile?.id) {
      getOrCreateReferralCode(profile.id).then(setCode);
    }
  }, [profile?.id]);

  const referralLink = code ? `${window.location.origin}/signup?ref=${code}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMsg('');
    setError('');
    try {
      await sendReferralInvite(profile.id, email.trim(), code);
      setMsg(`Invite recorded for ${email.trim()}. Share the link below with them!`);
      setEmail('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const signedUp = referrals.filter(r => r.status !== 'pending').length;

  return (
    <DashboardLayout title="Refer & Earn">
      <div style={{ maxWidth: 700 }}>
        {/* Hero card */}
        <div style={{ background: 'linear-gradient(110deg, #3D1500, #7B3F00)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Users size={22} />
            <span style={{ fontWeight: 800, fontSize: 18 }}>Refer & Grow</span>
          </div>
          <p style={{ fontSize: 14, opacity: 0.85, margin: '0 0 20px', lineHeight: 1.7 }}>
            Invite contractors or clients to BuildBid PH. Every person who signs up using your link helps grow our community.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Total Invites', value: referrals.length },
              { label: 'Signed Up',     value: signedUp },
              { label: 'Pending',       value: referrals.length - signedUp },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 2 }}>{value}</div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Your link */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${COLORS.border}`, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Your Referral Link</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, background: COLORS.gray50, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink || 'Generating…'}
            </div>
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: copied ? COLORS.successLight : COLORS.primary, color: copied ? COLORS.success : '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
            >
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textMuted }}>
            Code: <strong style={{ color: COLORS.primary }}>{code || '…'}</strong>
          </div>
        </div>

        {/* Send invite */}
        <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${COLORS.border}`, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Track an Invite by Email</div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, border: `1.5px solid ${COLORS.border}`, borderRadius: 10, padding: '0 14px', background: COLORS.gray50 }}>
              <Mail size={14} color={COLORS.textMuted} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="colleague@email.com"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: COLORS.text, background: 'transparent', padding: '10px 0', fontFamily: 'inherit' }}
              />
            </div>
            <button type="submit" disabled={sending || !email.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: sending || !email.trim() ? 0.6 : 1 }}>
              <Send size={13} /> {sending ? 'Saving…' : 'Track'}
            </button>
          </form>
          {msg   && <div style={{ marginTop: 10, background: COLORS.successLight, color: COLORS.success,   borderRadius: 10, padding: '9px 14px', fontSize: 13 }}>{msg}</div>}
          {error && <div style={{ marginTop: 10, background: COLORS.dangerLight,  color: COLORS.danger,    borderRadius: 10, padding: '9px 14px', fontSize: 13 }}>{error}</div>}
        </div>

        {/* Referral list */}
        {referrals.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${COLORS.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: 14, color: COLORS.text, background: COLORS.gray50 }}>
              Your Invites
            </div>
            {referrals.map(r => (
              <div key={r.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>
                    {r.referred?.full_name || r.referred_email}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    Invited {formatDate(r.created_at)}
                    {r.completed_at && ` · Joined ${formatDate(r.completed_at)}`}
                  </div>
                </div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
