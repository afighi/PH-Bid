import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../services/otpService';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';
import { auth } from '../../config/firebase';
import { COLORS, S } from '../../theme';
import { Mail, CheckCircle2, Send, RefreshCw, ArrowLeft } from 'lucide-react';

const RESEND_COOLDOWN = 60; // seconds

export default function OTPVerification() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { setAuth, profile: storeProfile } = useAuthStore();

  // Get context from router state OR fall back to store (page refresh case)
  const userId = location.state?.userId || storeProfile?.id;
  const email  = location.state?.email  || storeProfile?.email;
  const name   = location.state?.name   || storeProfile?.full_name;

  const [code,       setCode]       = useState('');
  const [error,      setError]      = useState('');
  const [verifying,  setVerifying]  = useState(false);
  const [sending,    setSending]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [cooldown,   setCooldown]   = useState(0);
  const inputRef = useRef();
  const timerRef = useRef();

  // Redirect if no context
  useEffect(() => {
    if (!userId || !email) navigate('/login', { replace: true });
  }, [userId, email, navigate]);

  // Auto-send on first mount
  useEffect(() => {
    if (userId && email) handleSend(true);
  }, []); // eslint-disable-line

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleSend = async (auto = false) => {
    if (!userId || !email) return;
    setSending(true);
    setError('');
    try {
      await sendOTP(userId, email, name);
      setSent(true);
      startCooldown();
      if (!auto) inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Enter the 6-digit code from your email.'); return; }
    setVerifying(true);
    setError('');
    try {
      await verifyOTP(userId, code);

      // Fetch updated profile and update store
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const firebaseUser = auth.currentUser;
      setAuth(firebaseUser, updatedProfile);

      navigate(`/${updatedProfile.role}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setCode('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    if (error) setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && code.length === 6) handleVerify();
  };

  if (!userId || !email) return null;

  return (
    <div style={{
      ...S.page, ...S.center,
      background: `linear-gradient(135deg, ${COLORS.primary}22 0%, ${COLORS.bg} 60%)`,
      minHeight: '100vh',
    }}>
      {/* Logo */}
      <div style={{ position: 'absolute', top: 24, left: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/buildbid_logo.png" alt="BuildBid Logo" style={{ height: 36, objectFit: 'contain' }} />
        <span style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>BuildBid <span style={{ color: COLORS.primary }}>PH</span></span>
      </div>

      <div style={{ width: '100%', maxWidth: 440, padding: '0 16px' }}>
        <div style={{ ...S.card, boxShadow: '0 8px 32px rgba(40,165,255,0.12)', textAlign: 'center' }}>

          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            backgroundColor: `${COLORS.primary}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: COLORS.primary,
          }}>
            <Mail size={32} />
          </div>

          <h2 style={{ ...S.h2, marginBottom: 8 }}>Check your email</h2>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 6 }}>
            We sent a 6-digit verification code to
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.primary, marginBottom: 24 }}>
            {email}
          </p>

          {error && <div style={{ ...S.alertError, textAlign: 'left' }}>{error}</div>}

          {/* Code input */}
          <div style={{ marginBottom: 20 }}>
            <input
              ref={inputRef}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{
                ...S.input,
                textAlign: 'center',
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: 12,
                padding: '16px 20px',
                border: `2px solid ${error ? COLORS.danger : code.length === 6 ? COLORS.success : COLORS.border}`,
                borderRadius: 14,
                color: COLORS.text,
                transition: 'border-color 0.15s',
              }}
            />
            <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 8 }}>
              Code expires in 10 minutes
            </p>
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            style={{
              ...S.btnPrimary,
              width: '100%', justifyContent: 'center',
              padding: '13px 20px', fontSize: 15, marginBottom: 16,
              opacity: (code.length !== 6 || verifying) ? 0.6 : 1,
            }}
          >
            {verifying ? 'Verifying...' : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={18} /> Verify Email</span>}
          </button>

          {/* Resend */}
          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
            {cooldown > 0 ? (
              <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
                Resend code in <strong>{cooldown}s</strong>
              </p>
            ) : (
              <button
                onClick={() => handleSend(false)}
                disabled={sending}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: COLORS.primary, fontWeight: 600,
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? 'Sending...' : sent ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><RefreshCw size={14} /> Resend code</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Send size={14} /> Send code</span>}
              </button>
            )}
          </div>

          {/* Back to login */}
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: COLORS.textLight, marginTop: 12,
              display: 'block', width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><ArrowLeft size={14} /> Back to login</span>
          </button>
        </div>
      </div>
    </div>
  );
}
