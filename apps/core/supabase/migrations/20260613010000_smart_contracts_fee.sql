-- Add platform_fee column to smart_contracts for 0.5% escrow fee tracking
ALTER TABLE public.smart_contracts
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Index for revenue reporting
CREATE INDEX IF NOT EXISTS idx_smart_contracts_creator
  ON public.smart_contracts (creator_id);
