import { supabase } from '../config/supabase';
import { logAudit } from './auditService';

/** Contractor submits a milestone for approval */
export async function submitMilestoneForApproval(contractId, projectId, milestoneIndex, milestoneName, progressUpdateId) {
  const { data: existing } = await supabase
    .from('milestone_approvals')
    .select('id')
    .eq('contract_id', contractId)
    .eq('milestone_index', milestoneIndex)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('milestone_approvals')
      .update({ progress_update_id: progressUpdateId, status: 'pending', approved_at: null })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('milestone_approvals')
    .insert({ contract_id: contractId, project_id: projectId, milestone_index: milestoneIndex, milestone_name: milestoneName, progress_update_id: progressUpdateId, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Client approves or disputes a milestone */
export async function respondToMilestone(approvalId, clientId, status, aiChecklist, clientNotes) {
  const { data, error } = await supabase
    .from('milestone_approvals')
    .update({ status, approved_by: clientId, ai_checklist: aiChecklist, client_notes: clientNotes, approved_at: status === 'approved' ? new Date().toISOString() : null })
    .eq('id', approvalId)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: clientId, action: `milestone_${status}`, resourceType: 'milestone_approval', resourceId: approvalId, details: { clientNotes } });
  return data;
}

/** Get all milestone approvals for a contract */
export async function getMilestoneApprovals(contractId) {
  const { data, error } = await supabase
    .from('milestone_approvals')
    .select(`*, progress_update:progress_update_id(*), approver:approved_by(full_name)`)
    .eq('contract_id', contractId)
    .order('milestone_index', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Get progress updates for a project */
export async function getProgressUpdates(projectId) {
  const { data, error } = await supabase
    .from('progress_updates')
    .select(`*, poster:posted_by(full_name, company_name, role)`)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Contractor posts a progress update */
export async function postProgressUpdate(contractId, projectId, postedBy, { milestone_name, percentage_complete, update_title, update_description, photo_urls }) {
  const { data, error } = await supabase
    .from('progress_updates')
    .insert({ contract_id: contractId, project_id: projectId, posted_by: postedBy, milestone_name, percentage_complete, update_title, update_description, photo_urls: photo_urls || [] })
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: postedBy, action: 'progress_update_posted', resourceType: 'project', resourceId: projectId, details: { milestone_name, percentage_complete } });
  return data;
}
