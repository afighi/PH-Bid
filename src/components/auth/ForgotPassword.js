import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import { COLORS, S } from '../../theme';
import { Key, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [focus,   setFocus]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError('Could not send reset email. Make sure your email is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...S.page, ...S.center, background: `linear-gradient(135deg, ${COLORS.primary}22 0%, ${COLORS.bg} 60%)` }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 16px' }}>
        <div style={{ ...S.card, boxShadow: '0 8px 32px rgba(40,165,255,0.12)' }}>
          {!sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ marginBottom: 12 }}><Key size={40} color={COLORS.primary} /></div>
                <h2 style={{ ...S.h2, marginBottom: 6 }}>Reset Password</h2>
                <p style={{ ...S.body }}>Enter your email and we'll send you a reset link.</p>
              </div>

              {error && <div style={S.alertError}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <div style={S.formGroup}>
                  <label style={S.label}>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    style={{ ...S.input, ...(focus ? S.inputFocus : {}) }}
                    placeholder="juan@company.ph"
                    required
                  />
                </div>
                <button type="submit" disabled={loading}
                  style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', padding: '13px 20px', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: COLORS.textMuted, marginTop: 20 }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ marginBottom: 16 }}><Mail size={48} color={COLORS.primary} /></div>
              <h2 style={{ ...S.h2, marginBottom: 10 }}>Check Your Email</h2>
              <p style={{ ...S.body, marginBottom: 24 }}>
                We sent a password reset link to <strong>{email}</strong>. Check your inbox (and spam folder).
              </p>
              <Link to="/login" style={{ ...S.btnPrimary, textDecoration: 'none', justifyContent: 'center', padding: '13px 20px', display: 'flex' }}>
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
