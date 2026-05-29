import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, push } from 'firebase/database';

const SELECT = `
  *,
  raised_by_profile:profiles!disputes_raised_by_fkey(full_name, company_name, role),
  against_profile:profiles!disputes_against_fkey(full_name, company_name, role),
  project:projects(title)
`;

export async function raiseDispute({ projectId, contractId, raisedBy, against, title, description, evidenceUrls }) {
  const { data, error } = await supabase
    .from('disputes')
    .insert({
      project_id:    projectId,
      contract_id:   contractId || null,
      raised_by:     raisedBy,
      against,
      title,
      description,
      evidence_urls: evidenceUrls || [],
      status:        'open',
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);

  await push(ref(database, `notifications/${against}`), {
    type:       'dispute_raised',
    title:      'Dispute Filed Against You',
    message:    `A dispute has been raised: "${title}". Please check the platform for details.`,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });

  await push(ref(database, 'notifications/admin'), {
    type:       'new_dispute',
    title:      'New Dispute Filed',
    message:    `"${title}" — requires admin review.`,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });

  return data;
}

export async function getDisputesForUser(userId) {
  const { data, error } = await supabase
    .from('disputes')
    .select(SELECT)
    .or(`raised_by.eq.${userId},against.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAllDisputes() {
  const { data, error } = await supabase
    .from('disputes')
    .select(SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function resolveDispute(id, { resolution, adminId, status }) {
  const { data, error } = await supabase
    .from('disputes')
    .update({ resolution, admin_id: adminId, status, resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);

  for (const uid of [data.raised_by, data.against]) {
    await push(ref(database, `notifications/${uid}`), {
      type:       'dispute_resolved',
      title:      'Dispute Resolved',
      message:    `The dispute "${data.title}" has been resolved by admin.`,
      project_id: data.project_id,
      is_read:    false,
      created_at: Date.now(),
    });
  }

  return data;
}
