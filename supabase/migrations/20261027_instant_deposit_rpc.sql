-- ==============================================================================
-- IFB CORE BANKING: Instant In-App Deposit RPC
-- Enables instantaneous, secure wallet funding directly inside the DEUS app
-- without external webpage redirects.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.instant_deposit(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.instant_deposit(NUMERIC);

CREATE OR REPLACE FUNCTION public.instant_deposit(
  p_amount NUMERIC,
  p_asset TEXT DEFAULT 'USD'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
  v_asset TEXT := UPPER(COALESCE(p_asset, 'USD'));
  v_clean_amount NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Caller Authentication
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized. Please log in.');
  END IF;

  -- 2. Precision & Amount Validation
  v_clean_amount := ROUND(p_amount::numeric, 2);
  IF v_clean_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit amount must be greater than zero.');
  END IF;

  IF v_clean_amount > 250000.00 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Single transaction deposit limit is $250,000.00.');
  END IF;

  -- 3. Atomic Balance Credit
  IF v_asset = 'AFR' THEN
    INSERT INTO public.balances (user_id, afr_balance, updated_at)
    VALUES (v_uid, v_clean_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET afr_balance = COALESCE(balances.afr_balance, 0) + v_clean_amount,
        updated_at = NOW()
    RETURNING afr_balance INTO v_new_balance;
  ELSE
    INSERT INTO public.balances (user_id, liquid_usd, updated_at)
    VALUES (v_uid, v_clean_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET liquid_usd = COALESCE(balances.liquid_usd, 0) + v_clean_amount,
        updated_at = NOW()
    RETURNING liquid_usd INTO v_new_balance;
  END IF;

  -- 4. Immutable Double-Entry Ledger Insert
  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at, metadata
  ) VALUES (
    v_uid,
    v_clean_amount,
    'deposit',
    'Instant Deposit (' || v_asset || ') — IFB Treasury Rails',
    'completed',
    NOW(),
    jsonb_build_object(
      'method', 'instant_in_app_deposit',
      'asset', v_asset,
      'timestamp', NOW()
    )
  );

  -- 5. System Audit Trail
  INSERT INTO public.system_audit_ledger (
    actor_id, action_type, entity_affected, details
  ) VALUES (
    v_uid,
    'INSTANT_DEPOSIT_COMPLETED',
    v_uid::text,
    jsonb_build_object(
      'amount', v_clean_amount,
      'asset', v_asset,
      'new_balance', v_new_balance
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_clean_amount,
    'asset', v_asset,
    'new_balance', v_new_balance,
    'message', 'Deposit of ' || v_clean_amount || ' ' || v_asset || ' processed successfully.'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.instant_deposit(NUMERIC, TEXT) TO authenticated;

-- ==============================================================================
-- Process Internal Transfers Between User Sub-Accounts (Liquid, Vault, AFR)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.process_internal_transfer(UUID, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.process_internal_transfer;

CREATE OR REPLACE FUNCTION public.process_internal_transfer(
  p_user_id UUID,
  p_from TEXT,
  p_to TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID;
  v_amt NUMERIC;
  v_source_bal NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL OR v_uid != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized caller.');
  END IF;

  v_amt := ROUND(p_amount::numeric, 2);
  IF v_amt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
  END IF;

  -- 1. Check & debit source balance
  IF p_from = 'liquid_usd' OR p_from = 'USD' OR p_from = 'checking' THEN
    SELECT liquid_usd INTO v_source_bal FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_source_bal IS NULL OR v_source_bal < v_amt THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient liquid funds.');
    END IF;
    UPDATE public.balances SET liquid_usd = liquid_usd - v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSIF p_from = 'mysafe_digital_usd' OR p_from = 'savings' OR p_from = 'vault' THEN
    SELECT mysafe_digital_usd INTO v_source_bal FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_source_bal IS NULL OR v_source_bal < v_amt THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient vault funds.');
    END IF;
    UPDATE public.balances SET mysafe_digital_usd = mysafe_digital_usd - v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSIF p_from = 'afr_balance' OR p_from = 'AFR' THEN
    SELECT afr_balance INTO v_source_bal FROM public.balances WHERE user_id = v_uid FOR UPDATE;
    IF v_source_bal IS NULL OR v_source_bal < v_amt THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient AFR funds.');
    END IF;
    UPDATE public.balances SET afr_balance = afr_balance - v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid source account.');
  END IF;

  -- 2. Credit destination balance
  IF p_to = 'liquid_usd' OR p_to = 'USD' OR p_to = 'checking' THEN
    UPDATE public.balances SET liquid_usd = COALESCE(liquid_usd, 0) + v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSIF p_to = 'mysafe_digital_usd' OR p_to = 'savings' OR p_to = 'vault' THEN
    UPDATE public.balances SET mysafe_digital_usd = COALESCE(mysafe_digital_usd, 0) + v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSIF p_to = 'afr_balance' OR p_to = 'AFR' THEN
    UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) + (v_amt * 100), updated_at = NOW() WHERE user_id = v_uid;
  ELSIF p_to = 'alpha_equity_usd' OR p_to = 'invest' THEN
    UPDATE public.balances SET alpha_equity_usd = COALESCE(alpha_equity_usd, 0) + v_amt, updated_at = NOW() WHERE user_id = v_uid;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid destination account.');
  END IF;

  -- 3. Log internal transfer
  INSERT INTO public.transactions (
    user_id, amount, transaction_type, description, status, created_at
  ) VALUES (
    v_uid,
    0,
    'transfer_internal',
    'Internal transfer of $' || v_amt || ' from ' || p_from || ' to ' || p_to,
    'completed',
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'amount', v_amt);
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_internal_transfer(UUID, TEXT, TEXT, NUMERIC) TO authenticated;
