import { supabase } from '../config/supabase';
import { logAudit, AUDIT_ACTIONS } from './auditService';

/** Contractor asks a question on a project's Q&A board */
export async function askQuestion(projectId, askedBy, question) {
  const { data, error } = await supabase
    .from('project_qa')
    .insert({ project_id: projectId, asked_by: askedBy, question, is_public: true })
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: askedBy, action: 'qa_question_asked', resourceType: 'project', resourceId: projectId, details: { question } });
  return data;
}

/** Client answers a question (can include Archie's suggestion) */
export async function answerQuestion(qaId, answeredBy, answer) {
  const { data, error } = await supabase
    .from('project_qa')
    .update({ answer, answered_by: answeredBy, answered_at: new Date().toISOString() })
    .eq('id', qaId)
    .select()
    .single();
  if (error) throw error;
  await logAudit({ actorId: answeredBy, action: 'qa_question_answered', resourceType: 'project_qa', resourceId: qaId, details: { answer } });
  return data;
}

/** Get all Q&A for a project */
export async function getProjectQA(projectId) {
  const { data, error } = await supabase
    .from('project_qa')
    .select(`
      *,
      asker:asked_by(full_name, company_name, role),
      answerer:answered_by(full_name, company_name, role)
    `)
    .eq('project_id', projectId)
    .eq('is_public', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/** Check if contractor already asked this question */
export async function getContractorQA(projectId, contractorId) {
  const { data, error } = await supabase
    .from('project_qa')
    .select('*')
    .eq('project_id', projectId)
    .eq('asked_by', contractorId);
  if (error) throw error;
  return data || [];
}
