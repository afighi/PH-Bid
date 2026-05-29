import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, push, update } from 'firebase/database';
import { logAudit, AUDIT_ACTIONS } from './auditService';

// ─── Advance project status based on payment type ─────────────────
async function advanceProjectStatus(projectId, transactionType, contractorId, projectTitle) {
  const nextStatus =
    transactionType === 'downpayment'    ? 'in_progress' :
    transactionType === 'final_payment'  ? 'completed'   : null;

  if (!nextStatus || !projectId) return;

  await supabase.from('projects').update({ status: nextStatus }).eq('id', projectId);
  await update(ref(database, `projects/${projectId}`), { status: nextStatus });

  const messages = {
    in_progress: `Project "${projectTitle}" is now In Progress after receiving your down payment.`,
    completed:   `Project "${projectTitle}" has been marked Completed after the final payment. Great work!`,
  };
  await push(ref(database, `notifications/${contractorId}`), {
    type:       'project_status_changed',
    title:      nextStatus === 'completed' ? 'Project Completed!' : 'Project Started!',
    message:    messages[nextStatus],
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });
  await supabase.from('notifications').insert({
    user_id:            contractorId,
    type:               'project_status_changed',
    title:              nextStatus === 'completed' ? 'Project Completed!' : 'Project Started!',
    message:            messages[nextStatus],
    related_project_id: projectId,
  });

  // Audit the auto status change triggered by the payment
  await logAudit({
    action:       AUDIT_ACTIONS.PROJECT_STATUS_CHANGED,
    resourceType: 'project',
    resourceId:   projectId,
    resourceName: projectTitle,
    details: {
      project_title:    projectTitle,
      new_status:       nextStatus,
      triggered_by:     'payment',
      transaction_type: transactionType,
    },
  });
}

// ─── Create a Pending PayMongo Transaction ────────────────────────
export async function createPendingTransaction({
  projectId, senderId, receiverId, amount,
  transactionType, milestoneName, paymongoLinkId, notes,
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      project_id:       projectId,
      sender_id:        senderId,
      receiver_id:      receiverId,
      amount:           Number(amount),
      transaction_type: transactionType,
      milestone_name:   milestoneName,
      payment_method:   'paymongo',
      reference_number: paymongoLinkId,
      notes,
      status:           'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAudit({
    action:       AUDIT_ACTIONS.PAYMENT_INITIATED,
    resourceType: 'transaction',
    resourceId:   data.id,
    details: {
      project_id:       projectId,
      amount:           Number(amount),
      transaction_type: transactionType,
      milestone_name:   milestoneName || null,
      payment_method:   'paymongo',
      paymongo_link_id: paymongoLinkId,
    },
  });

  return data;
}

// ─── Confirm a PayMongo Transaction after payment ─────────────────
export async function confirmPaymongoTransaction(transactionId, receiverId, projectId, amount, milestoneName, transactionType) {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status: 'completed', released_at: new Date().toISOString() })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const msg = `Payment of ₱${Number(amount).toLocaleString('en-PH')} has been received via PayMongo${milestoneName ? ` for "${milestoneName}"` : ''}.`;
  await push(ref(database, `notifications/${receiverId}`), {
    type:       'payment_received',
    title:      'Payment Received!',
    message:    msg,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });
  await supabase.from('notifications').insert({
    user_id:            receiverId,
    type:               'payment_received',
    title:              'Payment Received!',
    message:            msg,
    related_project_id: projectId,
  });

  await logAudit({
    action:       AUDIT_ACTIONS.PAYMENT_CONFIRMED,
    resourceType: 'transaction',
    resourceId:   transactionId,
    details: {
      project_id:       projectId,
      amount:           Number(amount),
      transaction_type: transactionType,
      milestone_name:   milestoneName || null,
      payment_method:   'paymongo',
    },
  });

  const { data: proj } = await supabase.from('projects').select('title').eq('id', projectId).single();
  await advanceProjectStatus(projectId, transactionType, receiverId, proj?.title || '');

  return data;
}

// ─── Release Payment (Client) — manual / non-PayMongo ─────────────
export async function releasePayment({
  projectId, senderId, receiverId,
  amount, transactionType, milestoneName,
  paymentMethod, referenceNumber, notes,
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      project_id:       projectId,
      sender_id:        senderId,
      receiver_id:      receiverId,
      amount:           Number(amount),
      transaction_type: transactionType,
      milestone_name:   milestoneName,
      payment_method:   paymentMethod,
      reference_number: referenceNumber,
      notes,
      status:           'completed',
      released_at:      new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const msg = `Payment of ₱${Number(amount).toLocaleString('en-PH')} has been released${milestoneName ? ` for "${milestoneName}"` : ''}.`;
  await push(ref(database, `notifications/${receiverId}`), {
    type:       'payment_received',
    title:      'Payment Released!',
    message:    msg,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });
  await supabase.from('notifications').insert({
    user_id:            receiverId,
    type:               'payment_received',
    title:              'Payment Released!',
    message:            msg,
    related_project_id: projectId,
  });

  await logAudit({
    action:       AUDIT_ACTIONS.PAYMENT_RELEASED,
    resourceType: 'transaction',
    resourceId:   data.id,
    details: {
      project_id:       projectId,
      amount:           Number(amount),
      transaction_type: transactionType,
      milestone_name:   milestoneName || null,
      payment_method:   paymentMethod,
      reference_number: referenceNumber || null,
    },
  });

  const { data: proj } = await supabase.from('projects').select('title').eq('id', projectId).single();
  await advanceProjectStatus(projectId, transactionType, receiverId, proj?.title || '');

  return data;
}

// ─── Get Transactions for a User ──────────────────────────────────
export async function getTransactions(userId, role) {
  const col = role === 'client' ? 'sender_id' : 'receiver_id';

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      project:projects(title),
      sender:profiles!sender_id(full_name, company_name),
      receiver:profiles!receiver_id(full_name, company_name)
    `)
    .eq(col, userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Admin: All Transactions ──────────────────────────────────────
export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      project:projects(title),
      sender:profiles!sender_id(full_name, company_name),
      receiver:profiles!receiver_id(full_name, company_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
