import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';
import { AuthLayout } from './AuthLayout';

const C = { brown: '#7A3E0F', dark: '#4A2509', amber: '#C77A2C', cream: '#FAF5EC', surface: '#FFFFFF', border: '#E8DFCE', text: '#1C1410', muted: '#8B7355', success: '#2D7A3E' };
const mono = { fontFamily: "'JetBrains Mono', monospace" };

const LABEL = { display: 'block', ...mono, fontSize: 11, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 };

function Input({ type = 'text', value, onChange, placeholder, focused, onFocus, onBlur, required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      style={{
        display: 'block', width: '100%', boxSizing: 'border-box',
        padding: '13px 16px',
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

export default function LoginPage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { setAuth } = useAuthStore();

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focus,   setFocus]   = useState('');
  const [hovBtn,  setHovBtn]  = useState(false);

  const infoMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, profile, requiresOTP } = await login(form.email, form.password);
      if (requiresOTP) {
        setAuth(user, profile);
        navigate('/verify-email', { state: { userId: user.uid, email: profile.email, name: profile.full_name }, replace: true });
        return;
      }
      setAuth(user, profile);
      navigate(`/${profile.role}`, { replace: true });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your BuildBid PH account to manage your projects and bids.">

      {infoMessage && (
        <div style={{ backgroundColor: '#D1FAE5', border: '1px solid rgba(45,122,62,0.3)', color: C.success, borderRadius: 12, padding: '12px 16px', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
          {infoMessage}
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#FEE2E2', border: '1px solid rgba(220,38,38,0.25)', color: '#991B1B', borderRadius: 12, padding: '12px 16px', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={LABEL}>Email Address</label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="juan@company.ph" focused={focus === 'email'}
            onFocus={() => setFocus('email')} onBlur={() => setFocus('')} required />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ ...LABEL, marginBottom: 0 }}>Password</label>
            <Link to="/forgot-password" style={{ ...mono, fontSize: 11, color: C.brown, textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••" focused={focus === 'password'}
            onFocus={() => setFocus('password')} onBlur={() => setFocus('')} required />
        </div>

        <button
          type="submit"
          disabled={loading}
          onMouseEnter={() => setHovBtn(true)}
          onMouseLeave={() => setHovBtn(false)}
          style={{
            width: '100%', padding: '14px 20px', marginTop: 4,
            backgroundColor: loading ? `${C.brown}88` : hovBtn ? C.dark : C.brown,
            color: C.cream, border: 'none',
            borderRadius: 100,
            fontSize: 15, fontWeight: 700,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
            boxShadow: hovBtn && !loading ? `0 4px 16px rgba(122,62,15,0.35)` : '0 2px 8px rgba(122,62,15,0.2)',
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div style={{ height: 1, backgroundColor: C.border, margin: '28px 0' }} />
      <p style={{ textAlign: 'center', fontSize: 14, color: C.muted, margin: 0 }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ fontWeight: 700, color: C.brown, textDecoration: 'none' }}>Create one free</Link>
      </p>
    </AuthLayout>
  );
}
