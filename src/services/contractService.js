import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, push } from 'firebase/database';

const SELECT = `
  *,
  project:projects(id, title, project_type, location_city, location_region, scope_of_work),
  bid:bids(id, bid_amount, proposed_start_date, proposed_end_date, cover_letter, technical_proposal, payment_terms),
  client:profiles!client_id(id, full_name, company_name, phone, email),
  contractor:profiles!contractor_id(id, full_name, company_name, phone, license_number, pcab_classification)
`;

export async function createContract({ projectId, bidId, clientId, contractorId, contractAmount, startDate, endDate, scopeSummary, terms }) {
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      project_id:            projectId,
      bid_id:                bidId,
      client_id:             clientId,
      contractor_id:         contractorId,
      contract_amount:       contractAmount,
      start_date:            startDate || new Date().toISOString().slice(0, 10),
      end_date:              endDate   || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      scope_summary:         scopeSummary,
      terms_and_conditions:  terms,
      status:                'pending_signatures',
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);

  await push(ref(database, `notifications/${contractorId}`), {
    type:       'contract_created',
    title:      'Contract Ready to Sign',
    message:    `A contract has been created for "${data.project?.title}". Please review and sign.`,
    project_id: projectId,
    is_read:    false,
    created_at: Date.now(),
  });

  return data;
}

export async function signContract(contractId, role) {
  const field = role === 'client' ? 'client_signed_at' : 'contractor_signed_at';
  const now   = new Date().toISOString();

  const { data: current } = await supabase
    .from('contracts')
    .select('client_signed_at, contractor_signed_at, client_id, contractor_id, project_id')
    .eq('id', contractId)
    .single();

  const otherSigned = role === 'client' ? current.contractor_signed_at : current.client_signed_at;
  const newStatus   = otherSigned ? 'active' : 'pending_signatures';

  const { data, error } = await supabase
    .from('contracts')
    .update({ [field]: now, status: newStatus, updated_at: now })
    .eq('id', contractId)
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);

  if (newStatus === 'active') {
    const notifyId = role === 'client' ? current.contractor_id : current.client_id;
    await push(ref(database, `notifications/${notifyId}`), {
      type:       'contract_active',
      title:      'Contract Fully Signed',
      message:    'Both parties have signed. The contract is now active.',
      project_id: current.project_id,
      is_read:    false,
      created_at: Date.now(),
    });
  }

  return data;
}

export async function getContractsForUser(userId) {
  const { data, error } = await supabase
    .from('contracts')
    .select(SELECT)
    .or(`client_id.eq.${userId},contractor_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getContractForProject(projectId) {
  const { data, error } = await supabase
    .from('contracts')
    .select(SELECT)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
