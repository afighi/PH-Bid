import { supabase } from '../config/supabase';
import { logAudit } from './auditService';

export async function createChangeOrder(contractId, projectId, requestedBy, { title, description, impact_cost, impact_days, ai_analysis }) {
  const { data, error } = await supabase
    .from('change_orders')
    .insert({ contract_id: contractId, project_id: projectId, requested_by: requestedBy, title, description, impact_cost: impact_cost || 0, impact_days: impact_days || 0, ai_analysis })
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: requestedBy, action: 'change_order_submitted', resourceType: 'contract', resourceId: contractId, details: { title, impact_cost, impact_days } });
  return data;
}

export async function respondToChangeOrder(changeOrderId, clientId, status, clientResponse) {
  const { data, error } = await supabase
    .from('change_orders')
    .update({ status, client_response: clientResponse, resolved_at: new Date().toISOString() })
    .eq('id', changeOrderId)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: clientId, action: `change_order_${status}`, resourceType: 'change_order', resourceId: changeOrderId, details: { clientResponse } });
  return data;
}

export async function getChangeOrders(contractId) {
  const { data, error } = await supabase
    .from('change_orders')
    .select(`*, requester:requested_by(full_name, company_name, role)`)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProjectChangeOrders(projectId) {
  const { data, error } = await supabase
    .from('change_orders')
    .select(`*, requester:requested_by(full_name, company_name, role)`)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
