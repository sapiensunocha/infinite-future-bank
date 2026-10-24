-- Schema Repairs: Add missing columns identified during live schema audit
-- Ensures full compatibility with legacy and newer contract/payroll/balance operations

-- 1. Balances table compatibility
ALTER TABLE IF EXISTS balances 
  ADD COLUMN IF NOT EXISTS usd_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deposited NUMERIC DEFAULT 0;

-- Sync initial usd_balance from liquid_usd where 0 or null
UPDATE balances 
SET usd_balance = liquid_usd 
WHERE (usd_balance IS NULL OR usd_balance = 0) AND liquid_usd IS NOT NULL AND liquid_usd > 0;

-- 2. Smart Contracts escrow column
ALTER TABLE IF EXISTS smart_contracts 
  ADD COLUMN IF NOT EXISTS escrow_usd NUMERIC DEFAULT 0;

-- 3. Payroll Runs table column alignment
ALTER TABLE IF EXISTS payroll_runs 
  ADD COLUMN IF NOT EXISTS org_id UUID,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gross_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0;
