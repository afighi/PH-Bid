import { useState, useRef } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { PHILIPPINE_REGIONS, PCAB_CLASSIFICATIONS, SPECIALIZATIONS } from '../../utils/constants';
import Portfolio from '../contractor/Portfolio';
import { ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { COLORS, S } from '../../theme';
import { Pencil, Save, X, Camera, User, Bell, ChevronRight, Star } from 'lucide-react';

/* ── Field display component ──────────────────────────────────── */
function Field({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: COLORS.textMuted, margin: '0 0 2px', fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 13, color: COLORS.text, margin: 0, fontWeight: 600 }}>{value || '—'}</p>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────────────── */
function Section({ title, onEdit, onSave, onCancel, editing, saving, children }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: 0 }}>{title}</h3>
        {!editing ? (
          <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 14px', background: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: COLORS.textMuted, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}>
            <Pencil size={12} /> Edit
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 14px', background: '#FFF', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>
              <X size={12} /> Cancel
            </button>
            <button onClick={onSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 8, padding: '6px 14px', backgroundColor: COLORS.primary, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#FFF', opacity: saving ? 0.7 : 1 }}>
              <Save size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { profile, updateProfile } = useAuthStore();
  const fileInputRef = useRef(null);

  const { isMobile } = useBreakpoint();

  // Which section is in edit mode
  const [editingSection, setEditingSection] = useState(null); // 'header' | 'personal' | 'address' | 'contractor'
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState('');
  const [error,   setError]   = useState('');
  const [focus,   setFocus]   = useState('');

  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [avatarFile,    setAvatarFile]    = useState(null);

  const [form, setForm] = useState({
    full_name:           profile?.full_name           || '',
    phone:               profile?.phone               || '',
    company_name:        profile?.company_name        || '',
    company_city:        profile?.company_city        || '',
    company_region:      profile?.company_region      || 'NCR (Metro Manila)',
    company_address:     profile?.company_address     || '',
    license_number:      profile?.license_number      || '',
    pcab_classification: profile?.pcab_classification || '',
    years_experience:    profile?.years_experience    || '',
    tin_number:          profile?.tin_number          || '',
    specializations:     profile?.specializations     || [],
  });

  const f   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp = (name) => ({ ...S.input, ...(focus === name ? S.inputFocus : {}), fontSize: 13 });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm({
      full_name: profile?.full_name || '', phone: profile?.phone || '',
      company_name: profile?.company_name || '', company_city: profile?.company_city || '',
      company_region: profile?.company_region || 'NCR (Metro Manila)',
      company_address: profile?.company_address || '',
      license_number: profile?.license_number || '',
      pcab_classification: profile?.pcab_classification || '',
      years_experience: profile?.years_experience || '',
      tin_number: profile?.tin_number || '',
      specializations: profile?.specializations || [],
    });
    setAvatarFile(null);
    setAvatarPreview(profile?.avatar_url || null);
  };

  const handleSave = async (section) => {
    setSaving(true); setError(''); setSuccess('');
    try {
      let avatar_url = profile?.avatar_url || null;
      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop();
        const path = `avatars/${profile.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = urlData.publicUrl;
      }

      let updates = {};
      if (section === 'header')   updates = { full_name: form.full_name, company_name: form.company_name, ...(avatar_url ? { avatar_url } : {}) };
      if (section === 'personal') updates = { full_name: form.full_name, phone: form.phone, company_name: form.company_name };
      if (section === 'address')  updates = { company_city: form.company_city, company_region: form.company_region, company_address: form.company_address, tin_number: form.tin_number };
      if (section === 'contractor') {
        updates = {
          license_number: form.license_number,
          pcab_classification: form.pcab_classification,
          years_experience: Number(form.years_experience) || 0,
          specializations: form.specializations,
        };
      }

      const { error: err } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (err) throw new Error(err.message);
      updateProfile({ ...updates, ...(avatar_url ? { avatar_url } : {}) });
      setAvatarFile(null);
      setSuccess('Changes saved.');
      setEditingSection(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (section) => { resetForm(); setEditingSection(section); setError(''); };
  const cancelEdit = () => { resetForm(); setEditingSection(null); setError(''); };

  /* ── Notification preferences ── */
  // Each role only sees keys relevant to their workflows.
  const NOTIF_CONFIG = {
    client: {
      defaults: {
        email_new_bid:        true,
        email_project_update: true,
        email_messages:       true,
        email_payment:        true,
        push_new_bid:         true,
        push_project_update:  false,
        push_messages:        true,
        push_payment:         true,
      },
      email: [
        { key: 'email_new_bid',        label: 'New Bid Received',  subtitle: 'When a contractor submits a bid on your project' },
        { key: 'email_project_update', label: 'Project Updates',   subtitle: 'Status changes and milestones on your projects' },
        { key: 'email_messages',       label: 'New Messages',      subtitle: 'When you receive a new message or inquiry' },
        { key: 'email_payment',        label: 'Payment Activity',  subtitle: 'Invoices, payments received, and transaction receipts' },
      ],
      push: [
        { key: 'push_new_bid',         label: 'New Bid Received',  subtitle: 'Real-time alert when a bid comes in' },
        { key: 'push_project_update',  label: 'Project Updates',   subtitle: 'Live status updates on active projects' },
        { key: 'push_messages',        label: 'New Messages',      subtitle: 'Pop-up when you receive a new message' },
        { key: 'push_payment',         label: 'Payment Activity',  subtitle: 'Real-time payment and invoice alerts' },
      ],
    },
    contractor: {
      defaults: {
        email_bid_accepted:   true,
        email_bid_rejected:   true,
        email_project_update: true,
        email_messages:       true,
        email_payment:        true,
        push_bid_accepted:    true,
        push_bid_rejected:    true,
        push_project_update:  false,
        push_messages:        true,
        push_payment:         true,
      },
      email: [
        { key: 'email_bid_accepted',   label: 'Bid Accepted',      subtitle: 'When your bid has been accepted by a client' },
        { key: 'email_bid_rejected',   label: 'Bid Rejected',      subtitle: 'When your bid has been declined by a client' },
        { key: 'email_project_update', label: 'Project Updates',   subtitle: 'Status changes on projects you are working on' },
        { key: 'email_messages',       label: 'New Messages',      subtitle: 'When you receive a new message or inquiry' },
        { key: 'email_payment',        label: 'Payment Activity',  subtitle: 'Earnings, milestones paid, and transaction receipts' },
      ],
      push: [
        { key: 'push_bid_accepted',    label: 'Bid Accepted',      subtitle: 'Instant alert when your bid is accepted' },
        { key: 'push_bid_rejected',    label: 'Bid Rejected',      subtitle: 'Instant alert when your bid is declined' },
        { key: 'push_project_update',  label: 'Project Updates',   subtitle: 'Live status updates on projects you are working on' },
        { key: 'push_messages',        label: 'New Messages',      subtitle: 'Pop-up when you receive a new message' },
        { key: 'push_payment',         label: 'Payment Activity',  subtitle: 'Real-time earnings and payment alerts' },
      ],
    },
    admin: {
      defaults: {
        email_new_registration: true,
        email_new_project:      true,
        email_dispute:          true,
        push_new_registration:  true,
        push_new_project:       false,
        push_dispute:           true,
      },
      email: [
        { key: 'email_new_registration', label: 'New Registrations',   subtitle: 'When a new contractor or client signs up and needs review' },
        { key: 'email_new_project',      label: 'New Projects Posted',  subtitle: 'When a client posts a new construction project' },
        { key: 'email_dispute',          label: 'Disputes Filed',       subtitle: 'When a dispute is opened between a client and contractor' },
      ],
      push: [
        { key: 'push_new_registration',  label: 'New Registrations',   subtitle: 'Real-time alert when a new account needs approval' },
        { key: 'push_new_project',       label: 'New Projects Posted',  subtitle: 'Alert when a new project goes live on the platform' },
        { key: 'push_dispute',           label: 'Disputes Filed',       subtitle: 'Instant alert when a dispute is raised' },
      ],
    },
  };

  const roleConfig      = NOTIF_CONFIG[profile?.role] || NOTIF_CONFIG.client;
  const defaultNotifPrefs = roleConfig.defaults;
  const [notifPrefs, setNotifPrefs] = useState({
    ...defaultNotifPrefs,
    ...(profile?.notification_preferences || {}),
  });
  const [notifSaving,  setNotifSaving]  = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifDirty,   setNotifDirty]   = useState(false);

  const toggleNotif = (key) => {
    setNotifPrefs(p => ({ ...p, [key]: !p[key] }));
    setNotifDirty(true);
    setNotifSuccess('');
  };

  const saveNotifPrefs = async () => {
    setNotifSaving(true);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ notification_preferences: notifPrefs })
        .eq('id', profile.id);
      if (err) throw new Error(err.message);
      updateProfile({ notification_preferences: notifPrefs });
      setNotifDirty(false);
      setNotifSuccess('Notification preferences saved.');
      setTimeout(() => setNotifSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setNotifSaving(false);
    }
  };

  const toggleSpec = (s) => {
    setForm(p => ({
      ...p,
      specializations: p.specializations.includes(s)
        ? p.specializations.filter(x => x !== s)
        : [...p.specializations, s],
    }));
  };

  // Live-preview values
  const displayName    = editingSection === 'header' || editingSection === 'personal'
    ? (form.full_name || profile?.full_name || '—')
    : (profile?.full_name || '—');
  const displayCompany = editingSection === 'header' || editingSection === 'personal'
    ? (form.company_name || profile?.company_name || '')
    : (profile?.company_name || '');
  const displayCity    = editingSection === 'address'
    ? form.company_city : (profile?.company_city || '');
  const displayRegion  = editingSection === 'address'
    ? form.company_region : (profile?.company_region || '');

  const ROLE_COLOR   = { client: COLORS.primary, contractor: COLORS.success, admin: COLORS.warning };
  const STATUS_COLOR = { active: COLORS.success, pending: COLORS.warning, suspended: COLORS.danger };
  const roleColor    = ROLE_COLOR[profile?.role]     || COLORS.primary;
  const statusColor  = STATUS_COLOR[profile?.status] || COLORS.textMuted;

  const initials = (displayName !== '—' ? displayName : 'U')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ── Left nav items — admin has no notification preferences ── */
  const NAV = [
    { id: 'profile',       label: 'My Profile',   icon: User, iconColor: COLORS.primary, iconBg: '#F5E6D3' },
    ...(profile?.role !== 'admin' ? [
      { id: 'notifications', label: 'Notifications', icon: Bell, iconColor: '#D97706', iconBg: '#FEF3C7' },
    ] : []),
  ];
  const [activeNav, setActiveNav] = useState('profile');

  return (
    <DashboardLayout title="Account Settings">
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

      {/* Global alerts */}
      {success && <div style={{ ...S.alertSuccess, marginBottom: 16 }}>{success}</div>}
      {error   && <div style={{ ...S.alertError,   marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '200px 1fr', gap: isMobile ? 16 : 24, alignItems: 'start', maxWidth: 860, margin: '0 auto' }}>

        {/* ══ LEFT NAV ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, backgroundColor: '#FFF', borderRadius: 16, border: `1px solid ${COLORS.border}`, padding: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', position: 'sticky', top: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px 8px', margin: 0 }}>
            Profile
          </p>
          {NAV.map(({ id, label, icon: Icon, iconColor, iconBg }) => {
            const active = activeNav === id;
            return (
              <button key={id} onClick={() => setActiveNav(id)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                backgroundColor: active ? `${COLORS.primary}10` : 'transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = COLORS.gray50; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: active ? iconBg : COLORS.gray50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                  <Icon size={15} color={active ? iconColor : COLORS.textMuted} />
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? COLORS.primary : COLORS.text, flex: 1 }}>
                  {label}
                </span>
                {active && <ChevronRight size={14} color={COLORS.primary} />}
              </button>
            );
          })}
        </div>

        {/* ══ RIGHT CONTENT ══ */}
        <div style={{ backgroundColor: '#FFF', borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: '4px 24px 8px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>

          {/* Page title */}
          <div style={{ padding: '20px 0 0', borderBottom: `1px solid ${COLORS.border}`, marginBottom: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: '0 0 16px' }}>
              {activeNav === 'notifications' ? 'Notifications' : 'My Profile'}
            </h2>
          </div>

          {/* ── Notifications Panel ── */}
          {activeNav === 'notifications' && (() => {
            const NotifRow = ({ label, subtitle, prefKey }) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${COLORS.border}`, gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{subtitle}</div>
                </div>
                <div
                  onClick={() => toggleNotif(prefKey)}
                  style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: notifPrefs[prefKey] ? COLORS.primary : '#D1D5DB', cursor: 'pointer', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#FFF', position: 'absolute', top: 3, left: notifPrefs[prefKey] ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                </div>
              </div>
            );

            return (
              <div style={{ paddingBottom: 8 }}>
                {/* Email */}
                <div style={{ padding: '20px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#F5E6D3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={13} color={COLORS.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Email Notifications</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>Sent to {profile?.email}</div>
                    </div>
                  </div>
                </div>
                {roleConfig.email.map(({ key, label, subtitle }) => (
                  <NotifRow key={key} label={label} subtitle={subtitle} prefKey={key} />
                ))}

                {/* In-App */}
                <div style={{ padding: '24px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={13} color="#D97706" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>In-App Notifications</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>Alerts inside the platform</div>
                    </div>
                  </div>
                </div>
                {roleConfig.push.map(({ key, label, subtitle }) => (
                  <NotifRow key={key} label={label} subtitle={subtitle} prefKey={key} />
                ))}

                {/* Save bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 20 }}>
                  {notifSuccess
                    ? <div style={{ ...S.alertSuccess, marginBottom: 0, padding: '8px 14px' }}>{notifSuccess}</div>
                    : <div />
                  }
                  <button
                    onClick={saveNotifPrefs}
                    disabled={!notifDirty || notifSaving}
                    style={{ ...S.btnPrimary, opacity: (!notifDirty || notifSaving) ? 0.5 : 1, cursor: (!notifDirty || notifSaving) ? 'not-allowed' : 'pointer', fontSize: 13 }}
                  >
                    {notifSaving ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Profile sections (only when My Profile tab active) ── */}
          {activeNav === 'profile' && <>
          <Section
            title=""
            onEdit={() => startEdit('header')}
            onSave={() => handleSave('header')}
            onCancel={cancelEdit}
            editing={editingSection === 'header'}
            saving={saving}
          >
            {editingSection === 'header' ? (
              /* Edit header */
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {/* Avatar picker */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: `${roleColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: roleColor, cursor: 'pointer', overflow: 'hidden', border: `2px solid ${roleColor}44` }}
                  >
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials
                    }
                  </div>
                  <div onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', backgroundColor: COLORS.primary, border: '2px solid #FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={11} color="#FFF" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, flex: 1 }}>
                  <div>
                    <label style={S.label}>Full Name</label>
                    <input style={inp('full_name')} value={form.full_name}
                      onChange={e => f('full_name', e.target.value)}
                      onFocus={() => setFocus('full_name')} onBlur={() => setFocus('')} />
                  </div>
                  <div>
                    <label style={S.label}>Company / Organization</label>
                    <input style={inp('company_name')} value={form.company_name}
                      onChange={e => f('company_name', e.target.value)}
                      onFocus={() => setFocus('company_name')} onBlur={() => setFocus('')} />
                  </div>
                </div>
              </div>
            ) : (
              /* View header */
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: `${roleColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: roleColor, overflow: 'hidden', border: `2px solid ${roleColor}44` }}>
                    {avatarPreview || profile?.avatar_url
                      ? <img src={avatarPreview || profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials
                    }
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: COLORS.text, margin: '0 0 3px' }}>{displayName}</p>
                  {displayCompany && <p style={{ fontSize: 13, color: COLORS.textMuted, margin: '0 0 3px' }}>{displayCompany}</p>}
                  <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                    {[displayCity, displayRegion].filter(Boolean).join(', ') || '—'}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span style={{ backgroundColor: `${roleColor}15`, color: roleColor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${roleColor}30` }}>
                      {profile?.role}
                    </span>
                    <span style={{ backgroundColor: `${statusColor}15`, color: statusColor, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', border: `1px solid ${statusColor}30` }}>
                      {profile?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── Personal Information ── */}
          <Section
            title="Personal Information"
            onEdit={() => startEdit('personal')}
            onSave={() => handleSave('personal')}
            onCancel={cancelEdit}
            editing={editingSection === 'personal'}
            saving={saving}
          >
            {editingSection === 'personal' ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>Full Name</label>
                  <input style={inp('full_name')} value={form.full_name}
                    onChange={e => f('full_name', e.target.value)}
                    onFocus={() => setFocus('full_name')} onBlur={() => setFocus('')} />
                </div>
                <div>
                  <label style={S.label}>Company Name</label>
                  <input style={inp('company_name')} value={form.company_name}
                    onChange={e => f('company_name', e.target.value)}
                    onFocus={() => setFocus('company_name')} onBlur={() => setFocus('')} />
                </div>
                <div>
                  <label style={S.label}>Email Address</label>
                  <input style={{ ...inp('email'), backgroundColor: COLORS.gray50, color: COLORS.textMuted }} value={profile?.email} disabled />
                </div>
                <div>
                  <label style={S.label}>Phone Number</label>
                  <input style={inp('phone')} value={form.phone}
                    onChange={e => f('phone', e.target.value)}
                    onFocus={() => setFocus('phone')} onBlur={() => setFocus('')}
                    placeholder="+63 9XX XXX XXXX" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', rowGap: 10, columnGap: 24 }}>
                <Field label="Full Name"     value={profile?.full_name} />
                <Field label="Company Name"  value={profile?.company_name} />
                <Field label="Email Address" value={profile?.email} />
                <Field label="Phone"         value={profile?.phone} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Member Since" value={formatDate(profile?.created_at)} />
                </div>
              </div>
            )}
          </Section>

          {/* ── Address ── */}
          <Section
            title="Address"
            onEdit={() => startEdit('address')}
            onSave={() => handleSave('address')}
            onCancel={cancelEdit}
            editing={editingSection === 'address'}
            saving={saving}
          >
            {editingSection === 'address' ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={S.label}>City / Municipality</label>
                  <input style={inp('company_city')} value={form.company_city}
                    onChange={e => f('company_city', e.target.value)}
                    onFocus={() => setFocus('company_city')} onBlur={() => setFocus('')}
                    placeholder="Quezon City" />
                </div>
                <div>
                  <label style={S.label}>Region</label>
                  <select style={inp('region')} value={form.company_region}
                    onChange={e => f('company_region', e.target.value)}
                    onFocus={() => setFocus('region')} onBlur={() => setFocus('')}>
                    {PHILIPPINE_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={S.label}>Full Address</label>
                  <input style={inp('address')} value={form.company_address}
                    onChange={e => f('company_address', e.target.value)}
                    onFocus={() => setFocus('address')} onBlur={() => setFocus('')}
                    placeholder="123 Rizal Street, Barangay..." />
                </div>
                <div>
                  <label style={S.label}>TIN Number</label>
                  <input style={inp('tin')} value={form.tin_number}
                    onChange={e => f('tin_number', e.target.value)}
                    onFocus={() => setFocus('tin')} onBlur={() => setFocus('')}
                    placeholder="000-000-000" />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', rowGap: 10, columnGap: 24 }}>
                <Field label="City / Municipality" value={profile?.company_city} />
                <Field label="Region"              value={profile?.company_region} />
                <Field label="Full Address"        value={profile?.company_address} />
                <Field label="TIN Number"          value={profile?.tin_number} />
              </div>
            )}
          </Section>

          {/* ── Contractor Details (contractors only) ── */}
          {profile?.role === 'contractor' && (
            <Section
              title="Contractor Details"
              onEdit={() => startEdit('contractor')}
              onSave={() => handleSave('contractor')}
              onCancel={cancelEdit}
              editing={editingSection === 'contractor'}
              saving={saving}
            >
              {editingSection === 'contractor' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={S.label}>PCAB License Number</label>
                      <input style={inp('license')} value={form.license_number}
                        onChange={e => f('license_number', e.target.value)}
                        onFocus={() => setFocus('license')} onBlur={() => setFocus('')}
                        placeholder="PCAB-XXXXX" />
                    </div>
                    <div>
                      <label style={S.label}>PCAB Classification</label>
                      <select style={inp('pcab')} value={form.pcab_classification}
                        onChange={e => f('pcab_classification', e.target.value)}
                        onFocus={() => setFocus('pcab')} onBlur={() => setFocus('')}>
                        <option value="">Select…</option>
                        {PCAB_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Years of Experience</label>
                      <input style={inp('exp')} type="number" value={form.years_experience}
                        onChange={e => f('years_experience', e.target.value)}
                        onFocus={() => setFocus('exp')} onBlur={() => setFocus('')}
                        placeholder="10" min="0" max="100" />
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>Specializations</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {SPECIALIZATIONS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
                          padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                          border: `1.5px solid ${form.specializations.includes(s) ? COLORS.primary : COLORS.border}`,
                          backgroundColor: form.specializations.includes(s) ? `${COLORS.primary}15` : '#FFF',
                          color: form.specializations.includes(s) ? COLORS.primary : COLORS.textMuted,
                          fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                        }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', rowGap: 10, columnGap: 24, marginBottom: profile?.specializations?.length > 0 ? 10 : 0 }}>
                    <Field label="PCAB License No."    value={profile?.license_number} />
                    <Field label="PCAB Classification" value={profile?.pcab_classification} />
                    <Field label="Years of Experience" value={profile?.years_experience ? `${profile.years_experience} years` : null} />
                    <Field label="Completed Projects"  value={profile?.completed_projects || 0} />
                    {profile?.average_rating > 0 && <Field label="Rating" value={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={12} />{Number(profile.average_rating).toFixed(1)}</span>} />}
                  </div>
                  {profile?.specializations?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 8px', fontWeight: 500 }}>Specializations</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {profile.specializations.map(s => <span key={s} style={S.badgeBlue}>{s}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}
          </>}

          {/* Portfolio section — contractor only */}
          {profile.role === 'contractor' && (
            <div style={{ padding: '16px 0' }}>
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  {profile.is_verified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: COLORS.success, background: COLORS.successLight, padding: '4px 10px', borderRadius: 20, border: `1px solid ${COLORS.success}44` }}>
                      <ShieldCheck size={12} /> Verified Contractor
                    </span>
                  )}
                </div>
                <Portfolio contractorId={profile.id} editable />
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </DashboardLayout>
  );
}
