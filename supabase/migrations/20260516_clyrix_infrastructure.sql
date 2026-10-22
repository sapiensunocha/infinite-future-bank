-- ============================================================
-- Clyrix (CLYRIX): IFB Protection & Risk Pooling Infrastructure
-- Reinvents insurance as transparent, blockchain-backed safety pools.
-- ============================================================

-- 1. Protection Pools (The core "Shared Liquidity" for claims)
CREATE TABLE IF NOT EXISTS public.clyrix_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Global Micro-Health", "Income Protection Alpha"
  type TEXT NOT NULL CHECK (type IN ('Health', 'Income', 'Life', 'Asset', 'Agriculture', 'Disaster')),
  description TEXT,
  
  total_liquidity_usd NUMERIC DEFAULT 0,
  active_members_count INTEGER DEFAULT 0,
  
  -- Pricing Model (Dynamic)
  base_monthly_contribution NUMERIC NOT NULL,
  management_fee_pct NUMERIC DEFAULT 5.0, -- IFB Revenue Source
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Subscriptions (Contributions to Pools)
CREATE TABLE IF NOT EXISTS public.clyrix_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.clyrix_pools(id) ON DELETE CASCADE,
  
  monthly_contribution NUMERIC NOT NULL,
  coverage_amount_limit NUMERIC NOT NULL,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'lapsed', 'cancelled')),
  last_payment_at TIMESTAMPTZ DEFAULT NOW(),
  next_billing_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pool_id)
);

-- 3. Claims Infrastructure (Verifiable & Transparent)
CREATE TABLE IF NOT EXISTS public.clyrix_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES public.clyrix_pools(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  evidence_urls JSONB DEFAULT '[]', -- Photos, hospital bills, etc.
  
  -- Validation Flow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  ai_validation_score INTEGER DEFAULT 0, -- 0-100 score from IFB Intelligence
  admin_notes TEXT,
  
  -- Blockchain Payout Proof
  chain_tx_hash TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Partner Program (Entities that accept CLYRIX payments)
CREATE TABLE IF NOT EXISTS public.clyrix_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sector TEXT, -- Hospital, Equipment Provider, etc.
  country TEXT,
  verification_status TEXT DEFAULT 'verified',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Automated Functions & Triggers
-- ============================================================

-- Function to process a contribution payment
CREATE OR REPLACE FUNCTION public.process_clyrix_contribution(
  p_user_id UUID,
  p_pool_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_pool_name TEXT;
  v_fee NUMERIC;
  v_net_pool NUMERIC;
  v_mgt_pct NUMERIC;
BEGIN
  -- Get pool details
  SELECT name, management_fee_pct INTO v_pool_name, v_mgt_pct FROM public.clyrix_pools WHERE id = p_pool_id;
  
  -- Calculate fees
  v_fee := p_amount * (v_mgt_pct / 100);
  v_net_pool := p_amount - v_fee;

  -- 1. Deduct from user
  UPDATE public.balances SET liquid_usd = liquid_usd - p_amount WHERE user_id = p_user_id;
  
  -- 2. Add to pool liquidity
  UPDATE public.clyrix_pools SET 
    total_liquidity_usd = total_liquidity_usd + v_net_pool,
    active_members_count = active_members_count + 1
  WHERE id = p_pool_id;
  
  -- 3. Log to Blockchain Ledger (Hardened)
  INSERT INTO public.afr_ledger (user_id, tx_type, afr_amount, usd_equivalent, notes, status)
  VALUES (p_user_id, 'transfer', 0, p_amount, 'CLYRIX Contribution: ' || v_pool_name, 'confirmed');

  RETURN jsonb_build_object('ok', true, 'pool', v_pool_name, 'net_contribution', v_net_pool);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.clyrix_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clyrix_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clyrix_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clyrix_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pools_public_read" ON public.clyrix_pools FOR SELECT USING (TRUE);
CREATE POLICY "subs_own_read" ON public.clyrix_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "claims_own_read" ON public.clyrix_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "partners_public_read" ON public.clyrix_partners FOR SELECT USING (TRUE);

-- Seed Initial Pools for Launch
INSERT INTO public.clyrix_pools (name, type, description, base_monthly_contribution)
VALUES 
('Universal Micro-Health', 'Health', 'Essential emergency care and hospital coverage for global citizens.', 12.00),
('Income Resilience Pool', 'Income', 'Protection against job loss and sudden income disruption.', 25.00),
('Sovereign Family Life', 'Life', 'Immediate capital release for families in event of bereavement.', 15.00),
('Agricultural Yield Protection', 'Agriculture', 'Climate-indexed protection for smallholder infrastructure.', 8.00);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.clyrix_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clyrix_claims;
