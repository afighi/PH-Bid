import { supabase } from '../config/supabase';

export async function getMyTemplates(contractorId) {
  const { data, error } = await supabase
    .from('bid_templates')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveTemplate(contractorId, { name, coverLetter, technicalProposal, paymentTerms }) {
  const { data, error } = await supabase
    .from('bid_templates')
    .insert({
      contractor_id:      contractorId,
      name,
      cover_letter:       coverLetter,
      technical_proposal: technicalProposal,
      payment_terms:      paymentTerms,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTemplate(id, { name, coverLetter, technicalProposal, paymentTerms }) {
  const { data, error } = await supabase
    .from('bid_templates')
    .update({
      name,
      cover_letter:       coverLetter,
      technical_proposal: technicalProposal,
      payment_terms:      paymentTerms,
      updated_at:         new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('bid_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
