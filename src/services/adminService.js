import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, push } from 'firebase/database';
import { logAudit, AUDIT_ACTIONS } from './auditService';

export async function getPendingContractors() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'contractor')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function approveContractor(contractorId) {
  // Set to pending_verification — contractor must verify email before logging in
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'pending_verification' })
    .eq('id', contractorId);

  if (error) throw new Error(error.message);

  // Fetch contractor info to send OTP and log audit
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, company_name')
    .eq('id', contractorId)
    .single();

  // Send OTP to contractor's email
  const { sendOTP } = await import('./otpService');
  await sendOTP(contractorId, profile.email, profile.full_name);

  // Firebase notification — tells them to check email
  await push(ref(database, `notifications/${contractorId}`), {
    type:       'account_approved',
    title:      'Application Approved!',
    message:    'Your contractor application has been approved! Check your email for a verification code to activate your account.',
    is_read:    false,
    created_at: Date.now(),
  });

  await logAudit({
    action:       AUDIT_ACTIONS.CONTRACTOR_APPROVED,
    resourceType: 'user',
    resourceId:   contractorId,
    resourceName: profile.company_name || profile.full_name,
    details: {
      target_name:  profile.company_name || profile.full_name,
      target_email: profile.email,
      approved_at:  new Date().toISOString(),
    },
  });
}

export async function suspendUser(userId) {
  // Fetch target info for audit before updating
  const { data: target } = await supabase
    .from('profiles')
    .select('full_name, company_name, email, role')
    .eq('id', userId)
    .single();

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit({
    action:       AUDIT_ACTIONS.USER_SUSPENDED,
    resourceType: 'user',
    resourceId:   userId,
    resourceName: target?.company_name || target?.full_name,
    details: {
      target_name:  target?.company_name || target?.full_name,
      target_email: target?.email,
      target_role:  target?.role,
    },
  });
}

export async function reactivateUser(userId) {
  // Fetch target info for audit before updating
  const { data: target } = await supabase
    .from('profiles')
    .select('full_name, company_name, email, role')
    .eq('id', userId)
    .single();

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await logAudit({
    action:       AUDIT_ACTIONS.USER_REACTIVATED,
    resourceType: 'user',
    resourceId:   userId,
    resourceName: target?.company_name || target?.full_name,
    details: {
      target_name:  target?.company_name || target?.full_name,
      target_email: target?.email,
      target_role:  target?.role,
    },
  });
}

export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`*, client:profiles!client_id(full_name, company_name)`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      sender:profiles!sender_id(full_name, company_name, role),
      receiver:profiles!receiver_id(full_name, company_name, role)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPlatformStats() {
  const [
    { count: totalUsers },
    { count: pendingContractors },
    { count: totalProjects },
    { count: openProjects },
    { count: totalBids },
    { data: txData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('role', 'contractor'),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('bids').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('amount').eq('status', 'completed'),
  ]);

  const totalVolume = txData ? txData.reduce((s, t) => s + Number(t.amount), 0) : 0;

  return { totalUsers, pendingContractors, totalProjects, openProjects, totalBids, totalVolume, totalTransactions: txData?.length || 0 };
}
