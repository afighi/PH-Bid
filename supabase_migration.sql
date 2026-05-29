-- Run this in your Supabase SQL editor

-- Project Q&A board (contractors ask, clients answer publicly)
CREATE TABLE IF NOT EXISTS public.project_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asked_by text NOT NULL REFERENCES public.profiles(id),
  question text NOT NULL,
  answer text,
  answered_by text REFERENCES public.profiles(id),
  ai_suggested_answer text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

-- Change orders (contractor requests mid-project scope changes)
CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  requested_by text NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description text NOT NULL,
  impact_cost numeric DEFAULT 0,
  impact_days integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  ai_analysis text,
  client_response text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Direct per-project messaging between awarded contractor and client
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES public.profiles(id),
  receiver_id text NOT NULL REFERENCES public.profiles(id),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Contractor shortlist per project (client saves contractors they like)
CREATE TABLE IF NOT EXISTS public.shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.profiles(id),
  contractor_id text NOT NULL REFERENCES public.profiles(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, contractor_id, project_id)
);

-- Bid negotiation thread (client requests revision, contractor responds)
CREATE TABLE IF NOT EXISTS public.bid_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  sender_id text NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  proposed_amount numeric,
  created_at timestamptz DEFAULT now()
);

-- Milestone approvals (client formally approves a milestone before payment)
CREATE TABLE IF NOT EXISTS public.milestone_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  milestone_name text NOT NULL,
  milestone_index integer NOT NULL,
  progress_update_id uuid REFERENCES public.progress_updates(id),
  approved_by text REFERENCES public.profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disputed')),
  ai_checklist jsonb,
  client_notes text,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
