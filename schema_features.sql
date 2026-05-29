-- ================================================================
-- BuildBid PH — Feature Expansion Schema
-- Safe to run multiple times. Only adds what is missing.
-- Run in Supabase SQL Editor → New Query
-- ================================================================

-- ── 1. Add missing columns to existing tables ─────────────────────

-- profiles: verification + referral + avatar (code uses avatar_url; schema has profile_photo_url)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified   BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url    TEXT;

-- bids: withdrawal reason
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS withdrawal_reason TEXT;

-- contracts: e-signature columns + scope summary
-- (contracts table already exists with client_id/contractor_id as text)
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS scope_summary        TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS client_signed_at     TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contractor_signed_at TIMESTAMPTZ;

-- reviews: reviewer role (already has all rating columns)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_role TEXT;

-- transactions: contractor_id for earnings dashboard queries
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS contractor_id TEXT
  REFERENCES public.profiles(id);

-- ── 2. New tables ─────────────────────────────────────────────────

-- Portfolio items
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  project_type   TEXT,
  location       TEXT,
  completed_year INT,
  budget         NUMERIC,
  photos         TEXT[],
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Bid templates
CREATE TABLE IF NOT EXISTS public.bid_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id       TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  cover_letter        TEXT,
  technical_proposal  TEXT,
  payment_terms       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Watchlist (saved projects)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id  TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contractor_id, project_id)
);

-- Disputes
CREATE TABLE IF NOT EXISTS public.disputes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id  UUID REFERENCES public.contracts(id),
  raised_by    TEXT NOT NULL REFERENCES public.profiles(id),
  against      TEXT NOT NULL REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  evidence_urls TEXT[],
  status       TEXT DEFAULT 'open',
  resolution   TEXT,
  admin_id     TEXT REFERENCES public.profiles(id),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id    TEXT NOT NULL REFERENCES public.profiles(id),
  referred_email TEXT NOT NULL,
  referred_id    TEXT REFERENCES public.profiles(id),
  status         TEXT DEFAULT 'pending',
  referral_code  TEXT UNIQUE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

-- ── 3. RLS ────────────────────────────────────────────────────────

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read portfolio'  AND tablename = 'portfolio_items') THEN
    CREATE POLICY "Public read portfolio"  ON public.portfolio_items FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own portfolio'          AND tablename = 'portfolio_items') THEN
    CREATE POLICY "Own portfolio"          ON public.portfolio_items FOR ALL    USING (auth.uid()::text = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own bid templates'      AND tablename = 'bid_templates') THEN
    CREATE POLICY "Own bid templates"      ON public.bid_templates   FOR ALL    USING (auth.uid()::text = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Own watchlist'          AND tablename = 'watchlist') THEN
    CREATE POLICY "Own watchlist"          ON public.watchlist        FOR ALL    USING (auth.uid()::text = contractor_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read own disputes'      AND tablename = 'disputes') THEN
    CREATE POLICY "Read own disputes"      ON public.disputes         FOR SELECT USING (auth.uid()::text = raised_by OR auth.uid()::text = against);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Insert disputes'        AND tablename = 'disputes') THEN
    CREATE POLICY "Insert disputes"        ON public.disputes         FOR INSERT WITH CHECK (auth.uid()::text = raised_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read own referrals'     AND tablename = 'referrals') THEN
    CREATE POLICY "Read own referrals"     ON public.referrals        FOR SELECT USING (auth.uid()::text = referrer_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Insert referrals'       AND tablename = 'referrals') THEN
    CREATE POLICY "Insert referrals"       ON public.referrals        FOR INSERT WITH CHECK (auth.uid()::text = referrer_id);
  END IF;
END $$;

-- ── 4. Enable Realtime for ALL tables ────────────────────────────
-- Run each line separately if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_qa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bid_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watchlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
