import { supabase } from '../config/supabase';

export async function getPortfolio(contractorId) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('contractor_id', contractorId)
    .order('completed_year', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function addPortfolioItem(contractorId, item) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .insert({ ...item, contractor_id: contractorId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePortfolioItem(id, updates) {
  const { data, error } = await supabase
    .from('portfolio_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePortfolioItem(id) {
  const { error } = await supabase
    .from('portfolio_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
