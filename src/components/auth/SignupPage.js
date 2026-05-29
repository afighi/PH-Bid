import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Hammer, ArrowRight, ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { signUp } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayout } from './AuthLayout';

const C = { brown: '#7A3E0F', dark: '#4A2509', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E' };
const mono    = { fontFamily: "'JetBrains Mono', monospace" };
const display = { fontFamily: "'Bricolage Grotesque', sans-serif" };
const STEPS   = ['Account Type', 'Basic Info', 'Company Info'];
const LABEL   = { display: 'block', ...mono, fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };

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

function Select({ value, onChange, children }) {
  const [foc, setFoc] = useState(false);
  return (
    <select
      value={value} onChange={onChange}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{
        display: 'block', width: '100%', boxSizing: 'border-box',
        padding: '12px 16px',
        backgroundColor: C.surface,
        border: `2px solid ${foc ? C.brown : C.border}`,
        borderRadius: 12,
        fontSize: 14, color: C.text, outline: 'none',
        fontFamily: "'Inter', system-ui, sans-serif",
        appearance: 'none',
        transition: 'border-color 0.15s',
        boxShadow: foc ? `0 0 0 4px rgba(122,62,15,0.08)` : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >{children}</select>
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

  const [form, setForm] = useState({ role: '', email: '', password: '', confirmPassword: '', fullName: '', phone: '', companyName: '', companyCity: '', companyRegion: 'NCR (Metro Manila)' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep = () => {
    if (step === 0 && !form.role) { setError('Please select your account type.'); return false; }
    if (step === 1) {
      if (!form.email || !form.password || !form.fullName) { setError('Fill in all required fields.'); return false; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
      if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    }
    setError(''); return true;
  };

  const next = () => { if (validateStep()) setStep((s) => s + 1); };
  const back = () => { setError(''); setStep((s) => s - 1); };

  const handleSubmit = async () => {
    if (!form.companyName) { setError('Company name is required.'); return; }
    setError(''); setLoading(true);
    try {
      const { user, profile, requiresOTP } = await signUp({ email: form.email, password: form.password, fullName: form.fullName, companyName: form.companyName, phone: form.phone, role: form.role });
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

      {/* Step 1 */}
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
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min. 6 chars" focused={focus === 'password'} onFocus={() => setFocus('password')} onBlur={() => setFocus('')} />
            </div>
            <div>
              <label style={LABEL}>Confirm <span style={{ color: C.amber }}>*</span></label>
              <Input type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="••••••••" focused={focus === 'confirm'} onFocus={() => setFocus('confirm')} onBlur={() => setFocus('')} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={LABEL}>Company Name <span style={{ color: C.amber }}>*</span></label>
            <Input value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. BuildRight Construction Corp." focused={focus === 'company'} onFocus={() => setFocus('company')} onBlur={() => setFocus('')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={LABEL}>City</label>
              <Input value={form.companyCity} onChange={(e) => set('companyCity', e.target.value)} placeholder="Quezon City" focused={focus === 'city'} onFocus={() => setFocus('city')} onBlur={() => setFocus('')} />
            </div>
            <div>
              <label style={LABEL}>Region <span style={{ color: C.amber }}>*</span></label>
              <Select value={form.companyRegion} onChange={(e) => set('companyRegion', e.target.value)}>
                {['NCR (Metro Manila)', 'Region III – Central Luzon', 'Region IV-A – CALABARZON', 'Region VII – Central Visayas', 'Region XI – Davao', 'Other'].map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
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
    </AuthLayout>
  );
}
