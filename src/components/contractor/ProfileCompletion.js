import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { getContractorCompletion } from '../../utils/profileUtils';
import { SPECIALIZATIONS, PCAB_CLASSIFICATIONS, PHILIPPINE_REGIONS } from '../../utils/constants';
import { COLORS, S } from '../../theme';
import { PartyPopper } from 'lucide-react';

export default function ProfileCompletion() {
  const { profile, setAuth } = useAuthStore();
  const [saving,    setSaving]    = useState(null); // field key being saved
  const [error,     setError]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    license_number:         profile?.license_number         || '',
    license_classification: profile?.license_classification || '',
    years_experience:       profile?.years_experience       || '',
    location_region:        profile?.location_region        || '',
    specializations:        Array.isArray(profile?.specializations) ? profile.specializations : [],
  });

  const { pct, fields } = getContractorCompletion(profile);

  // Show "All Set" modal on first time reaching 100%
  const storageKey = `profile_complete_${profile?.id}`;
  useEffect(() => {
    if (pct === 100 && !localStorage.getItem(storageKey)) {
      setShowModal(true);
      localStorage.setItem(storageKey, '1');
    }
  }, [pct, storageKey]);

  if (pct === 100 && !showModal) return null; // nothing to show

  const toggleSpec = (s) =>
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));

  const saveField = async (fieldKey) => {
    setSaving(fieldKey);
    setError('');
    try {
      const value = form[fieldKey];
      const { error: err } = await supabase
        .from('profiles')
        .update({ [fieldKey]: value })
        .eq('id', profile.id);

      if (err) throw new Error(err.message);

      // Update Zustand store with new profile
      const { data: updated } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();

      const { auth: firebaseAuth } = await import('../../config/firebase');
      setAuth(firebaseAuth.currentUser, updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const saveSpecializations = async () => {
    setSaving('specializations');
    setError('');
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ specializations: form.specializations })
        .eq('id', profile.id);
      if (err) throw new Error(err.message);

      const { data: updated } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      const { auth: firebaseAuth } = await import('../../config/firebase');
      setAuth(firebaseAuth.currentUser, updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const pctColor = pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.primary : COLORS.warning;

  return (
    <>
      {/* ── All Set Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{ ...S.card, maxWidth: 400, width: '100%', textAlign: 'center', padding: 40 }}>
            <div style={{ marginBottom: 16 }}><PartyPopper size={56} color={COLORS.primary} /></div>
            <h2 style={{ ...S.h2, marginBottom: 8 }}>You're all set!</h2>
            <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 24, lineHeight: 1.7 }}>
              Your contractor profile is complete. You can now browse projects and submit competitive bids.
            </p>
            <button
              onClick={() => setShowModal(false)}
              style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}
            >
              Start Browsing Projects →
            </button>
          </div>
        </div>
      )}

      {/* ── Profile completion card ── */}
      {pct < 100 && (
        <div style={{ ...S.card, marginBottom: 24, border: `1.5px solid ${pctColor}44` }}>
          {/* Header */}
          <div style={{ ...S.rowBetween, marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, margin: '0 0 2px' }}>
                Complete Your Profile
              </p>
              <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
                Required to start placing bids
              </p>
            </div>
            <span style={{
              fontSize: 18, fontWeight: 800,
              color: pctColor,
            }}>
              {pct}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ backgroundColor: COLORS.gray100, borderRadius: 6, height: 8, marginBottom: 20 }}>
            <div style={{
              height: 8, borderRadius: 6,
              backgroundColor: pctColor,
              width: `${pct}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>

          {error && <div style={{ ...S.alertError, marginBottom: 16 }}>{error}</div>}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* PCAB License Number */}
            {!fields.find((f) => f.key === 'license_number')?.filled && (
              <FieldRow label="PCAB License Number" weight={25}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={S.input} value={form.license_number}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                    placeholder="e.g. PCAB-12345" />
                  <SaveBtn onClick={() => saveField('license_number')} loading={saving === 'license_number'} disabled={!form.license_number} />
                </div>
              </FieldRow>
            )}

            {/* PCAB Classification */}
            {!fields.find((f) => f.key === 'license_classification')?.filled && (
              <FieldRow label="PCAB Classification" weight={20}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={S.input} value={form.license_classification}
                    onChange={(e) => setForm({ ...form, license_classification: e.target.value })}>
                    <option value="">Select class...</option>
                    {PCAB_CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <SaveBtn onClick={() => saveField('license_classification')} loading={saving === 'license_classification'} disabled={!form.license_classification} />
                </div>
              </FieldRow>
            )}

            {/* Specializations */}
            {!fields.find((f) => f.key === 'specializations')?.filled && (
              <FieldRow label="Specializations" weight={25}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {SPECIALIZATIONS.map((s) => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)} style={{
                      padding: '4px 12px', borderRadius: 20, border: `1.5px solid`,
                      borderColor: form.specializations.includes(s) ? COLORS.primary : COLORS.border,
                      backgroundColor: form.specializations.includes(s) ? `${COLORS.primary}15` : COLORS.white,
                      color: form.specializations.includes(s) ? COLORS.primary : COLORS.textMuted,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>{s}</button>
                  ))}
                </div>
                <SaveBtn
                  onClick={saveSpecializations}
                  loading={saving === 'specializations'}
                  disabled={form.specializations.length === 0}
                  label="Save Specializations"
                />
              </FieldRow>
            )}

            {/* Years of Experience */}
            {!fields.find((f) => f.key === 'years_experience')?.filled && (
              <FieldRow label="Years of Experience" weight={20}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={S.input} type="number" min="0" max="100"
                    value={form.years_experience}
                    onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                    placeholder="e.g. 8" />
                  <SaveBtn onClick={() => saveField('years_experience')} loading={saving === 'years_experience'} disabled={!form.years_experience} />
                </div>
              </FieldRow>
            )}

            {/* Operating Region */}
            {!fields.find((f) => f.key === 'location_region')?.filled && (
              <FieldRow label="Operating Region" weight={10}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select style={S.input} value={form.location_region}
                    onChange={(e) => setForm({ ...form, location_region: e.target.value })}>
                    <option value="">Select region...</option>
                    {PHILIPPINE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <SaveBtn onClick={() => saveField('location_region')} loading={saving === 'location_region'} disabled={!form.location_region} />
                </div>
              </FieldRow>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FieldRow({ label, weight, children }) {
  return (
    <div style={{ backgroundColor: COLORS.gray50, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: COLORS.text, margin: 0 }}>{label}</p>
        <span style={{ ...S.badgeYellow, fontSize: 10, padding: '1px 7px' }}>+{weight}%</span>
      </div>
      {children}
    </div>
  );
}

function SaveBtn({ onClick, loading, disabled, label = 'Save' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...S.btnPrimary,
        padding: '10px 16px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        opacity: (disabled || loading) ? 0.5 : 1,
        fontSize: 13,
      }}
    >
      {loading ? '...' : label}
    </button>
  );
}
