-- ============================================================
-- IFB Community Loan Network (CLN) — Database Schema
-- ============================================================

-- 1. Communities (the groups)
CREATE TABLE IF NOT EXISTS public.cln_communities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  purpose       TEXT NOT NULL,
  description   TEXT,
  admin_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_members   INTEGER DEFAULT 50,
  contribution_amount NUMERIC(12,2) NOT NULL DEFAULT 10.00,
  contribution_frequency TEXT NOT NULL DEFAULT 'monthly', -- 'weekly' | 'monthly'
  loan_limit_multiplier NUMERIC(4,2) DEFAULT 3.0, -- max loan = contributions * multiplier
  emergency_fund_pct NUMERIC(5,2) DEFAULT 10.0,   -- % of pool reserved for emergencies
  repayment_days INTEGER DEFAULT 90,
  pool_balance  NUMERIC(14,2) DEFAULT 0.00,
  group_credit_score NUMERIC(5,2) DEFAULT 50.00,
  repayment_score    NUMERIC(5,2) DEFAULT 50.00,
  consistency_score  NUMERIC(5,2) DEFAULT 50.00,
  default_risk_score NUMERIC(5,2) DEFAULT 0.00,
  status        TEXT DEFAULT 'active', -- 'active' | 'frozen' | 'dissolved'
  ifb_matched   BOOLEAN DEFAULT false,
  ifb_match_amount NUMERIC(12,2) DEFAULT 0.00,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Memberships
CREATE TABLE IF NOT EXISTS public.cln_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.cln_communities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT DEFAULT 'member', -- 'admin' | 'member'
  total_contributed NUMERIC(14,2) DEFAULT 0.00,
  active_loan_amount NUMERIC(12,2) DEFAULT 0.00,
  repayment_score NUMERIC(5,2) DEFAULT 50.00,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'active', -- 'active' | 'suspended'
  UNIQUE(community_id, user_id)
);

-- 3. Contribution records
CREATE TABLE IF NOT EXISTS public.cln_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.cln_communities(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  period_label    TEXT, -- e.g. 'May 2026'
  status          TEXT DEFAULT 'completed', -- 'completed' | 'failed' | 'pending'
  tx_hash         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Community loan requests
CREATE TABLE IF NOT EXISTS public.cln_loan_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID NOT NULL REFERENCES public.cln_communities(id) ON DELETE CASCADE,
  borrower_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  borrower_name   TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  purpose         TEXT NOT NULL,
  repayment_days  INTEGER DEFAULT 90,
  interest_rate   NUMERIC(5,2) DEFAULT 0.00,
  votes_for       INTEGER DEFAULT 0,
  votes_against   INTEGER DEFAULT 0,
  votes_needed    INTEGER DEFAULT 3,
  status          TEXT DEFAULT 'voting', -- 'voting'|'approved'|'rejected'|'disbursed'|'repaid'|'defaulted'
  disbursed_at    TIMESTAMPTZ,
  due_date        TIMESTAMPTZ,
  tx_hash         TEXT,
  repaid_amount   NUMERIC(12,2) DEFAULT 0.00,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Votes on loan requests
CREATE TABLE IF NOT EXISTS public.cln_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_request_id UUID NOT NULL REFERENCES public.cln_loan_requests(id) ON DELETE CASCADE,
  voter_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote            TEXT NOT NULL, -- 'approve' | 'reject'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loan_request_id, voter_id)
);

-- 6. Repayments
CREATE TABLE IF NOT EXISTS public.cln_repayments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_request_id UUID NOT NULL REFERENCES public.cln_loan_requests(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id    UUID NOT NULL REFERENCES public.cln_communities(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  tx_hash         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cln_members_user     ON public.cln_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cln_members_comm     ON public.cln_members(community_id);
CREATE INDEX IF NOT EXISTS idx_cln_loans_comm       ON public.cln_loan_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_cln_loans_borrower   ON public.cln_loan_requests(borrower_id);
CREATE INDEX IF NOT EXISTS idx_cln_contributions_u  ON public.cln_contributions(user_id);

-- RLS: users see only communities they belong to or are public
ALTER TABLE public.cln_communities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cln_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cln_contributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cln_loan_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cln_votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cln_repayments     ENABLE ROW LEVEL SECURITY;

-- Communities: readable by authenticated users; writable by owner
CREATE POLICY "cln_comm_read"   ON public.cln_communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "cln_comm_insert" ON public.cln_communities FOR INSERT TO authenticated WITH CHECK (admin_id = auth.uid());
CREATE POLICY "cln_comm_update" ON public.cln_communities FOR UPDATE TO authenticated USING (admin_id = auth.uid());

-- Members: read all, manage own membership
CREATE POLICY "cln_mem_read"    ON public.cln_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "cln_mem_insert"  ON public.cln_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cln_mem_update"  ON public.cln_members FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Contributions: own rows only
CREATE POLICY "cln_cont_read"   ON public.cln_contributions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "cln_cont_insert" ON public.cln_contributions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Loan requests: community members can read
CREATE POLICY "cln_loans_read"  ON public.cln_loan_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "cln_loans_insert" ON public.cln_loan_requests FOR INSERT TO authenticated WITH CHECK (borrower_id = auth.uid());

-- Votes: own votes
CREATE POLICY "cln_votes_read"   ON public.cln_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cln_votes_insert" ON public.cln_votes FOR INSERT TO authenticated WITH CHECK (voter_id = auth.uid());

-- Repayments: own rows
CREATE POLICY "cln_repay_read"   ON public.cln_repayments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "cln_repay_insert" ON public.cln_repayments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- RPC: get community stats for a user
CREATE OR REPLACE FUNCTION public.get_cln_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_communities BIGINT;
  v_total_pool  NUMERIC;
  v_active_loans BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_communities FROM public.cln_members WHERE user_id = p_user_id AND status = 'active';
  SELECT COALESCE(SUM(c.pool_balance),0) INTO v_total_pool
    FROM public.cln_communities c
    JOIN public.cln_members m ON m.community_id = c.id
    WHERE m.user_id = p_user_id AND m.status = 'active';
  SELECT COUNT(*) INTO v_active_loans
    FROM public.cln_loan_requests
    WHERE borrower_id = p_user_id AND status IN ('disbursed');
  RETURN json_build_object('communities', v_communities, 'total_pool', v_total_pool, 'active_loans', v_active_loans);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_cln_stats(UUID) TO authenticated;
