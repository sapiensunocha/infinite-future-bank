-- ==============================================================================
-- IFB: PAYMENT PAGES (merchant payment links with custom forms)
-- Migration Date: 2026-11-04
--
-- Contract: docs/payment-pages.md. Re-runnable (IF NOT EXISTS / CREATE OR REPLACE /
-- DROP POLICY IF EXISTS).
--
--   * payment_pages        — merchants may SELECT their own rows (minus webhook_secret);
--                            every write goes through the payment-pages edge function.
--   * payment_page_orders  — no client access at all (answers live here, encrypted);
--                            merchants read orders through the edge function.
--   * platform_fee_ledger  — one row per paid order with the platform's fee, so fees
--                            are auditable without a synthetic "platform" user.
--   * Money moves only through the SECURITY DEFINER functions below, which mirror the
--     ledger pattern of credit_deposit / debit_for_withdrawal
--     (20261030_security_launch_blockers.sql): an idempotent transactions row keyed
--     by external_id, and the balance changes only if that row was inserted.
-- ==============================================================================


-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payment_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  logo_url         TEXT,
  currency         TEXT NOT NULL DEFAULT 'USD',
  status           TEXT NOT NULL DEFAULT 'active',
  visibility       TEXT NOT NULL DEFAULT 'public',
  single_use       BOOLEAN NOT NULL DEFAULT FALSE,
  max_uses         INTEGER,
  uses_count       INTEGER NOT NULL DEFAULT 0,
  expires_at       TIMESTAMPTZ,
  fields           JSONB NOT NULL DEFAULT '[]'::jsonb,
  pricing          JSONB NOT NULL,
  success_message  TEXT,
  redirect_url     TEXT,
  notify_email     TEXT,
  webhook_url      TEXT,
  webhook_secret   TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_pages_slug_key        UNIQUE (slug),
  CONSTRAINT payment_pages_slug_format     CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  CONSTRAINT payment_pages_title_len       CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT payment_pages_currency        CHECK (currency = 'USD'),
  CONSTRAINT payment_pages_status          CHECK (status IN ('active', 'inactive')),
  CONSTRAINT payment_pages_visibility      CHECK (visibility IN ('public', 'private')),
  CONSTRAINT payment_pages_max_uses        CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT payment_pages_uses_count      CHECK (uses_count >= 0),
  CONSTRAINT payment_pages_version         CHECK (version >= 1),
  CONSTRAINT payment_pages_fields_array    CHECK (jsonb_typeof(fields) = 'array'),
  CONSTRAINT payment_pages_pricing_object  CHECK (jsonb_typeof(pricing) = 'object'),
  CONSTRAINT payment_pages_redirect_https  CHECK (redirect_url IS NULL OR redirect_url LIKE 'https://%'),
  CONSTRAINT payment_pages_webhook_https   CHECK (webhook_url IS NULL OR webhook_url LIKE 'https://%'),
  CONSTRAINT payment_pages_logo_https      CHECK (logo_url IS NULL OR logo_url LIKE 'https://%')
);

CREATE TABLE IF NOT EXISTS public.payment_page_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id             UUID NOT NULL REFERENCES public.payment_pages(id) ON DELETE RESTRICT,
  merchant_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  page_version        INTEGER NOT NULL,
  fields_snapshot     JSONB NOT NULL,
  pricing_snapshot    JSONB NOT NULL,
  line_items          JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents      BIGINT NOT NULL,
  fee_cents           BIGINT NOT NULL DEFAULT 0,
  total_cents         BIGINT NOT NULL,
  merchant_net_cents  BIGINT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',
  customer_email      TEXT NOT NULL,
  customer_name       TEXT NOT NULL,
  answers_ciphertext  TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  provider            TEXT NOT NULL,
  provider_ref        TEXT,
  paid_at             TIMESTAMPTZ,
  ip_hash             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  CONSTRAINT payment_page_orders_status    CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  CONSTRAINT payment_page_orders_provider  CHECK (provider IN ('stripe', 'flutterwave', 'paystack', 'wallet')),
  CONSTRAINT payment_page_orders_currency  CHECK (currency = 'USD'),
  CONSTRAINT payment_page_orders_cents     CHECK (
    subtotal_cents >= 0 AND fee_cents >= 0 AND total_cents >= 0 AND merchant_net_cents >= 0
  ),
  CONSTRAINT payment_page_orders_paid_at   CHECK (status <> 'paid' OR paid_at IS NOT NULL)
);

-- Platform fee audit trail: one row per paid order (fee_cents may be 0).
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL DEFAULT 'payment_page',
  order_id     UUID NOT NULL REFERENCES public.payment_page_orders(id) ON DELETE RESTRICT,
  page_id      UUID NOT NULL REFERENCES public.payment_pages(id) ON DELETE RESTRICT,
  merchant_id  UUID NOT NULL,
  fee_cents    BIGINT NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_fee_ledger_order_key UNIQUE (order_id),
  CONSTRAINT platform_fee_ledger_fee       CHECK (fee_cents >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_pages_merchant         ON public.payment_pages (merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_pages_slug             ON public.payment_pages (slug);
CREATE INDEX IF NOT EXISTS idx_page_orders_merchant           ON public.payment_page_orders (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_orders_page_status        ON public.payment_page_orders (page_id, status);
CREATE INDEX IF NOT EXISTS idx_page_orders_page_created       ON public.payment_page_orders (page_id, created_at);
CREATE INDEX IF NOT EXISTS idx_page_orders_ip_created         ON public.payment_page_orders (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_page_orders_pending_expiry     ON public.payment_page_orders (expires_at) WHERE status = 'pending';
-- One provider payment can settle at most one order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_page_orders_provider_ref ON public.payment_page_orders (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_merchant   ON public.platform_fee_ledger (merchant_id, created_at);


-- ==============================================================================
-- 2. RLS + PRIVILEGES
-- ==============================================================================

ALTER TABLE public.payment_pages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_page_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_pages       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.payment_page_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.platform_fee_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_pages, public.payment_page_orders, public.platform_fee_ledger TO service_role;

-- Merchants may read their own pages directly, but never webhook_secret
-- (column-level grant: it is shown only on create / rotate_webhook_secret).
GRANT SELECT (
  id, merchant_id, slug, title, description, logo_url, currency, status, visibility,
  single_use, max_uses, uses_count, expires_at, fields, pricing, success_message,
  redirect_url, notify_email, webhook_url, version, created_at, updated_at
) ON public.payment_pages TO authenticated;

DROP POLICY IF EXISTS payment_pages_owner_select ON public.payment_pages;
CREATE POLICY payment_pages_owner_select ON public.payment_pages
  FOR SELECT TO authenticated
  USING (merchant_id = (SELECT auth.uid()));

-- payment_page_orders / platform_fee_ledger: RLS on, no policies, no grants to
-- client roles => no client access at all.


-- ==============================================================================
-- 3. MONEY FUNCTIONS
-- ==============================================================================

-- 3a. _credit_page_order — INTERNAL (no grants). Credits the merchant's net for a
--     paid order exactly once (transactions.external_id = 'pageorder:<id>') and
--     records the platform fee. Called only from the functions below, inside the
--     transaction that marked the order paid. Unlike credit_deposit it does not
--     reject authenticated JWTs, because pay_page_order_with_wallet runs as the
--     payer; that is why it has no grants at all.
CREATE OR REPLACE FUNCTION public._credit_page_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  RECORD;
  v_amount NUMERIC;
  v_key    TEXT;
  v_tx_id  UUID;
BEGIN
  SELECT o.id, o.page_id, o.merchant_id, o.status, o.merchant_net_cents, o.fee_cents,
         o.currency, o.provider, p.slug
    INTO v_order
    FROM public.payment_page_orders o
    JOIN public.payment_pages p ON p.id = o.page_id
   WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment page order %', p_order_id USING ERRCODE = '22023';
  END IF;
  IF v_order.status <> 'paid' THEN
    RAISE EXCEPTION 'Order % is not paid', p_order_id USING ERRCODE = '22023';
  END IF;
  IF v_order.currency <> 'USD' THEN
    RAISE EXCEPTION 'Unsupported currency %', v_order.currency USING ERRCODE = '22023';
  END IF;

  v_amount := ROUND(v_order.merchant_net_cents / 100.0, 2);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Merchant net must be greater than zero' USING ERRCODE = '22023';
  END IF;

  v_key := 'pageorder:' || p_order_id::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at, metadata, external_id
  ) VALUES (
    v_order.merchant_id, v_amount, 'payment_page_sale',
    'Payment page ' || v_order.slug || ' — order ' || p_order_id::text,
    'completed', NOW(),
    jsonb_build_object(
      'source', 'payment_page', 'currency', v_order.currency, 'order_id', p_order_id,
      'page_id', v_order.page_id, 'provider', v_order.provider,
      'fee_cents', v_order.fee_cents, 'merchant_net_cents', v_order.merchant_net_cents
    ),
    v_key
  )
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    RETURN FALSE;  -- already credited
  END IF;

  INSERT INTO public.balances (user_id, liquid_usd, updated_at)
  VALUES (v_order.merchant_id, v_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();

  INSERT INTO public.platform_fee_ledger (source, order_id, page_id, merchant_id, fee_cents, currency)
  VALUES ('payment_page', p_order_id, v_order.page_id, v_order.merchant_id, v_order.fee_cents, v_order.currency)
  ON CONFLICT (order_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public._credit_page_order(UUID) FROM PUBLIC, anon, authenticated, service_role;


-- 3b. _settle_page_order — INTERNAL (no grants). Caller must hold the order row
--     lock and have validated status/amount. Marks paid, credits the merchant and
--     consumes one use of the page.
CREATE OR REPLACE FUNCTION public._settle_page_order(
  p_order_id     UUID,
  p_provider     TEXT,
  p_provider_ref TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page_id UUID;
BEGIN
  UPDATE public.payment_page_orders
     SET status = 'paid',
         provider = p_provider,
         provider_ref = COALESCE(NULLIF(p_provider_ref, ''), provider_ref),
         paid_at = NOW()
   WHERE id = p_order_id
  RETURNING page_id INTO v_page_id;

  IF v_page_id IS NULL THEN
    RAISE EXCEPTION 'Unknown payment page order %', p_order_id USING ERRCODE = '22023';
  END IF;

  PERFORM public._credit_page_order(p_order_id);

  UPDATE public.payment_pages
     SET uses_count = uses_count + 1,
         status = CASE
                    WHEN single_use OR (max_uses IS NOT NULL AND uses_count + 1 >= max_uses) THEN 'inactive'
                    ELSE status
                  END,
         updated_at = NOW()
   WHERE id = v_page_id;
END;
$$;

REVOKE ALL ON FUNCTION public._settle_page_order(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;


-- 3c. mark_page_order_paid — service_role only. Called by the provider webhooks
--     (and order_status) after a verified provider confirmation.
--     Returns TRUE if this call settled the order, FALSE if it was already paid.
CREATE OR REPLACE FUNCTION public.mark_page_order_paid(
  p_order_id     UUID,
  p_provider     TEXT,
  p_provider_ref TEXT,
  p_amount_cents BIGINT,
  p_currency     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_order_id IS NULL OR p_provider IS NULL THEN
    RAISE EXCEPTION 'p_order_id and p_provider are required' USING ERRCODE = '22023';
  END IF;
  IF p_provider NOT IN ('stripe', 'flutterwave', 'paystack') THEN
    RAISE EXCEPTION 'Unsupported provider %', p_provider USING ERRCODE = '22023';
  END IF;

  SELECT id, status, provider, total_cents, currency
    INTO v_order
    FROM public.payment_page_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment page order %', p_order_id USING ERRCODE = '22023';
  END IF;
  IF v_order.status = 'paid' THEN
    RETURN FALSE;
  END IF;
  -- 'expired' is accepted: a customer who actually paid must be credited.
  IF v_order.status NOT IN ('pending', 'expired') THEN
    RAISE EXCEPTION 'Order % is %', p_order_id, v_order.status USING ERRCODE = '22023';
  END IF;
  IF v_order.provider <> p_provider THEN
    RAISE EXCEPTION 'Provider mismatch for order %', p_order_id USING ERRCODE = '22023';
  END IF;
  IF UPPER(COALESCE(p_currency, '')) <> v_order.currency THEN
    RAISE EXCEPTION 'Currency mismatch for order %', p_order_id USING ERRCODE = '22023';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents < v_order.total_cents THEN
    RAISE EXCEPTION 'Amount paid is below the order total for %', p_order_id USING ERRCODE = '22023';
  END IF;

  PERFORM public._settle_page_order(p_order_id, p_provider, p_provider_ref);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_page_order_paid(UUID, TEXT, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_page_order_paid(UUID, TEXT, TEXT, BIGINT, TEXT) TO service_role;


-- 3d. pay_page_order_with_wallet — authenticated. The caller (auth.uid()) pays a
--     pending 'wallet' order from their own liquid_usd; the merchant is credited
--     in the same transaction.
CREATE OR REPLACE FUNCTION public.pay_page_order_with_wallet(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payer   UUID := auth.uid();
  v_order   RECORD;
  v_amount  NUMERIC;
  v_balance NUMERIC;
  v_key     TEXT;
  v_tx_id   UUID;
BEGIN
  IF v_payer IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'p_order_id is required' USING ERRCODE = '22023';
  END IF;

  SELECT id, merchant_id, status, provider, total_cents, currency, expires_at
    INTO v_order
    FROM public.payment_page_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = '22023';
  END IF;
  IF v_order.merchant_id = v_payer THEN
    RAISE EXCEPTION 'You cannot pay your own payment page' USING ERRCODE = '22023';
  END IF;
  IF v_order.provider <> 'wallet' THEN
    RAISE EXCEPTION 'Order is not a wallet order' USING ERRCODE = '22023';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Order is not pending' USING ERRCODE = '22023';
  END IF;
  IF v_order.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Order has expired' USING ERRCODE = '22023';
  END IF;
  IF v_order.currency <> 'USD' THEN
    RAISE EXCEPTION 'Unsupported currency' USING ERRCODE = '22023';
  END IF;

  v_amount := ROUND(v_order.total_cents / 100.0, 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid order total' USING ERRCODE = '22023';
  END IF;

  -- Lock both balance rows in a fixed order to avoid deadlocks between
  -- concurrent payments in opposite directions.
  PERFORM 1 FROM public.balances
   WHERE user_id IN (v_payer, v_order.merchant_id)
   ORDER BY user_id
   FOR UPDATE;

  SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_payer FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_balance, 0) < v_amount THEN
    RAISE EXCEPTION 'Insufficient funds' USING ERRCODE = 'P0001';
  END IF;

  v_key := 'pagepay:' || p_order_id::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_key, 0));

  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at, metadata, external_id
  ) VALUES (
    v_payer, -v_amount, 'payment_page_payment',
    'Payment page order ' || p_order_id::text,
    'completed', NOW(),
    jsonb_build_object('source', 'payment_page', 'currency', 'USD', 'order_id', p_order_id,
                       'merchant_id', v_order.merchant_id),
    v_key
  )
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING
  RETURNING id INTO v_tx_id;

  IF v_tx_id IS NULL THEN
    RAISE EXCEPTION 'Order already paid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.balances
     SET liquid_usd = liquid_usd - v_amount, updated_at = NOW()
   WHERE user_id = v_payer AND liquid_usd >= v_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient funds' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public._settle_page_order(p_order_id, 'wallet', v_tx_id::text);

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'paid');
END;
$$;

REVOKE ALL ON FUNCTION public.pay_page_order_with_wallet(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pay_page_order_with_wallet(UUID) TO authenticated;


-- 3e. expire_stale_page_orders — service_role only. Returns the number expired.
--     Schedule with pg_cron (e.g. every 10 minutes) or call from a scheduled job.
CREATE OR REPLACE FUNCTION public.expire_stale_page_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF COALESCE(public._jwt_role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payment_page_orders
     SET status = 'expired'
   WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_page_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_page_orders() TO service_role;
