import { useState, useEffect, useCallback, useRef } from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { supabase } from '../../config/supabase';
import { logout } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import DashboardLayout from '../layout/DashboardLayout';
import { COLORS, S } from '../../theme';
import {
  Shield, Moon, Sun, ChevronRight, Lock, Eye, EyeOff,
  Save, AlertTriangle, Settings, Bell, User, Download,
  Trash2, LogOut, CheckCircle,
} from 'lucide-react';

// ── Persist helpers ───────────────────────────────────────────────
const LS = {
  get:    (k, def) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : def; } catch { return def; } },
  set:    (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── Apply dark mode to document ───────────────────────────────────
function applyDarkMode(on) {
  const style = document.getElementById('bb-dark-mode');
  if (on) {
    if (!style) {
      const el = document.createElement('style');
      el.id = 'bb-dark-mode';
      el.innerHTML = `
        html { filter: invert(93%) hue-rotate(180deg) !important; }
        html img, html video, html canvas, html [data-no-invert] {
          filter: invert(100%) hue-rotate(180deg) !important;
        }
      `;
      document.head.appendChild(el);
    }
  } else {
    style?.remove();
  }
}

// ── Apply compact mode ────────────────────────────────────────────
function applyCompact(on) {
  document.documentElement.classList.toggle('bb-compact', on);
  let style = document.getElementById('bb-compact-style');
  if (on && !style) {
    style = document.createElement('style');
    style.id = 'bb-compact-style';
    style.innerHTML = `.bb-compact * { font-size: 93% !important; }`;
    document.head.appendChild(style);
  } else if (!on && style) {
    style.remove();
  }
}

// ── Subcomponents ─────────────────────────────────────────────────
function ToggleSwitch({ enabled, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: enabled ? COLORS.success : '#D1D5DB', cursor: 'pointer', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#FFF', position: 'absolute', top: 3, left: enabled ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
    </div>
  );
}

function SettingRow({ title, subtitle, action, hasBorder = true, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: (hasBorder && !children) ? `1px solid ${COLORS.border}` : 'none', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{subtitle}</div>
        </div>
        <div style={{ flexShrink: 0 }}>{action}</div>
      </div>
      {children && <div style={{ borderBottom: hasBorder ? `1px solid ${COLORS.border}` : 'none' }}>{children}</div>}
    </div>
  );
}

function SectionPanel({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: COLORS.text, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{title}</h2>
        <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', border: `1.5px solid ${COLORS.border}`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontWeight: 500, color: COLORS.text,
  backgroundColor: '#FFF', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const selectStyle = {
  border: `1px solid ${COLORS.border}`, borderRadius: 8,
  padding: '8px 32px 8px 14px', fontSize: 13, fontWeight: 600,
  color: COLORS.text, background: '#FFF', cursor: 'pointer', outline: 'none',
};

// ── Password Change (real Firebase) ───────────────────────────────
function PasswordForm({ onClose }) {
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    setError(''); setSuccess('');
    if (!currentPwd || !newPwd || !confirmPwd) { setError('All fields are required.'); return; }
    if (newPwd.length < 8)           { setError('New password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd)        { setError('New passwords do not match.'); return; }
    setSaving(true);
    try {
      const user       = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      setSuccess('Password updated successfully.');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Current password is incorrect.');
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.gray50, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, margin: '0 28px 24px' }}>
      {error   && <div style={{ ...S.alertError,   marginBottom: 14 }}>{error}</div>}
      {success && <div style={{ ...S.alertSuccess, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} />{success}</div>}
      <div style={{ marginBottom: 14 }}>
        <label style={{ ...S.label, marginBottom: 6 }}>Current Password</label>
        <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
          placeholder="Enter current password" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ ...S.label, marginBottom: 6 }}>New Password</label>
        <div style={{ position: 'relative' }}>
          <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)}
            placeholder="Min. 8 characters" style={{ ...inputStyle, paddingRight: 40 }} />
          <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, display: 'flex', alignItems: 'center', padding: 0 }}>
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ ...S.label, marginBottom: 6 }}>Confirm New Password</label>
        <div style={{ position: 'relative' }}>
          <input type={showConfirm ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            placeholder="Re-enter new password" style={{ ...inputStyle, paddingRight: 40 }} />
          <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textMuted, display: 'flex', alignItems: 'center', padding: 0 }}>
            {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Save size={14} />{saving ? 'Saving…' : 'Save Password'}
        </button>
        <button onClick={onClose} style={{ ...S.btnSecondary, fontSize: 13 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'security',      label: 'Security & Privacy',  icon: Shield,   iconColor: '#DC2626', iconBg: '#FEE2E2' },
  { id: 'preferences',   label: 'System Preferences',  icon: Settings, iconColor: COLORS.primary, iconBg: '#F5E6D3' },
  { id: 'notifications', label: 'Notifications',        icon: Bell,     iconColor: '#D97706', iconBg: '#FEF3C7' },
  { id: 'account',       label: 'Account',              icon: User,     iconColor: '#DC2626', iconBg: '#FEE2E2' },
];

export default function SettingsPage() {
  const { profile } = useAuthStore();
  const { isMobile } = useBreakpoint();
  const [activeSection, setActiveSection] = useState('security');

  // ── Security ──────────────────────────────────────────────────
  const [showPwdForm,      setShowPwdForm]      = useState(false);
  const [sessionTimeout,   setSessionTimeout]   = useState(() => LS.get('bb_session_timeout', '240'));
  const [twoFAEnabled,     setTwoFAEnabled]     = useState(() => LS.get('bb_2fa', false));
  const [twoFAMsg,         setTwoFAMsg]         = useState('');

  // ── Preferences ───────────────────────────────────────────────
  const [darkMode,    setDarkMode]    = useState(() => LS.get('bb_dark_mode', false));
  const [compactView, setCompactView] = useState(() => LS.get('bb_compact', false));
  const [language,    setLanguage]    = useState(() => LS.get('bb_language', 'en-PH'));

  // ── Notifications (persisted to Supabase) ─────────────────────
  const [notifSaved,    setNotifSaved]    = useState(false);
  const [emailBids,     setEmailBids]     = useState(() => LS.get('bb_notif_email_bids',    true));
  const [emailPayments, setEmailPayments] = useState(() => LS.get('bb_notif_email_payments', true));
  const [emailMessages, setEmailMessages] = useState(() => LS.get('bb_notif_email_messages', true));
  const [pushBids,      setPushBids]      = useState(() => LS.get('bb_notif_push_bids',     true));
  const [pushPayments,  setPushPayments]  = useState(() => LS.get('bb_notif_push_payments', true));

  // ── Account ───────────────────────────────────────────────────
  const [exportLoading,   setExportLoading]   = useState(false);
  const [exportMsg,       setExportMsg]       = useState('');
  const [deactivateMsg,   setDeactivateMsg]   = useState('');
  const [deactivating,    setDeactivating]    = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState('');

  // ── Apply preferences on mount ────────────────────────────────
  useEffect(() => { applyDarkMode(darkMode); },    [darkMode]);
  useEffect(() => { applyCompact(compactView); },  [compactView]);

  // ── Session idle timeout ──────────────────────────────────────
  const idleTimer = useRef(null);

  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (sessionTimeout === 'never') return;
    idleTimer.current = setTimeout(() => logout(), Number(sessionTimeout) * 60 * 1000);
  }, [sessionTimeout]);

  useEffect(() => {
    LS.set('bb_session_timeout', sessionTimeout);
    const events = ['mousemove', 'keypress', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      clearTimeout(idleTimer.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [resetIdleTimer, sessionTimeout]);

  // ── Toggle helpers that also persist ─────────────────────────
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    LS.set('bb_dark_mode', next);
    applyDarkMode(next);
  };
  const toggleCompact = () => {
    const next = !compactView;
    setCompactView(next);
    LS.set('bb_compact', next);
    applyCompact(next);
  };
  const setLang = (v) => { setLanguage(v); LS.set('bb_language', v); };

  // ── Save notification prefs ───────────────────────────────────
  const saveNotifPrefs = async () => {
    LS.set('bb_notif_email_bids',     emailBids);
    LS.set('bb_notif_email_payments', emailPayments);
    LS.set('bb_notif_email_messages', emailMessages);
    LS.set('bb_notif_push_bids',      pushBids);
    LS.set('bb_notif_push_payments',  pushPayments);
    await supabase.from('profiles').update({
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  // ── Toggle 2FA ────────────────────────────────────────────────
  const toggle2FA = () => {
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    LS.set('bb_2fa', next);
    if (next) {
      setTwoFAMsg('2FA preference saved. For full two-factor setup, use your authenticator app linked to your Firebase account, or contact support@buildbid.ph.');
    } else {
      setTwoFAMsg('2FA has been disabled for this device.');
    }
    setTimeout(() => setTwoFAMsg(''), 6000);
  };

  // ── Export data ───────────────────────────────────────────────
  const handleExport = async () => {
    setExportLoading(true);
    setExportMsg('');
    try {
      const [
        { data: profileData },
        { data: projects },
        { data: bids },
        { data: transactions },
        { data: reviews },
        { data: contracts },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profile.id).single(),
        profile.role === 'client'
          ? supabase.from('projects').select('*').eq('client_id', profile.id)
          : supabase.from('bids').select('*, project:projects(title)').eq('contractor_id', profile.id),
        supabase.from('bids').select('*').eq('contractor_id', profile.id),
        supabase.from('transactions').select('*').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`),
        supabase.from('reviews').select('*').or(`reviewer_id.eq.${profile.id},reviewee_id.eq.${profile.id}`),
        supabase.from('contracts').select('*').or(`client_id.eq.${profile.id},contractor_id.eq.${profile.id}`),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile:     profileData,
        projects:    projects || [],
        bids:        bids || [],
        transactions: transactions || [],
        reviews:     reviews || [],
        contracts:   contracts || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `buildbid-data-${profile.id}-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg('Your data has been downloaded.');
    } catch (e) {
      setExportMsg('Export failed: ' + e.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ── Deactivate ────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate your account? You can reactivate it by contacting support.')) return;
    setDeactivating(true);
    try {
      await supabase.from('profiles').update({ status: 'suspended' }).eq('id', profile.id);
      setDeactivateMsg('Account deactivated. Logging you out…');
      setTimeout(() => logout(), 2000);
    } catch (e) {
      setDeactivateMsg('Failed: ' + e.message);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: isMobile ? 16 : 24, alignItems: 'start' }}>

        {/* ── Left nav ── */}
        {isMobile ? (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none' }}>
            {NAV_SECTIONS.map(({ id, label, icon: Icon, iconColor }) => {
              const active = activeSection === id;
              return (
                <button key={id} onClick={() => setActiveSection(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: `1.5px solid ${active ? COLORS.primary : COLORS.border}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, backgroundColor: active ? `${COLORS.primary}10` : '#fff', transition: 'all 0.15s' }}>
                  <Icon size={13} color={active ? COLORS.primary : COLORS.textMuted} />
                  <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? COLORS.primary : COLORS.textMuted }}>{label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, backgroundColor: '#FFF', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'sticky', top: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px 8px', margin: 0 }}>Settings</p>
            {NAV_SECTIONS.map(({ id, label, icon: Icon, iconColor, iconBg }) => {
              const active = activeSection === id;
              return (
                <button key={id} onClick={() => setActiveSection(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', backgroundColor: active ? `${COLORS.primary}10` : 'transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = COLORS.gray50; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: active ? iconBg : COLORS.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} color={active ? iconColor : COLORS.textMuted} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? COLORS.primary : COLORS.text }}>{label}</span>
                  {active && <ChevronRight size={14} color={COLORS.primary} style={{ marginLeft: 'auto' }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Right content ── */}
        <div style={{ backgroundColor: '#FFF', borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

          {/* ── Security & Privacy ── */}
          {activeSection === 'security' && (
            <SectionPanel title="Security & Privacy" subtitle="Manage your password, authentication, and session settings.">

              {/* Change Password */}
              <SettingRow
                title="Change Password"
                subtitle="Update your password regularly to keep your account secure."
                hasBorder={!showPwdForm}
                action={
                  <button onClick={() => setShowPwdForm(v => !v)} style={{ ...S.btnSecondary, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} /> {showPwdForm ? 'Cancel' : 'Change Password'}
                  </button>
                }
              >
                {showPwdForm && <PasswordForm onClose={() => setShowPwdForm(false)} />}
              </SettingRow>

              {/* 2FA */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: `1px solid ${COLORS.border}`, gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 3 }}>Two-Factor Authentication</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>Add an extra layer of login security to your account.</div>
                  </div>
                  <button onClick={toggle2FA} style={twoFAEnabled
                    ? { backgroundColor: '#F0FDF4', color: COLORS.success, border: `1px solid #86EFAC`, borderRadius: 20, padding: '8px 18px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
                    : { backgroundColor: '#FFF0F0', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 20, padding: '8px 18px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }
                  }>
                    <Shield size={13} />
                    {twoFAEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                {!twoFAEnabled && (
                  <div style={{ padding: '10px 28px 14px', backgroundColor: '#FFF8F8', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={13} color="#DC2626" />
                    <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>Your account is not protected by 2FA. Enable it for better security.</p>
                  </div>
                )}
                {twoFAMsg && (
                  <div style={{ padding: '10px 28px 14px', backgroundColor: COLORS.successLight, borderBottom: `1px solid ${COLORS.border}` }}>
                    <p style={{ fontSize: 12, color: COLORS.success, margin: 0 }}>{twoFAMsg}</p>
                  </div>
                )}
              </div>

              {/* Session Timeout */}
              <SettingRow
                title="Session Timeout"
                subtitle="Automatically log out after a period of inactivity. Applies immediately."
                hasBorder={false}
                action={
                  <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} style={selectStyle}>
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="60">1 Hour</option>
                    <option value="240">4 Hours</option>
                    <option value="480">8 Hours</option>
                    <option value="never">Never</option>
                  </select>
                }
              />
            </SectionPanel>
          )}

          {/* ── System Preferences ── */}
          {activeSection === 'preferences' && (
            <SectionPanel title="System Preferences" subtitle="Customize how BuildBid PH looks and behaves on your device.">

              <SettingRow
                title="Dark Mode"
                subtitle="Switch the interface to a dark colour scheme. Saved to this device."
                action={
                  <button onClick={toggleDark} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 18px', backgroundColor: '#FFF', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                    {darkMode ? <Moon size={15} color="#6366F1" /> : <Sun size={15} color="#F59E0B" />}
                    {darkMode ? 'Dark Mode' : 'Light Mode'}
                  </button>
                }
              />

              <SettingRow
                title="Compact View"
                subtitle="Reduce text size slightly for a denser layout. Saved to this device."
                action={<ToggleSwitch enabled={compactView} onToggle={toggleCompact} />}
              />

              <SettingRow
                title="Language & Region"
                subtitle="Sets the format for dates and numbers. Applied on next page load."
                hasBorder={false}
                action={
                  <select value={language} onChange={e => setLang(e.target.value)} style={selectStyle}>
                    <option value="en-PH">English (Philippines)</option>
                    <option value="en-US">English (US)</option>
                    <option value="fil">Filipino</option>
                  </select>
                }
              />
            </SectionPanel>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <SectionPanel title="Notifications" subtitle="Control which alerts you receive. Changes are saved to your account.">

              <div style={{ padding: '16px 28px 8px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Email</div>
              </div>
              <SettingRow title="Bid Activity" subtitle="Email when bids are submitted, revised, or awarded on your projects."
                action={<ToggleSwitch enabled={emailBids} onToggle={() => setEmailBids(v => !v)} />} />
              <SettingRow title="Payments" subtitle="Email for payment confirmations, milestones, and releases."
                action={<ToggleSwitch enabled={emailPayments} onToggle={() => setEmailPayments(v => !v)} />} />
              <SettingRow title="Messages" subtitle="Email when you receive a new message from another user."
                action={<ToggleSwitch enabled={emailMessages} onToggle={() => setEmailMessages(v => !v)} />} />

              <div style={{ padding: '16px 28px 8px', borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>In-App (Push)</div>
              </div>
              <SettingRow title="Bid Activity" subtitle="In-app notification bell for bid events."
                action={<ToggleSwitch enabled={pushBids} onToggle={() => setPushBids(v => !v)} />} />
              <SettingRow title="Payments" subtitle="In-app alerts for payment events." hasBorder={false}
                action={<ToggleSwitch enabled={pushPayments} onToggle={() => setPushPayments(v => !v)} />} />

              <div style={{ padding: '16px 28px 20px', borderTop: `1px solid ${COLORS.border}` }}>
                {notifSaved && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: COLORS.success, marginBottom: 10 }}>
                    <CheckCircle size={14} /> Notification preferences saved.
                  </div>
                )}
                <button onClick={saveNotifPrefs} style={{ ...S.btnPrimary, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={14} /> Save Notification Settings
                </button>
              </div>
            </SectionPanel>
          )}

          {/* ── Account ── */}
          {activeSection === 'account' && (
            <SectionPanel title="Account" subtitle="Export your data, deactivate, or permanently delete your account.">

              {/* Logged-in info */}
              <div style={{ padding: '16px 28px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${COLORS.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 17, color: COLORS.primary }}>
                  {(profile?.company_name || profile?.full_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{profile?.company_name || profile?.full_name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{profile?.email} · {profile?.role}</div>
                </div>
              </div>

              {/* Export */}
              <SettingRow
                title="Export My Data"
                subtitle="Download a JSON file of your profile, projects, bids, transactions, and reviews."
                action={
                  <button onClick={handleExport} disabled={exportLoading} style={{ ...S.btnSecondary, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: exportLoading ? 0.7 : 1 }}>
                    <Download size={14} /> {exportLoading ? 'Preparing…' : 'Download Export'}
                  </button>
                }
              >
                {exportMsg && (
                  <div style={{ padding: '0 28px 16px' }}>
                    <div style={{ fontSize: 12, color: exportMsg.startsWith('Export failed') ? COLORS.danger : COLORS.success }}>{exportMsg}</div>
                  </div>
                )}
              </SettingRow>

              {/* Logout all devices */}
              <SettingRow
                title="Log Out"
                subtitle="Sign out of your account on this device."
                action={
                  <button onClick={() => logout()} style={{ ...S.btnSecondary, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LogOut size={14} /> Log Out
                  </button>
                }
              />

              {/* Deactivate */}
              <SettingRow
                title="Deactivate Account"
                subtitle="Temporarily suspend your account. Contact support to reactivate."
                action={
                  <button onClick={handleDeactivate} disabled={deactivating} style={{ ...S.btnSecondary, fontSize: 13, color: COLORS.warning, border: `1px solid ${COLORS.warning}`, opacity: deactivating ? 0.7 : 1 }}>
                    {deactivating ? 'Deactivating…' : 'Deactivate'}
                  </button>
                }
              >
                {deactivateMsg && (
                  <div style={{ padding: '0 28px 16px' }}>
                    <div style={{ fontSize: 12, color: COLORS.warning }}>{deactivateMsg}</div>
                  </div>
                )}
              </SettingRow>

              {/* Delete */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.danger, marginBottom: 3 }}>Delete Account</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>Permanently delete your account and all associated data. <strong>This cannot be undone.</strong></div>
                  </div>
                  <button onClick={() => setDeleteConfirm('prompt')} style={{ ...S.btnSecondary, fontSize: 13, color: COLORS.danger, border: `1px solid ${COLORS.danger}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
                {deleteConfirm === 'prompt' && (
                  <div style={{ padding: '0 28px 20px' }}>
                    <div style={{ background: COLORS.dangerLight, border: `1px solid ${COLORS.danger}44`, borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.danger, marginBottom: 6 }}>Are you absolutely sure?</div>
                      <p style={{ fontSize: 12, color: COLORS.text, margin: '0 0 14px', lineHeight: 1.6 }}>
                        All your data including projects, bids, contracts, and payment history will be permanently deleted. This action is irreversible.
                      </p>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 14px' }}>
                        To proceed, email <strong>support@buildbid.ph</strong> from your registered address with subject: <em>"Account Deletion Request — {profile?.email}"</em>
                      </p>
                      <button onClick={() => setDeleteConfirm('')} style={{ background: COLORS.gray100, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </SectionPanel>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
