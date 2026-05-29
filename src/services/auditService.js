import { supabase } from '../config/supabase';
import { useAuthStore } from '../stores/authStore';

export const AUDIT_ACTIONS = {
  // Authentication
  USER_SIGNED_UP:       'USER_SIGNED_UP',
  USER_LOGGED_IN:       'USER_LOGGED_IN',
  USER_LOGGED_OUT:      'USER_LOGGED_OUT',
  EMAIL_VERIFIED:       'EMAIL_VERIFIED',
  PASSWORD_RESET_SENT:  'PASSWORD_RESET_SENT',

  // Admin user management
  CONTRACTOR_APPROVED:  'CONTRACTOR_APPROVED',
  USER_SUSPENDED:       'USER_SUSPENDED',
  USER_REACTIVATED:     'USER_REACTIVATED',

  // Projects
  PROJECT_CREATED:        'PROJECT_CREATED',
  PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',
  DOCUMENT_UPLOADED:      'DOCUMENT_UPLOADED',

  // Bids
  BID_SUBMITTED: 'BID_SUBMITTED',
  BID_REVISED:   'BID_REVISED',
  BID_AWARDED:   'BID_AWARDED',
  BID_WITHDRAWN: 'BID_WITHDRAWN',

  // Transactions
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RELEASED:  'PAYMENT_RELEASED',
};

// ─── Log an audit event ───────────────────────────────────────────
// Failures never break the main flow — but they ARE logged to console in dev.
export async function logAudit({
  action,
  resourceType,
  resourceId,
  resourceName,
  details = {},
  // Explicit actor overrides — used when auth store isn't populated yet (e.g. signup)
  actorId,
  actorName,
  actorRole,
}) {
  try {
    const { profile } = useAuthStore.getState();

    const { error } = await supabase.from('audit_logs').insert({
      actor_id:      actorId   ?? profile?.id   ?? null,
      actor_name:    actorName ?? profile?.company_name ?? profile?.full_name ?? 'System',
      actor_role:    actorRole ?? profile?.role ?? 'system',
      action,
      resource_type: resourceType  ?? null,
      resource_id:   resourceId    != null ? String(resourceId) : null,
      resource_name: resourceName  ?? null,
      details,
    });

    if (error) {
      console.error('[AuditLog] Insert failed for action:', action, '|', error.message);
    }
  } catch (err) {
    console.error('[AuditLog] Unexpected error for action:', action, err);
  }
}

// ─── Fetch audit logs (admin view, with server-side filtering) ────
export async function getAuditLogs(filters = {}) {
  const limit  = filters.limit  ?? 100;
  const offset = filters.offset ?? 0;

  let q = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.actorRole)    q = q.eq('actor_role',    filters.actorRole);
  if (filters.action)       q = q.eq('action',        filters.action);
  if (filters.resourceType) q = q.eq('resource_type', filters.resourceType);

  if (filters.dateFrom) {
    q = q.gte('created_at', new Date(filters.dateFrom).toISOString());
  }
  if (filters.dateTo) {
    // Include the full day by bumping to the next day
    const end = new Date(filters.dateTo);
    end.setDate(end.getDate() + 1);
    q = q.lt('created_at', end.toISOString());
  }

  // Multi-column text search
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    q = q.or(`actor_name.ilike.%${s}%,resource_name.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}
