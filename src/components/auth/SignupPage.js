import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Hammer, ArrowRight, ArrowLeft, CheckCircle2, Info, Search, ChevronDown, Loader2 } from 'lucide-react';
import { signUp } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayout } from './AuthLayout';

const C = { brown: '#7A3E0F', dark: '#4A2509', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E' };
const mono    = { fontFamily: "'JetBrains Mono', monospace" };
const display = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const STEPS   = ['Account Type', 'Basic Info', 'Company Info'];
const LABEL   = { display: 'block', ...mono, fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };

// All 17 Philippine regions with PSGC codes
const PH_REGIONS = [
  { label: 'NCR (Metro Manila)',                 code: '130000000' },
  { label: 'CAR (Cordillera Administrative Region)', code: '140000000' },
  { label: 'Region I – Ilocos Region',           code: '010000000' },
  { label: 'Region II – Cagayan Valley',         code: '020000000' },
  { label: 'Region III – Central Luzon',         code: '030000000' },
  { label: 'Region IV-A – CALABARZON',           code: '040000000' },
  { label: 'MIMAROPA Region',                    code: '170000000' },
  { label: 'Region V – Bicol Region',            code: '050000000' },
  { label: 'Region VI – Western Visayas',        code: '060000000' },
  { label: 'Region VII – Central Visayas',       code: '070000000' },
  { label: 'Region VIII – Eastern Visayas',      code: '080000000' },
  { label: 'Region IX – Zamboanga Peninsula',    code: '090000000' },
  { label: 'Region X – Northern Mindanao',       code: '100000000' },
  { label: 'Region XI – Davao Region',           code: '110000000' },
  { label: 'Region XII – SOCCSKSARGEN',          code: '120000000' },
  { label: 'Region XIII – Caraga',               code: '160000000' },
  { label: 'BARMM',                              code: '150000000' },
];

async function fetchCitiesForRegion(regionCode) {
  const res = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`);
  if (!res.ok) throw new Error('Failed to load cities');
  const data = await res.json();
  return data
    .map((c) => c.name)
    .sort((a, b) => a.localeCompare(b));
}

// Password requirement check
function checkPassword(pw) {
  return {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
  };
}

function PasswordRequirements({ password }) {
  const checks = checkPassword(password);
  const items = [
    { key: 'length',    label: 'At least 8 characters' },
    { key: 'uppercase', label: 'One uppercase letter' },
    { key: 'lowercase', label: 'One lowercase letter' },
    { key: 'number',    label: 'One number' },
  ];
  if (!password) return null;
  return (
    <div style={{ backgroundColor: '#FAFAF7', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginTop: 8 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Password Requirements</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              backgroundColor: checks[key] ? C.success : 'transparent',
              border: `2px solid ${checks[key] ? C.success : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>
              {checks[key] && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#fff' }} />}
            </div>
            <span style={{ fontSize: 12, color: checks[key] ? C.success : C.muted, transition: 'color 0.2s' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ type = 'text', value, onChange, placeholder, focused, onFocus, onBlur }) {
  return (
    <input
      type={type} value={value} onChange={onChange}
      onFocus={onFocus} onBlur={onBlur} placeholder={placeholder}
      style={{
        display: 'block', width: '100%', boxSizing: 'border-box',
        padding: '12px 16px',
        backgroundColor: C.surface,
        border: `2px solid ${focused ? C.brown : C.border}`,
        borderRadius: 12,
        fontSize: 14, color: C.text, outline: 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'border-color 0.15s',
        boxShadow: focused ? `0 0 0 4px rgba(122,62,15,0.08)` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    />
  );
}

function Select({ value, onChange, children, disabled }) {
  const [foc, setFoc] = useState(false);
  return (
    <select
      value={value} onChange={onChange} disabled={disabled}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        display: 'block', width: '100%', boxSizing: 'border-box',
        padding: '12px 16px',
        backgroundColor: disabled ? '#F5F0E8' : C.surface,
        border: `2px solid ${foc ? C.brown : C.border}`,
        borderRadius: 12,
        fontSize: 14, color: disabled ? C.muted : C.text, outline: 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
        appearance: 'none',
        transition: 'border-color 0.15s',
        boxShadow: foc ? `0 0 0 4px rgba(122,62,15,0.08)` : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{children}</select>
  );
}

// Searchable city combobox
function CityDropdown({ value, onChange, cities, loading, disabled }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);

  const filtered = search
    ? cities.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : cities;

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (city) => {
    onChange(city);
    setSearch('');
    setOpen(false);
  };

  const displayValue = value || '';

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        onClick={() => { if (!disabled && !loading) setOpen((o) => !o); }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: disabled ? '#F5F0E8' : C.surface,
          border: `2px solid ${open ? C.brown : C.border}`,
          borderRadius: 12,
          fontSize: 14, color: displayValue ? C.text : C.muted,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          boxShadow: open ? `0 0 0 4px rgba(122,62,15,0.08)` : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading ? 'Loading cities…' : displayValue || 'Select city / municipality'}
        </span>
        {loading
          ? <Loader2 size={14} style={{ flexShrink: 0, color: C.muted, animation: 'spin 1s linear infinite' }} />
          : <ChevronDown size={14} style={{ flexShrink: 0, color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        }
      </div>

      {open && !loading && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
          backgroundColor: C.surface,
          border: `2px solid ${C.brown}`,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Search box */}
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={13} style={{ color: C.muted, flexShrink: 0 }} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city or municipality…"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                color: C.text, backgroundColor: 'transparent',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            />
          </div>
          {/* City list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 13, color: C.muted, textAlign: 'center' }}>No results found</div>
            ) : (
              filtered.map((city) => (
                <div
                  key={city}
                  onClick={() => select(city)}
                  style={{
                    padding: '10px 16px', fontSize: 13, color: city === value ? C.brown : C.text,
                    fontWeight: city === value ? 700 : 400,
                    backgroundColor: city === value ? '#F5E6D3' : 'transparent',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${C.border}`,
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (city !== value) e.currentTarget.style.backgroundColor = C.cream; }}
                  onMouseLeave={(e) => { if (city !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {city}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ currentStep }) {
  return (
    <div style={{ marginBottom: 32, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 15, left: 0, right: 0, height: 2, backgroundColor: C.border, zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 15, left: 0, height: 2, backgroundColor: C.brown, zIndex: 0, width: `${(currentStep / (STEPS.length - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        {STEPS.map((label, i) => {
          const done = i < currentStep, active = i === currentStep;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, backgroundColor: C.cream, paddingLeft: i === 0 ? 0 : 6, paddingRight: i === STEPS.length - 1 ? 0 : 6 }}>
              <div style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${done || active ? C.brown : C.border}`,
                borderRadius: 8,
                backgroundColor: done ? C.brown : C.surface,
                color: done ? C.surface : active ? C.brown : C.muted,
                ...mono, fontSize: 11, fontWeight: 700, position: 'relative',
              }}>
                {active && (
                  <>
                    <div style={{ position: 'absolute', top: -2, left: -2, width: 8, height: 8, borderTop: `2px solid ${C.brown}`, borderLeft: `2px solid ${C.brown}` }} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderBottom: `2px solid ${C.brown}`, borderRight: `2px solid ${C.brown}` }} />
                  </>
                )}
                {done ? <CheckCircle2 size={15} /> : `0${i + 1}`}
              </div>
              <span style={{ ...mono, fontSize: 10, fontWeight: done || active ? 700 : 400, color: done || active ? C.text : C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();

  const [step,       setStep]       = useState(0);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [hovSubmit,  setHovSubmit]  = useState(false);
  const [hovBack,    setHovBack]    = useState(false);
  const [focus,      setFocus]      = useState('');

  // City dropdown state
  const [cities,       setCities]       = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityApiError, setCityApiError]  = useState(false);

  const [form, setForm] = useState({
    role: '', email: '', password: '', confirmPassword: '',
    fullName: '', phone: '',
    companyName: '', companyCity: '', companyRegion: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Fetch cities whenever region changes
  const loadCities = useCallback(async (regionCode) => {
    if (!regionCode) return;
    setLoadingCities(true);
    setCityApiError(false);
    setCities([]);
    set('companyCity', '');
    try {
      const result = await fetchCitiesForRegion(regionCode);
      setCities(result);
    } catch {
      setCityApiError(true);
    } finally {
      setLoadingCities(false);
    }
  }, []); // eslint-disable-line

  const handleRegionChange = (e) => {
    const label = e.target.value;
    set('companyRegion', label);
    const region = PH_REGIONS.find((r) => r.label === label);
    if (region) loadCities(region.code);
  };

  const pwChecks = checkPassword(form.password);
  const allPwChecks = Object.values(pwChecks).every(Boolean);

  const validateStep = () => {
    if (step === 0 && !form.role) { setError('Please select your account type.'); return false; }
    if (step === 1) {
      if (!form.email || !form.password || !form.fullName) { setError('Fill in all required fields.'); return false; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
      if (!allPwChecks) { setError('Password does not meet all requirements.'); return false; }
    }
    setError(''); return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (!form.companyName) { setError('Company name is required.'); return; }
    if (!form.companyRegion) { setError('Please select a region.'); return; }
    if (!form.companyCity) { setError('Please select a city / municipality.'); return; }
    setError(''); setLoading(true);
    try {
      const { user, profile, requiresOTP } = await signUp({
        email: form.email, password: form.password,
        fullName: form.fullName, companyName: form.companyName,
        phone: form.phone, role: form.role,
        companyCity: form.companyCity, companyRegion: form.companyRegion,
      });
      if (requiresOTP) {
        setAuth(user, profile);
        navigate('/verify-email', { state: { userId: user.uid, email: profile.email, name: profile.full_name }, replace: true });
      } else {
        navigate('/login', { state: { message: 'Application submitted! You will receive an email with a verification code once admin approves your account.' } });
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const RoleCard = ({ value, title, desc, icon }) => {
    const [hov, setHov] = useState(false);
    const sel = form.role === value;
    return (
      <div
        onClick={() => set('role', value)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          flex: 1, padding: 20, cursor: 'pointer',
          border: `2px solid ${sel ? C.brown : hov ? 'rgba(122,62,15,0.4)' : C.border}`,
          borderRadius: 16,
          backgroundColor: sel ? C.surface : `${C.surface}99`,
          position: 'relative',
          boxShadow: sel ? '0 4px 20px rgba(122,62,15,0.15)' : hov ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        {sel && (
          <div style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: '50%', backgroundColor: C.brown, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: C.surface }} />
          </div>
        )}
        <div style={{ marginBottom: 12, color: sel ? C.brown : C.muted }}>{icon}</div>
        <div style={{ ...display, fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
      </div>
    );
  };

  const onSubmit = step === 2 ? handleSubmit : next;
  const submitDisabled = (step === 0 && !form.role) || loading;
  const submitLabel = step === 2 ? (loading ? 'Creating account…' : 'Complete Registration') : 'Continue';

  return (
    <AuthLayout title="Create your account" subtitle="Join the premier private construction bidding platform in the Philippines.">
      <StepIndicator currentStep={step} />

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid rgba(220,38,38,0.25)', color: '#991B1B', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Step 0 */}
      {step === 0 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <RoleCard value="client" title="Client" icon={<Building2 size={28} />} desc="I want to post construction projects and receive bids from verified contractors." />
          <RoleCard value="contractor" title="Contractor" icon={<Hammer size={28} />} desc="I want to browse projects and submit competitive bids to win contracts." />
        </div>
      )}

      {/* Step 1 – Basic Info */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Full Name <span style={{ color: C.amber }}>*</span></label>
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Juan dela Cruz" focused={focus === 'fullName'} onFocus={() => setFocus('fullName')} onBlur={() => setFocus('')} />
          </div>
          <div>
            <label style={LABEL}>Phone Number</label>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+63 9XX XXX XXXX" focused={focus === 'phone'} onFocus={() => setFocus('phone')} onBlur={() => setFocus('')} />
          </div>
          <div>
            <label style={LABEL}>Email Address <span style={{ color: C.amber }}>*</span></label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="juan@company.ph" focused={focus === 'email'} onFocus={() => setFocus('email')} onBlur={() => setFocus('')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>Password <span style={{ color: C.amber }}>*</span></label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 8 chars" focused={focus === 'password'} onFocus={() => setFocus('password')} onBlur={() => setFocus('')} />
            </div>
            <div>
              <label style={LABEL}>Confirm <span style={{ color: C.amber }}>*</span></label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="••••••••" focused={focus === 'confirm'} onFocus={() => setFocus('confirm')} onBlur={() => setFocus('')} />
            </div>
          </div>
          <PasswordRequirements password={form.password} />
          {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
            <div style={{ fontSize: 12, color: '#DC2626', marginTop: -8 }}>Passwords do not match.</div>
          )}
        </div>
      )}

      {/* Step 2 – Company Info */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Company Name <span style={{ color: C.amber }}>*</span></label>
            <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. BuildRight Construction Corp." focused={focus === 'company'} onFocus={() => setFocus('company')} onBlur={() => setFocus('')} />
          </div>

          <div>
            <label style={LABEL}>Region <span style={{ color: C.amber }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <Select value={form.companyRegion} onChange={handleRegionChange}>
                <option value="">— Select a region —</option>
                {PH_REGIONS.map((r) => <option key={r.code} value={r.label}>{r.label}</option>)}
              </Select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <label style={LABEL}>City / Municipality <span style={{ color: C.amber }}>*</span></label>
            {cityApiError ? (
              <Input
                value={form.companyCity}
                onChange={(e) => set('companyCity', e.target.value)}
                placeholder="Type your city or municipality"
                focused={focus === 'city'}
                onFocus={() => setFocus('city')}
                onBlur={() => setFocus('')}
              />
            ) : (
              <CityDropdown
                value={form.companyCity}
                onChange={(v) => set('companyCity', v)}
                cities={cities}
                loading={loadingCities}
                disabled={!form.companyRegion}
              />
            )}
            {!form.companyRegion && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Select a region first to load cities.</p>
            )}
            {cityApiError && (
              <p style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>Could not load city list — please type your city manually.</p>
            )}
          </div>

          {form.role === 'contractor' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', backgroundColor: '#D1FAE5', border: '1px solid rgba(45,122,62,0.3)', color: C.success, borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.6 }}>
              <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} /><span>After admin approves your application, you will receive an email verification code to activate your account.</span>
            </div>
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
        {step > 0 && (
          <button
            type="button" onClick={back}
            onMouseEnter={() => setHovBack(true)}
            onMouseLeave={() => setHovBack(false)}
            style={{
              padding: '13px 20px', borderRadius: 100,
              backgroundColor: hovBack ? C.cream : C.surface,
              color: C.text,
              border: `2px solid ${hovBack ? C.brown : C.border}`,
              fontSize: 14, fontWeight: 700,
              fontFamily: "'Inter', system-ui, sans-serif",
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'border-color 0.15s, background-color 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <button
          type="button" onClick={onSubmit} disabled={submitDisabled}
          onMouseEnter={() => setHovSubmit(true)}
          onMouseLeave={() => setHovSubmit(false)}
          style={{
            flex: 1, padding: '13px 20px', borderRadius: 100,
            backgroundColor: submitDisabled ? `${C.brown}55` : hovSubmit ? C.dark : C.brown,
            color: C.cream, border: 'none',
            fontSize: 14, fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background-color 0.15s',
            boxShadow: hovSubmit && !submitDisabled ? '0 4px 16px rgba(122,62,15,0.35)' : '0 2px 8px rgba(122,62,15,0.2)',
          }}
        >
          {submitLabel}
          {!loading && step < 2 && <ArrowRight size={15} style={{ transform: hovSubmit && !submitDisabled ? 'translateX(3px)' : 'none', transition: 'transform 0.2s' }} />}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 20, marginBottom: 0 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ fontWeight: 700, color: C.brown, textDecoration: 'none' }}>Sign in</Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthLayout>
  );
}
