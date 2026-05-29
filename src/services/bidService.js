import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, set, update, push, increment } from 'firebase/database';
import { logAudit, AUDIT_ACTIONS } from './auditService';

// ─── Submit / Revise Bid (Contractor) ────────────────────────────
export async function submitBid(bidData, contractorId) {
  // Check if contractor already bid on this project
  const { data: existing } = await supabase
    .from('bids')
    .select('id, revision_number')
    .eq('project_id', bidData.project_id)
    .eq('contractor_id', contractorId)
    .eq('is_latest_revision', true)
    .maybeSingle();

  if (existing) {
    // Mark old bid as not the latest
    await supabase.from('bids').update({ is_latest_revision: false }).eq('id', existing.id);
  }

  // Insert new bid
  const { data: bid, error } = await supabase
    .from('bids')
    .insert({
      ...bidData,
      contractor_id:     contractorId,
      status:            'submitted',
      is_latest_revision: true,
      revision_number:   existing ? (existing.revision_number + 1) : 1,
      previous_bid_id:   existing?.id || null,
    })
    .select(`*, contractor:profiles!contractor_id(full_name, company_name, average_rating)`)
    .single();

  if (error) throw new Error(error.message);

  // Push bid to Firebase for live updates on client dashboard
  await set(ref(database, `bids/${bidData.project_id}/${bid.id}`), {
    contractor_id:   contractorId,
    contractor_name: bid.contractor.company_name || bid.contractor.full_name,
    amount:          bid.bid_amount,
    submitted_at:    Date.now(),
    status:          'submitted',
  });

  // Update project's live counters in Firebase
  await update(ref(database, `projects/${bidData.project_id}`), {
    ...(existing ? {} : { bid_count: increment(1) }),
    latest_bid_at:  Date.now(),
    latest_bid_amt: bid.bid_amount,
  });

  // Fetch project to know client_id and title
  const { data: project } = await supabase
    .from('projects')
    .select('client_id, title')
    .eq('id', bidData.project_id)
    .single();

  const notifMsg = `${bid.contractor.company_name || bid.contractor.full_name} submitted a bid of ₱${Number(bid.bid_amount).toLocaleString('en-PH')}`;

  await push(ref(database, `notifications/${project.client_id}`), {
    type:       'new_bid',
    title:      'New Bid Received',
    message:    notifMsg,
    project_id: bidData.project_id,
    bid_id:     bid.id,
    is_read:    false,
    created_at: Date.now(),
  });

  await supabase.from('notifications').insert({
    user_id:            project.client_id,
    type:               'new_bid',
    title:              'New Bid Received',
    message:            notifMsg,
    related_project_id: bidData.project_id,
    related_bid_id:     bid.id,
  });

  await logAudit({
    action:       existing ? AUDIT_ACTIONS.BID_REVISED : AUDIT_ACTIONS.BID_SUBMITTED,
    resourceType: 'bid',
    resourceId:   bid.id,
    resourceName: project.title,
    details: {
      project_id:       bidData.project_id,
      project_title:    project.title,
      bid_amount:       bid.bid_amount,
      revision_number:  bid.revision_number,
      previous_bid_id:  bid.previous_bid_id || null,
      contractor_name:  bid.contractor.company_name || bid.contractor.full_name,
    },
  });

  return bid;
}

// ─── Get All Bids for a Project (Client) ─────────────────────────
export async function getProjectBids(projectId) {
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      contractor:profiles!contractor_id(
        id, full_name, company_name, average_rating,
        completed_projects, license_number, specializations, years_experience
      )
    `)
    .eq('project_id', projectId)
    .eq('is_latest_revision', true)
    .neq('status', 'withdrawn')
    .order('bid_amount', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Get Contractor's Own Bids ────────────────────────────────────
export async function getMyBids(contractorId) {
  const { data, error } = await supabase
    .from('bids')
    .select(`*, project:projects(id, title, status, bid_deadline, location_city, location_region)`)
    .eq('contractor_id', contractorId)
    .eq('is_latest_revision', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Award Bid (Client) ───────────────────────────────────────────
export async function awardBid(bidId, projectId) {
  const { data: bid } = await supabase
    .from('bids')
    .select(`contractor_id, bid_amount, contractor:profiles!contractor_id(full_name, company_name)`)
    .eq('id', bidId)
    .single();

  const { data: project } = await supabase
    .from('projects')
    .select('title, client_id')
    .eq('id', projectId)
    .single();

  // 1. Award winning bid
  await supabase.from('bids').update({ status: 'awarded' }).eq('id', bidId);

  // 2. Reject all others on this project
  await supabase
    .from('bids')
    .update({ status: 'rejected' })
    .eq('project_id', projectId)
    .neq('id', bidId)
    .eq('is_latest_revision', true);

  // 3. Update project
  await supabase.from('projects').update({
    status:         'awarded',
    awarded_bid_id: bidId,
  }).eq('id', projectId);

  // 4. Update Firebase live status
  await update(ref(database, `projects/${projectId}`), { status: 'awarded' });

  // 5. Notify winning contractor (Firebase = instant)
  const winMsg = `Your bid for "${project.title}" has been awarded! The client will contact you to finalize the contract.`;
  await push(ref(database, `notifications/${bid.contractor_id}`), {
    type:       'bid_awarded',
    title:      'Congratulations! You Won the Bid',
    message:    winMsg,
    project_id: projectId,
    bid_id:     bidId,
    is_read:    false,
    created_at: Date.now(),
  });

  await supabase.from('notifications').insert({
    user_id:            bid.contractor_id,
    type:               'bid_awarded',
    title:              'Congratulations! You Won the Bid',
    message:            winMsg,
    related_project_id: projectId,
    related_bid_id:     bidId,
  });

  await logAudit({
    action:       AUDIT_ACTIONS.BID_AWARDED,
    resourceType: 'bid',
    resourceId:   bidId,
    resourceName: project.title,
    details: {
      project_id:      projectId,
      project_title:   project.title,
      contractor_id:   bid.contractor_id,
      contractor_name: bid.contractor.company_name || bid.contractor.full_name,
      bid_amount:      bid.bid_amount,
    },
  });

  return { success: true };
}

// ─── Withdraw Bid (Contractor) ────────────────────────────────────
export async function withdrawBid(bidId, reason = null) {
  const { data: bid } = await supabase
    .from('bids')
    .select('project_id, bid_amount, project:projects!project_id(title)')
    .eq('id', bidId)
    .single();

  const { error } = await supabase
    .from('bids')
    .update({ status: 'withdrawn', ...(reason ? { withdrawal_reason: reason } : {}) })
    .eq('id', bidId);

  if (error) throw new Error(error.message);

  await logAudit({
    action:       AUDIT_ACTIONS.BID_WITHDRAWN,
    resourceType: 'bid',
    resourceId:   bidId,
    resourceName: bid?.project?.title,
    details: {
      project_id:    bid?.project_id,
      project_title: bid?.project?.title,
      bid_amount:    bid?.bid_amount,
    },
  });
}
