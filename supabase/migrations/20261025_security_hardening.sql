-- ==============================================================================
-- IFB DEUS BANKING PLATFORM: INSTITUTIONAL SECURITY HARDENING MIGRATION
-- Migration Date: 2026-10-25
-- Description:
--   1. Enforces Row-Level Security (RLS) on all core financial and identity tables.
--   2. Completely eliminates public/anon data scraping of profiles, wallets, and audit logs.
--   3. Restricts balances & wallets mutations strictly to server-side SECURITY DEFINER RPCs.
--   4. Hardens p2p_transfer to verify sender identity matches auth.uid().
--   5. Introduces atomic server-side RPCs for ticket purchases, program unlocks, and safe public profile lookups.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN WALLETS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;

-- Drop any stale/permissive policies
DROP POLICY IF EXISTS "wallets_select_all" ON public.wallets;
DROP POLICY IF EXISTS "wallets_own_select" ON public.wallets;
DROP POLICY IF EXISTS "admin_read_all_wallets" ON public.wallets;
DROP POLICY IF EXISTS "wallets_client_no_write" ON public.wallets;

-- Users may only view their own wallets
CREATE POLICY "wallets_own_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all wallets
CREATE POLICY "wallets_admin_select" ON public.wallets
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')));

-- Explicitly revoke all client-side write access to wallets
REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM anon, authenticated;


-- ------------------------------------------------------------------------------
-- 2. HARDEN BALANCES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "balances_select_all" ON public.balances;
DROP POLICY IF EXISTS "balances_own_select" ON public.balances;
DROP POLICY IF EXISTS "admin_read_all_balances" ON public.balances;
DROP POLICY IF EXISTS "balances_own_update" ON public.balances;
DROP POLICY IF EXISTS "balances_public_select" ON public.balances;

-- Users may only view their own balance
CREATE POLICY "balances_own_select" ON public.balances
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all balances
CREATE POLICY "balances_admin_select" ON public.balances
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')));

-- Explicitly revoke client-side direct balance modification
-- All balance mutations MUST go through verified SECURITY DEFINER RPCs or service_role
REVOKE INSERT, UPDATE, DELETE ON public.balances FROM anon, authenticated;


-- ------------------------------------------------------------------------------
-- 3. HARDEN PROFILES TABLE (PII PROTECTION)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;

-- Deny all anon access (anon cannot read PII)
REVOKE ALL ON public.profiles FROM anon;

-- Users can read their own profile in full
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')));

-- Admins can update profiles (KYC approvals, roles, etc.)
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')));


-- ------------------------------------------------------------------------------
-- 4. HARDEN SYSTEM AUDIT LEDGER, SENSITIVE LOGS & REVOKE EXPOSED RPCS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.system_audit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_all" ON public.system_audit_ledger;
DROP POLICY IF EXISTS "audit_admin_only" ON public.system_audit_ledger;

REVOKE ALL ON public.system_audit_ledger FROM anon;

CREATE POLICY "audit_admin_only" ON public.system_audit_ledger
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'admin_l3', 'superadmin')));

-- Passcode security
ALTER TABLE IF EXISTS public.kyc_admin_passcodes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kyc_admin_passcodes FROM anon, authenticated;

-- KYC portal OTPs
ALTER TABLE IF EXISTS public.kyc_portal_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kyc_portal_otps FROM anon;

-- CRITICAL FIX: Revoke public access to mass email extraction RPC
REVOKE EXECUTE ON FUNCTION public.get_confirmed_user_emails(integer) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_confirmed_user_emails(integer) TO service_role;


-- ------------------------------------------------------------------------------
-- 5. HARDEN TRANSACTIONS AND CARDS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transactions_own_select" ON public.transactions;
CREATE POLICY "transactions_own_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.market_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "market_tx_own_select" ON public.market_transactions;
CREATE POLICY "market_tx_own_select" ON public.market_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.virtual_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cards_own_select" ON public.virtual_cards;
CREATE POLICY "cards_own_select" ON public.virtual_cards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE IF EXISTS public.linked_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "linked_cards_own_select" ON public.linked_cards;
CREATE POLICY "linked_cards_own_select" ON public.linked_cards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- 6. HARDEN P2P_TRANSFER RPC (PREVENT SENDER SPOOFING & SUPPORT USD/AFR)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.p2p_transfer(
  sender_id       UUID,
  receiver_id     UUID,
  transfer_amount NUMERIC,
  p_asset         TEXT DEFAULT 'USD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_balance    NUMERIC;
  v_sender_name       TEXT;
  v_receiver_name     TEXT;
  v_current_user      UUID := auth.uid();
  v_asset_clean       TEXT := UPPER(COALESCE(p_asset, 'USD'));
BEGIN
  -- Strict Authorization: Caller MUST match sender_id (unless superadmin)
  IF v_current_user IS NULL OR (
    v_current_user != sender_id AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = v_current_user AND role IN ('admin', 'superadmin')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only transfer funds from your own verified account.');
  END IF;

  IF sender_id = receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer funds to yourself.');
  END IF;

  IF transfer_amount IS NULL OR transfer_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer amount must be greater than zero.');
  END IF;

  -- Lock row to prevent race conditions / double spends
  IF v_asset_clean = 'AFR' THEN
    SELECT afr_balance INTO v_sender_balance
    FROM public.balances
    WHERE user_id = sender_id
    FOR UPDATE;
  ELSE
    SELECT liquid_usd INTO v_sender_balance
    FROM public.balances
    WHERE user_id = sender_id
    FOR UPDATE;
  END IF;

  IF v_sender_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender wallet not found.');
  END IF;

  IF v_sender_balance < transfer_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient liquid funds.', 'available', v_sender_balance, 'requested', transfer_amount);
  END IF;

  SELECT full_name INTO v_sender_name   FROM public.profiles WHERE id = sender_id;
  SELECT full_name INTO v_receiver_name FROM public.profiles WHERE id = receiver_id;

  IF v_receiver_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient account not found on IFB network.');
  END IF;

  -- Atomic Deduction and Credit
  IF v_asset_clean = 'AFR' THEN
    UPDATE public.balances
    SET afr_balance = afr_balance - transfer_amount, updated_at = NOW()
    WHERE user_id = sender_id;

    INSERT INTO public.balances (user_id, afr_balance, updated_at)
    VALUES (receiver_id, transfer_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET afr_balance = COALESCE(balances.afr_balance, 0) + EXCLUDED.afr_balance, updated_at = NOW();
  ELSE
    UPDATE public.balances
    SET liquid_usd = liquid_usd - transfer_amount, updated_at = NOW()
    WHERE user_id = sender_id;

    INSERT INTO public.balances (user_id, liquid_usd, updated_at)
    VALUES (receiver_id, transfer_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + EXCLUDED.liquid_usd, updated_at = NOW();
  END IF;

  -- Log sender debit transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, created_at, metadata)
  VALUES (
    sender_id,
    -transfer_amount,
    'p2p_send',
    'Transfer (' || v_asset_clean || ') to ' || COALESCE(v_receiver_name, 'User'),
    'completed',
    NOW(),
    jsonb_build_object('counterpart_id', receiver_id, 'counterpart_name', v_receiver_name, 'asset', v_asset_clean)
  );

  -- Log receiver credit transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, created_at, metadata)
  VALUES (
    receiver_id,
    transfer_amount,
    'p2p_receive',
    'Transfer (' || v_asset_clean || ') from ' || COALESCE(v_sender_name, 'User'),
    'completed',
    NOW(),
    jsonb_build_object('counterpart_id', sender_id, 'counterpart_name', v_sender_name, 'asset', v_asset_clean)
  );

  -- Push notification to receiver
  INSERT INTO public.notifications (user_id, type, read, status, message, created_at)
  VALUES (
    receiver_id,
    'transfer_received',
    false,
    'completed',
    'You received ' || CASE WHEN v_asset_clean = 'AFR' THEN transfer_amount::TEXT || ' AFR' ELSE '$' || TO_CHAR(transfer_amount, 'FM999,999,990.00') END || ' from ' || COALESCE(v_sender_name, 'an IFB Member') || '.',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'amount', transfer_amount,
    'asset', v_asset_clean,
    'sender', v_sender_name,
    'receiver', v_receiver_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.p2p_transfer(UUID, UUID, NUMERIC, TEXT) TO authenticated;


-- ------------------------------------------------------------------------------
-- 7. SECURE PUBLIC PROFILE LOOKUP (NO PII LEAKAGE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', id,
    'full_name', full_name,
    'avatar_url', avatar_url,
    'active_tier', active_tier,
    'role', role
  )
  FROM public.profiles
  WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;


-- ------------------------------------------------------------------------------
-- 8. ATOMIC TICKET PURCHASE RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purchase_event_ticket(
  p_event_id UUID,
  p_tier_id  UUID,
  p_price    NUMERIC,
  p_qr_hash  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_email         TEXT;
  v_balance       NUMERIC;
  v_organizer_id  UUID;
  v_event_name    TEXT;
  v_organizer_cut NUMERIC;
  v_tier_name     TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT organizer_id, event_name INTO v_organizer_id, v_event_name FROM public.ifb_events WHERE id = p_event_id;

  IF v_event_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  IF p_price > 0 THEN
    SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_price THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient liquid balance');
    END IF;

    -- Atomic debit
    UPDATE public.balances SET liquid_usd = liquid_usd - p_price, updated_at = NOW() WHERE user_id = v_uid;

    -- Organizer payout (95%)
    IF v_organizer_id IS NOT NULL THEN
      v_organizer_cut := ROUND((p_price * 0.95), 2);
      INSERT INTO public.balances (user_id, liquid_usd, updated_at)
      VALUES (v_organizer_id, v_organizer_cut, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET liquid_usd = balances.liquid_usd + EXCLUDED.liquid_usd, updated_at = NOW();

      INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
      VALUES (v_organizer_id, 'event_revenue', v_organizer_cut, 'completed', 'Ticket sold: ' || v_event_name);
    END IF;

    -- Buyer transaction record
    INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
    VALUES (v_uid, 'event_ticket', -p_price, 'completed', 'Ticket: ' || v_event_name);
  END IF;

  IF p_tier_id IS NOT NULL THEN
    SELECT tier_name INTO v_tier_name FROM public.ifb_ticket_tiers WHERE id = p_tier_id;
    UPDATE public.ifb_ticket_tiers SET tickets_sold = COALESCE(tickets_sold, 0) + 1 WHERE id = p_tier_id;
  END IF;

  UPDATE public.ifb_events SET tickets_sold = COALESCE(tickets_sold, 0) + 1 WHERE id = p_event_id;

  INSERT INTO public.ifb_tickets (event_id, buyer_email, qr_code_hash, status, tier_id, tier_name, price_paid)
  VALUES (p_event_id, v_email, p_qr_hash, 'active', p_tier_id, v_tier_name, p_price);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_event_ticket(UUID, UUID, NUMERIC, TEXT) TO authenticated;


-- ------------------------------------------------------------------------------
-- 9. ATOMIC PROGRAM UNLOCK RPC (FIRST CUSTOMER ENGINE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_first_customer_program(
  p_program_id UUID,
  p_fee        NUMERIC DEFAULT 250
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_balance NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT liquid_usd INTO v_balance FROM public.balances WHERE user_id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_fee THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.balances SET liquid_usd = liquid_usd - p_fee, updated_at = NOW() WHERE user_id = v_uid;
  UPDATE public.first_customer_programs SET is_unlocked = TRUE, amount_paid = p_fee WHERE id = p_program_id AND user_id = v_uid;

  INSERT INTO public.transactions (user_id, transaction_type, amount, status, description)
  VALUES (v_uid, 'first_customer_program', -p_fee, 'completed', 'First Customer Engine — Full Program Unlock');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_first_customer_program(UUID, NUMERIC) TO authenticated;
