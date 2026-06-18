-- IFB Global Risk Markets (Kalshi-style prediction market powered by MICHAEL API)

CREATE TABLE IF NOT EXISTS public.risk_market_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question            TEXT NOT NULL,
  description         TEXT,
  category            TEXT NOT NULL,           -- environmental | security | financial | epidemic | food+security | infrastructure
  event_type          TEXT NOT NULL,
  region              TEXT,
  yes_price           NUMERIC(5,2) NOT NULL DEFAULT 50,  -- 1–99 (cents per $1 share = probability %)
  total_yes_volume    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_no_volume     NUMERIC(15,2) NOT NULL DEFAULT 0,
  pool_size           NUMERIC(15,2) NOT NULL DEFAULT 0,
  closes_at           TIMESTAMPTZ NOT NULL,
  resolves_at         TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open',       -- open | closed | resolved_yes | resolved_no | voided
  resolution_note     TEXT,
  michael_event_id    TEXT,
  source_data         JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.risk_market_positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   UUID NOT NULL REFERENCES public.risk_market_contracts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  side          TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  shares        NUMERIC(10,4) NOT NULL,
  entry_price   NUMERIC(5,2) NOT NULL,          -- price paid per share (cents)
  amount_paid   NUMERIC(15,2) NOT NULL,          -- total cost in USD
  payout        NUMERIC(15,2),                   -- set on settlement
  status        TEXT NOT NULL DEFAULT 'open',    -- open | won | lost | voided
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.risk_market_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_market_positions ENABLE ROW LEVEL SECURITY;

-- Contracts are readable by all authenticated users, writable only by service role
CREATE POLICY "read_contracts" ON public.risk_market_contracts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Positions are fully owned by the user
CREATE POLICY "own_positions" ON public.risk_market_positions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_rmc_status   ON public.risk_market_contracts(status);
CREATE INDEX idx_rmc_category ON public.risk_market_contracts(category);
CREATE INDEX idx_rmp_user     ON public.risk_market_positions(user_id);
CREATE INDEX idx_rmp_contract ON public.risk_market_positions(contract_id);
