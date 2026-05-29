import { supabase } from '../config/supabase';
import { database } from '../config/firebase';
import { ref, set, update } from 'firebase/database';
import { logAudit, AUDIT_ACTIONS } from './auditService';

// ─── Create Project (Client) ──────────────────────────────────────
export async function createProject(data, clientId) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, client_id: clientId, status: 'open' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Mirror to Firebase for live bid-count tracking
  await set(ref(database, `projects/${project.id}`), {
    bid_count:      0,
    status:         'open',
    latest_bid_at:  null,
    latest_bid_amt: null,
  });

  await logAudit({
    action:       AUDIT_ACTIONS.PROJECT_CREATED,
    resourceType: 'project',
    resourceId:   project.id,
    resourceName: project.title,
    details: {
      title:           project.title,
      project_type:    project.project_type,
      budget_min:      project.budget_min,
      budget_max:      project.budget_max,
      location_city:   project.location_city,
      location_region: project.location_region,
      bid_deadline:    project.bid_deadline,
    },
  });

  return project;
}

// ─── Get Open Projects (Contractor browsing) ──────────────────────
export async function getOpenProjects(filters = {}) {
  let q = supabase
    .from('projects')
    .select(`*, client:profiles!client_id(full_name, company_name, average_rating)`)
    .eq('status', 'open')
    .gt('bid_deadline', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (filters.projectType) q = q.eq('project_type', filters.projectType);
  if (filters.region)      q = q.eq('location_region', filters.region);
  if (filters.minBudget)   q = q.gte('budget_min', Number(filters.minBudget));
  if (filters.maxBudget)   q = q.lte('budget_max', Number(filters.maxBudget));
  if (filters.search)      q = q.ilike('title', `%${filters.search}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Get Client's Projects ────────────────────────────────────────
export async function getClientProjects(clientId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Get Client's Payable Projects (awarded / in_progress) ────────
export async function getPayableProjects(clientId) {
  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('id, title, status, awarded_bid_id')
    .eq('client_id', clientId)
    .in('status', ['awarded', 'in_progress'])
    .order('created_at', { ascending: false });

  if (projError) throw new Error(projError.message);
  if (!projects || projects.length === 0) return [];

  const bidIds = projects.map((p) => p.awarded_bid_id).filter(Boolean);
  if (bidIds.length === 0) return projects.map((p) => ({ ...p, awarded_bid: null }));

  const { data: bids, error: bidError } = await supabase
    .from('bids')
    .select('id, bid_amount, contractor_id, contractor:profiles!contractor_id(full_name, company_name)')
    .in('id', bidIds);

  if (bidError) throw new Error(bidError.message);

  const bidMap = Object.fromEntries((bids || []).map((b) => [b.id, b]));
  return projects.map((p) => ({
    ...p,
    awarded_bid: bidMap[p.awarded_bid_id] || null,
  }));
}

// ─── Get Single Project Detail ────────────────────────────────────
export async function getProjectDetail(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:profiles!client_id(full_name, company_name, average_rating, phone),
      documents:project_documents(*)
    `)
    .eq('id', projectId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Update Project Status ────────────────────────────────────────
export async function updateProjectStatus(projectId, status) {
  // Fetch current state for audit trail before updating
  const { data: old } = await supabase
    .from('projects')
    .select('title, status')
    .eq('id', projectId)
    .single();

  const { error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId);

  if (error) throw new Error(error.message);

  await update(ref(database, `projects/${projectId}`), { status });

  await logAudit({
    action:       AUDIT_ACTIONS.PROJECT_STATUS_CHANGED,
    resourceType: 'project',
    resourceId:   projectId,
    resourceName: old?.title,
    details: {
      project_title: old?.title,
      old_status:    old?.status,
      new_status:    status,
    },
  });
}

// ─── Upload Project Document metadata to Supabase ─────────────────
export async function saveDocumentRecord({ projectId, uploadedBy, fileName, fileUrl, fileType, fileSizeBytes }) {
  const { error } = await supabase.from('project_documents').insert({
    project_id:      projectId,
    uploaded_by:     uploadedBy,
    file_name:       fileName,
    file_url:        fileUrl,
    file_type:       fileType,
    file_size_bytes: fileSizeBytes,
  });
  if (error) throw new Error(error.message);

  await logAudit({
    action:       AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    resourceType: 'project',
    resourceId:   projectId,
    resourceName: fileName,
    details: {
      file_name:       fileName,
      file_type:       fileType,
      file_size_bytes: fileSizeBytes,
      project_id:      projectId,
    },
  });
}

// ─── Duplicate (Re-post) a project ───────────────────────────────
export async function duplicateProject(projectId, clientId) {
  const { data: src } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (!src) throw new Error('Project not found');

  const { id, created_at, updated_at, awarded_bid_id, status, ...fields } = src;

  const newDeadline = new Date();
  newDeadline.setDate(newDeadline.getDate() + 14);

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      ...fields,
      client_id:    clientId,
      status:       'open',
      bid_deadline: newDeadline.toISOString(),
      title:        fields.title + ' (Copy)',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await set(ref(database, `projects/${project.id}`), {
    bid_count: 0, status: 'open', latest_bid_at: null, latest_bid_amt: null,
  });

  return project;
}

// ─── Extend bid deadline ──────────────────────────────────────────
export async function extendDeadline(projectId, newDeadline) {
  const { data, error } = await supabase
    .from('projects')
    .update({ bid_deadline: newDeadline })
    .eq('id', projectId)
    .select('id, title, bid_deadline')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Admin: Get All Projects ──────────────────────────────────────
export async function getAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`*, client:profiles!client_id(full_name, company_name)`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}
