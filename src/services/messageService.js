import { supabase } from '../config/supabase';

export async function sendMessage(projectId, senderId, receiverId, content) {
  const { data, error } = await supabase
    .from('project_messages')
    .insert({ project_id: projectId, sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMessages(projectId, userId) {
  const { data, error } = await supabase
    .from('project_messages')
    .select(`*, sender:sender_id(full_name, company_name, role, avatar_url)`)
    .eq('project_id', projectId)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function markMessagesRead(projectId, userId) {
  const { error } = await supabase
    .from('project_messages')
    .update({ is_read: true })
    .eq('project_id', projectId)
    .eq('receiver_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('project_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count || 0;
}

export async function getNegotiations(bidId) {
  const { data, error } = await supabase
    .from('bid_negotiations')
    .select(`*, sender:sender_id(full_name, company_name, role)`)
    .eq('bid_id', bidId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function sendNegotiationMessage(bidId, projectId, senderId, message, proposedAmount) {
  const { data, error } = await supabase
    .from('bid_negotiations')
    .insert({ bid_id: bidId, project_id: projectId, sender_id: senderId, message, proposed_amount: proposedAmount || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
