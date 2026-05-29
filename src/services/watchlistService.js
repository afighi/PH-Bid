import { supabase } from '../config/supabase';

export async function getWatchlist(contractorId) {
  const { data, error } = await supabase
    .from('watchlist')
    .select(`*, project:projects(*, client:profiles!client_id(full_name, company_name, average_rating))`)
    .eq('contractor_id', contractorId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function addToWatchlist(contractorId, projectId) {
  const { data, error } = await supabase
    .from('watchlist')
    .insert({ contractor_id: contractorId, project_id: projectId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeFromWatchlist(contractorId, projectId) {
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('contractor_id', contractorId)
    .eq('project_id', projectId);

  if (error) throw new Error(error.message);
}

export async function isWatched(contractorId, projectId) {
  const { data } = await supabase
    .from('watchlist')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('project_id', projectId)
    .maybeSingle();

  return !!data;
}
