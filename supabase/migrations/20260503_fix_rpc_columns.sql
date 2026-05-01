-- Fix: Add missing columns and correct broken RPC functions
-- Broken because they reference columns that don't exist in production schema

-- 1. Add escrow_usd to balances (used by SmartContracts and process_npo_donation)
ALTER TABLE balances ADD COLUMN IF NOT EXISTS escrow_usd NUMERIC DEFAULT 0;

-- 2. Fix process_npo_donation — was referencing non-existent usd_balance column
CREATE OR REPLACE FUNCTION process_npo_donation(
  p_npo_id UUID,
  p_donor_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donor_bal NUMERIC;
  v_npo_user_id UUID;
BEGIN
  -- Get donor balance
  SELECT liquid_usd INTO v_donor_bal FROM balances WHERE user_id = p_donor_id FOR UPDATE;
  IF v_donor_bal IS NULL OR v_donor_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance for donation';
  END IF;

  -- Get the npo_profile owner's user_id
  SELECT id INTO v_npo_user_id FROM npo_profiles WHERE id = p_npo_id;
  IF v_npo_user_id IS NULL THEN
    RAISE EXCEPTION 'NPO not found';
  END IF;

  -- Deduct from donor
  UPDATE balances SET liquid_usd = liquid_usd - p_amount WHERE user_id = p_donor_id;

  -- Credit NPO owner
  INSERT INTO balances (user_id, liquid_usd, afr_balance)
    VALUES (v_npo_user_id, p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE SET liquid_usd = balances.liquid_usd + p_amount;

  -- Log transaction for donor
  INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (p_donor_id, 'npo_donation', p_amount, 'Donation to NPO ' || p_npo_id::TEXT, 'completed');

  -- Log transaction for NPO
  INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_npo_user_id, 'npo_received', p_amount, 'Donation received from ' || p_donor_id::TEXT, 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION process_npo_donation(UUID, UUID, NUMERIC) TO authenticated;

-- 3. Fix release_smart_contract — was referencing non-existent escrow_usd in wrong place
CREATE OR REPLACE FUNCTION release_smart_contract(p_contract_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_provider_user_id UUID;
BEGIN
  -- Get contract
  SELECT * INTO v_contract FROM smart_contracts WHERE id = p_contract_id FOR UPDATE;
  IF v_contract IS NULL THEN RAISE EXCEPTION 'Contract not found'; END IF;
  IF v_contract.status != 'active_locked' THEN RAISE EXCEPTION 'Contract is not in locked state'; END IF;

  -- Verify caller is the creator
  IF auth.uid() != v_contract.creator_id THEN
    RAISE EXCEPTION 'Only the contract creator can release funds';
  END IF;

  -- Find provider by email
  SELECT id INTO v_provider_user_id FROM profiles WHERE email = v_contract.provider_email LIMIT 1;

  -- Move escrow → provider (or back to creator if provider not found)
  IF v_provider_user_id IS NOT NULL THEN
    INSERT INTO balances (user_id, liquid_usd, afr_balance)
      VALUES (v_provider_user_id, v_contract.amount, 0)
      ON CONFLICT (user_id) DO UPDATE SET liquid_usd = balances.liquid_usd + v_contract.amount;
    INSERT INTO transactions (user_id, type, amount, description, status)
      VALUES (v_provider_user_id, 'escrow_release', v_contract.amount,
              'Smart contract release: ' || v_contract.title, 'completed');
  ELSE
    -- Provider not on platform — return to creator
    UPDATE balances SET liquid_usd = liquid_usd + v_contract.amount
      WHERE user_id = v_contract.creator_id;
  END IF;

  -- Reduce escrow balance
  UPDATE balances SET escrow_usd = GREATEST(0, escrow_usd - v_contract.amount)
    WHERE user_id = v_contract.creator_id;

  -- Mark contract completed
  UPDATE smart_contracts SET status = 'completed', updated_at = NOW() WHERE id = p_contract_id;

  -- Log for creator
  INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_contract.creator_id, 'escrow_released', v_contract.amount,
            'Released smart contract: ' || v_contract.title, 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION release_smart_contract(UUID) TO authenticated;

-- 4. Fix process_corporate_payroll_v2 — drop old overloads, create with correct params
DROP FUNCTION IF EXISTS process_corporate_payroll_v2(UUID, NUMERIC);
DROP FUNCTION IF EXISTS process_corporate_payroll_v2(UUID, NUMERIC, JSONB, NUMERIC);
CREATE OR REPLACE FUNCTION process_corporate_payroll_v2(
  p_org_id UUID,
  p_total NUMERIC,
  p_employees JSONB,
  p_fee NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_bal NUMERIC;
  v_total_due NUMERIC;
  v_emp JSONB;
  v_paid_count INT := 0;
BEGIN
  v_total_due := p_total + p_fee;

  -- Check org owner balance
  SELECT liquid_usd INTO v_org_bal FROM balances WHERE user_id = p_org_id FOR UPDATE;
  IF v_org_bal IS NULL OR v_org_bal < v_total_due THEN
    RAISE EXCEPTION 'Insufficient balance: need $%, have $%', v_total_due, COALESCE(v_org_bal, 0);
  END IF;

  -- Deduct total from org
  UPDATE balances SET liquid_usd = liquid_usd - v_total_due WHERE user_id = p_org_id;

  -- Credit each employee
  FOR v_emp IN SELECT * FROM jsonb_array_elements(p_employees)
  LOOP
    DECLARE
      v_emp_id UUID;
      v_emp_amount NUMERIC;
    BEGIN
      v_emp_id := (v_emp->>'user_id')::UUID;
      v_emp_amount := (v_emp->>'net_pay')::NUMERIC;

      IF v_emp_id IS NOT NULL AND v_emp_amount > 0 THEN
        INSERT INTO balances (user_id, liquid_usd, afr_balance)
          VALUES (v_emp_id, v_emp_amount, 0)
          ON CONFLICT (user_id) DO UPDATE SET liquid_usd = balances.liquid_usd + v_emp_amount;

        INSERT INTO transactions (user_id, type, amount, description, status)
          VALUES (v_emp_id, 'payroll_credit', v_emp_amount, 'Payroll from org ' || p_org_id::TEXT, 'completed');

        v_paid_count := v_paid_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- skip invalid employees, don't fail whole run
    END;
  END LOOP;

  -- Log payroll debit for org
  INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (p_org_id, 'payroll_debit', v_total_due,
            'Payroll run: ' || v_paid_count || ' employees + $' || p_fee || ' fee', 'completed');

  RETURN jsonb_build_object('paid', v_paid_count, 'total', v_total_due, 'fee', p_fee);
END;
$$;

GRANT EXECUTE ON FUNCTION process_corporate_payroll_v2(UUID, NUMERIC, JSONB, NUMERIC) TO authenticated;

-- 5. Fix process_p2p_escrow — validate and lock funds for P2P withdrawal
CREATE OR REPLACE FUNCTION process_p2p_escrow(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_bal NUMERIC;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.user_id != auth.uid() THEN RAISE EXCEPTION 'Not your order'; END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;

  SELECT liquid_usd INTO v_bal FROM balances WHERE user_id = auth.uid() FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_order.amount_usd THEN
    RAISE EXCEPTION 'Insufficient balance for escrow';
  END IF;

  UPDATE balances
    SET liquid_usd = liquid_usd - v_order.amount_usd,
        escrow_usd = escrow_usd + v_order.amount_usd
    WHERE user_id = auth.uid();

  UPDATE p2p_orders SET status = 'escrow_locked', updated_at = NOW() WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION process_p2p_escrow(UUID) TO authenticated;

-- 6. Fix finalize_p2p_trade — release escrow to complete trade
DROP FUNCTION IF EXISTS finalize_p2p_trade(UUID);
CREATE OR REPLACE FUNCTION finalize_p2p_trade(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM p2p_orders WHERE id = p_order_id FOR UPDATE;
  IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status != 'escrow_locked' THEN RAISE EXCEPTION 'Order is not in escrow'; END IF;

  -- Mark order complete and release escrow (funds already sent to external bank)
  UPDATE balances
    SET escrow_usd = GREATEST(0, escrow_usd - v_order.amount_usd)
    WHERE user_id = v_order.user_id;

  UPDATE p2p_orders SET status = 'completed', updated_at = NOW() WHERE id = p_order_id;

  INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_order.user_id, 'p2p_withdrawal', v_order.amount_usd,
            'P2P withdrawal via ' || COALESCE(v_order.payment_method, 'bank'), 'completed');
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_p2p_trade(UUID) TO authenticated;
