import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, database } from '../config/firebase';
import { ref, set, push } from 'firebase/database';
import { supabase } from '../config/supabase';
import { sendOTP } from './otpService';
import { logAudit, AUDIT_ACTIONS } from './auditService';
import { useAuthStore } from '../stores/authStore';

// ─── Sign Up ──────────────────────────────────────────────────────
export async function signUp({ email, password, fullName, companyName, phone, role, companyCity, companyRegion }) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  // Clients → pending_verification (needs OTP)
  // Contractors → pending (needs admin approval first)
  const status = role === 'client' ? 'pending_verification' : 'pending';

  const { error } = await supabase.from('profiles').insert({
    id:            user.uid,
    email,
    full_name:     fullName,
    company_name:  companyName,
    company_city:  companyCity || null,
    company_region: companyRegion || null,
    phone,
    role,
    status,
    email_verified: false,
  });

  if (error) {
    await user.delete();
    throw new Error('Failed to create profile: ' + error.message);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.uid)
    .single();

  // Push to Firebase for admin real-time dashboard
  await set(ref(database, `admin_queue/users/${user.uid}`), {
    id: user.uid, full_name: fullName, company_name: companyName || null,
    email, role, status, created_at: Date.now(),
  });

  // Admin notification
  const notifMsg = role === 'contractor'
    ? `${companyName || fullName} has registered as a contractor and needs approval.`
    : `${companyName || fullName} (${email}) just created a client account.`;
  await push(ref(database, 'notifications/admin'), {
    type: role === 'contractor' ? 'new_contractor' : 'new_client',
    title: role === 'contractor' ? 'New Contractor Registration' : 'New Client Registered',
    message: notifMsg, is_read: false, created_at: Date.now(),
  });

  // Audit: record sign-up with explicit actor info (auth store not yet updated)
  await logAudit({
    action:       AUDIT_ACTIONS.USER_SIGNED_UP,
    resourceType: 'user',
    resourceId:   user.uid,
    resourceName: email,
    actorId:      user.uid,
    actorName:    companyName || fullName,
    actorRole:    role,
    details: { email, role, full_name: fullName, company_name: companyName || null, initial_status: status },
  });

  // For clients: send OTP immediately
  if (role === 'client') {
    await sendOTP(user.uid, email, fullName);
    return { user, profile, requiresOTP: true };
  }

  return { user, profile };
}

// ─── Login ────────────────────────────────────────────────────────
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.uid)
    .single();

  if (error || !profile) {
    await signOut(auth);
    throw new Error('Profile not found. Please contact support.');
  }

  if (profile.status === 'suspended') {
    await signOut(auth);
    throw new Error('Your account has been suspended. Please contact admin.');
  }

  if (profile.status === 'pending') {
    await signOut(auth);
    throw new Error('Your contractor application is pending admin approval. Please wait.');
  }

  // Audit login (pass explicit actor info — auth store not updated yet)
  await logAudit({
    action:       AUDIT_ACTIONS.USER_LOGGED_IN,
    resourceType: 'auth',
    resourceId:   user.uid,
    resourceName: email,
    actorId:      user.uid,
    actorName:    profile.company_name || profile.full_name,
    actorRole:    profile.role,
    details:      { email, status: profile.status },
  });

  // Needs OTP verification — keep Firebase session alive, caller handles redirect
  if (profile.status === 'pending_verification') {
    return { user, profile, requiresOTP: true };
  }

  return { user, profile };
}

// ─── Logout ───────────────────────────────────────────────────────
export async function logout() {
  // Capture profile before clearing auth store
  const { profile } = useAuthStore.getState();

  await logAudit({
    action:       AUDIT_ACTIONS.USER_LOGGED_OUT,
    resourceType: 'auth',
    actorId:      profile?.id,
    actorName:    profile?.company_name || profile?.full_name,
    actorRole:    profile?.role,
    details:      {},
  });

  await signOut(auth);
}

// ─── Forgot Password ──────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);

  await logAudit({
    action:       AUDIT_ACTIONS.PASSWORD_RESET_SENT,
    resourceType: 'auth',
    resourceName: email,
    details:      { email },
  });
}

// ─── Auth State Listener (used in App.js) ─────────────────────────
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.uid)
        .single();

      // pending_verification: set auth so store has user info
      // ProtectedRoute will redirect to /verify-email
      callback({ user, profile });
    } else {
      callback(null);
    }
  });
}
