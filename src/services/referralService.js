import { supabase } from '../config/supabase';

function generateCode(userId) {
  return 'BB' + userId.slice(0, 6).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export async function getOrCreateReferralCode(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (profile?.referral_code) return profile.referral_code;

  const code = generateCode(userId);
  await supabase.from('profiles').update({ referral_code: code }).eq('id', userId);
  return code;
}

export async function getMyReferrals(userId) {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, referred:profiles!referred_id(full_name, company_name, role, created_at)')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function sendReferralInvite(referrerId, referredEmail, referralCode) {
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrerId)
    .eq('referred_email', referredEmail)
    .maybeSingle();

  if (existing) throw new Error('You already sent an invite to this email.');

  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id:    referrerId,
      referred_email: referredEmail,
      referral_code:  referralCode + '-' + Date.now(),
      status:         'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function claimReferral(referralCode, referredUserId) {
  const { data } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referral_code', referralCode)
    .eq('status', 'pending')
    .maybeSingle();

  if (!data) return;

  await supabase.from('referrals').update({
    referred_id:  referredUserId,
    status:       'signed_up',
    completed_at: new Date().toISOString(),
  }).eq('id', data.id);
}
