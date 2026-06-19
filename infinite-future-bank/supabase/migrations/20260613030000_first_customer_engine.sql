-- First Customer Engine: program records, generated phase content, customer pipeline
CREATE TABLE IF NOT EXISTS public.first_customer_programs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name       TEXT NOT NULL,
  what_you_do         TEXT NOT NULL,
  problem_you_solve   TEXT NOT NULL,
  target_customer     TEXT NOT NULL,
  industry            TEXT NOT NULL,
  current_traction    TEXT NOT NULL DEFAULT 'idea', -- idea | mvp | beta | revenue
  is_unlocked         BOOLEAN NOT NULL DEFAULT false,
  amount_paid         NUMERIC(10,2) NOT NULL DEFAULT 0,
  phases_completed    TEXT[] NOT NULL DEFAULT '{}',
  phase_data          JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.first_customer_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id      UUID NOT NULL REFERENCES public.first_customer_programs(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  company         TEXT,
  role            TEXT,
  contact_info    TEXT,
  channel         TEXT,              -- email | linkedin | warm_intro | event | other
  status          TEXT NOT NULL DEFAULT 'identified', -- identified | contacted | replied | meeting | proposal | won | lost
  notes           TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.first_customer_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_customer_leads    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_programs" ON public.first_customer_programs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_leads" ON public.first_customer_leads
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_fcp_user    ON public.first_customer_programs(user_id);
CREATE INDEX idx_fcl_program ON public.first_customer_leads(program_id);
CREATE INDEX idx_fcl_user    ON public.first_customer_leads(user_id);
