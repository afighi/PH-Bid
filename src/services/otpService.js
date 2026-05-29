import emailjs from '@emailjs/browser';
import { supabase } from '../config/supabase';
import { logAudit, AUDIT_ACTIONS } from './auditService';

function generate6Digit() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Send OTP to email ────────────────────────────────────────────
export async function sendOTP(userId, email, name) {
  const code      = generate6Digit();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  // Invalidate previous unused OTPs for this user
  await supabase
    .from('email_verifications')
    .update({ expires_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('verified_at', null);

  // Store new OTP
  const { error } = await supabase.from('email_verifications').insert({
    user_id:    userId,
    email,
    otp_code:   code,
    expires_at: expiresAt,
  });
  if (error) throw new Error('Failed to generate verification code: ' + error.message);

  // Send via EmailJS
  await emailjs.send(
    process.env.REACT_APP_EMAILJS_SERVICE_ID,
    process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
    { to_email: email, to_name: name || 'User', otp_code: code },
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
  );
}

// ─── Verify OTP and activate account ─────────────────────────────
export async function verifyOTP(userId, code) {
  const { data, error } = await supabase
    .from('email_verifications')
    .select('id')
    .eq('user_id', userId)
    .eq('otp_code', code.trim())
    .is('verified_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Invalid or expired code. Please try again or request a new one.');
  }

  // Mark OTP as used
  await supabase
    .from('email_verifications')
    .update({ verified_at: new Date().toISOString() })
    .eq('id', data.id);

  // Activate the profile
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ email_verified: true, status: 'active' })
    .eq('id', userId);

  if (updateErr) throw new Error('Failed to activate account: ' + updateErr.message);

  // Fetch profile for audit context (status was pending_verification, now active)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name, email, role')
    .eq('id', userId)
    .single();

  await logAudit({
    action:       AUDIT_ACTIONS.EMAIL_VERIFIED,
    resourceType: 'auth',
    resourceId:   userId,
    resourceName: profile?.email,
    actorId:      userId,
    actorName:    profile?.company_name || profile?.full_name,
    actorRole:    profile?.role,
    details: {
      email:       profile?.email,
      verified_at: new Date().toISOString(),
    },
  });
}
