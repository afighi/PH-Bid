-- Audit Logs Table Migration
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      TEXT,                           -- Firebase UID of the user who performed the action
  actor_name    TEXT        NOT NULL DEFAULT 'Unknown',
  actor_role    TEXT        NOT NULL DEFAULT 'system', -- 'client' | 'contractor' | 'admin' | 'system'
  action        TEXT        NOT NULL,            -- e.g. 'USER_SIGNED_UP', 'BID_AWARDED'
  resource_type TEXT,                           -- 'auth' | 'user' | 'project' | 'bid' | 'transaction'
  resource_id   TEXT,                           -- ID of the affected record
  resource_name TEXT,                           -- Human-readable name/label of the resource
  details       JSONB       DEFAULT '{}'::jsonb, -- Rich context (amounts, old/new values, etc.)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id      ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role    ON audit_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs(created_at DESC);

-- ── REQUIRED: Permissions for Supabase anon/authenticated roles ───
-- Tables created via SQL (not via the Supabase dashboard) do NOT get
-- automatic grants. Without these, all inserts fail silently.
GRANT INSERT ON public.audit_logs TO anon;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO anon;
GRANT SELECT ON public.audit_logs TO authenticated;

-- ── Row Level Security (optional — enable only if RLS is active on your other tables) ──
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to INSERT (so all roles can log their actions)
-- CREATE POLICY "authenticated_insert" ON audit_logs
--   FOR INSERT TO authenticated WITH CHECK (true);

-- Only admins can SELECT audit logs
-- CREATE POLICY "admin_select" ON audit_logs
--   FOR SELECT TO authenticated USING (
--     EXISTS (
--       SELECT 1 FROM profiles
--       WHERE profiles.id = auth.uid()::text
--         AND profiles.role = 'admin'
--     )
--   );
