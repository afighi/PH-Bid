-- ─────────────────────────────────────────────────────────────────
-- BuildBid PH — Add cover_image column to projects
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT NULL;

-- Optional: add a comment describing the column
COMMENT ON COLUMN projects.cover_image IS 'Firebase Storage URL for the project cover photo';
