-- ============================================================================
-- 20261112 — fixes from the 8 Nov 2026 user test (docs/USER-TEST-REPORT-2026-11-08.md)
--
--   B1  p2p_transfer is missing in production → "Send money" fails for everyone.
--       Re-created safely: the sender is always the signed-in user (no admin
--       bypass), both wallets are locked in a fixed order, and it matches the
--       live balances table (which has no updated_at column).
--   B3  process_payment_request is missing → "Confirm" on a payment request fails.
--       The amount and requester come from the payer's own notification row,
--       never from the client.
--   R1  Anyone (logged out) could read every profile's email, KYC status and
--       GPS location. Logged-out visitors now see only id, name, avatar and tier
--       (all that pay links and public event pages use).
--
-- Additive and safe for old app versions: the RPC names and arguments are the
-- ones the app already calls.
-- ============================================================================

BEGIN;

-- ── Internal: move money between two users (not callable from the API) ─────
CREATE OR REPLACE FUNCTION public._ifb_user_transfer(
  p_sender   UUID,
  p_receiver UUID,
  p_amount   NUMERIC,
  p_asset    TEXT,
  p_note     TEXT,
  p_kind     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset    TEXT    := UPPER(COALESCE(p_asset, 'USD'));
  v_amt      NUMERIC := ROUND(p_amount, 2);
  v_balance  NUMERIC;
  v_sender_name   TEXT;
  v_receiver_name TEXT;
  v_ref      UUID    := gen_random_uuid();
BEGIN
  IF v_asset NOT IN ('USD', 'AFR') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported currency.');
  END IF;
  IF v_amt IS NULL OR v_amt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
  END IF;
  IF p_receiver IS NULL OR p_sender = p_receiver THEN
    RETURN jsonb_build_object('success', false, 'error', 'Choose another IFB user to send to.');
  END IF;

  SELECT full_name INTO v_receiver_name FROM public.profiles WHERE id = p_receiver;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient account not found on IFB.');
  END IF;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = p_sender;

  -- Make sure both wallets exist, then lock them in a fixed order (no deadlocks).
  INSERT INTO public.balances (user_id) VALUES (p_sender), (p_receiver) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM public.balances WHERE user_id IN (p_sender, p_receiver) ORDER BY user_id FOR UPDATE;

  IF v_asset = 'AFR' THEN
    SELECT COALESCE(afr_balance, 0) INTO v_balance FROM public.balances WHERE user_id = p_sender;
  ELSE
    SELECT COALESCE(liquid_usd, 0) INTO v_balance FROM public.balances WHERE user_id = p_sender;
  END IF;
  IF v_balance < v_amt THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds.', 'available', v_balance, 'requested', v_amt);
  END IF;

  IF v_asset = 'AFR' THEN
    UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) - v_amt, last_synced = NOW() WHERE user_id = p_sender;
    UPDATE public.balances SET afr_balance = COALESCE(afr_balance, 0) + v_amt, last_synced = NOW() WHERE user_id = p_receiver;
  ELSE
    UPDATE public.balances SET liquid_usd = COALESCE(liquid_usd, 0) - v_amt, last_synced = NOW() WHERE user_id = p_sender;
    UPDATE public.balances SET liquid_usd = COALESCE(liquid_usd, 0) + v_amt, last_synced = NOW() WHERE user_id = p_receiver;
  END IF;

  INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, metadata, source_type, authorized_by)
  VALUES
    (p_sender,   -v_amt, p_kind || '_send',
     'Sent to ' || COALESCE(v_receiver_name, 'IFB user') || COALESCE(' — ' || NULLIF(p_note, ''), ''),
     'completed', jsonb_build_object('asset', v_asset, 'counterparty', p_receiver, 'ref', v_ref), 'internal', 'user'),
    (p_receiver,  v_amt, p_kind || '_receive',
     'Received from ' || COALESCE(v_sender_name, 'IFB user') || COALESCE(' — ' || NULLIF(p_note, ''), ''),
     'completed', jsonb_build_object('asset', v_asset, 'counterparty', p_sender, 'ref', v_ref), 'internal', 'user');

  INSERT INTO public.notifications (user_id, type, message, amount, related_user_id, status, metadata)
  VALUES (p_receiver, 'p2p_received',
          'You received ' || v_amt || ' ' || v_asset || ' from ' || COALESCE(v_sender_name, 'an IFB user') || '.',
          v_amt, p_sender, 'completed', jsonb_build_object('asset', v_asset, 'ref', v_ref));

  RETURN jsonb_build_object('success', true, 'amount', v_amt, 'asset', v_asset, 'reference', v_ref);
END;
$$;

REVOKE ALL ON FUNCTION public._ifb_user_transfer(UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ── B1: Send money ───────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.p2p_transfer(UUID, UUID, NUMERIC);

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
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only send money from your own account.');
  END IF;
  RETURN public._ifb_user_transfer(sender_id, receiver_id, transfer_amount, p_asset, NULL, 'p2p');
END;
$$;

REVOKE ALL ON FUNCTION public.p2p_transfer(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.p2p_transfer(UUID, UUID, NUMERIC, TEXT) TO authenticated;

-- ── B3: Pay a payment request ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_payment_request(
  p_sender_id       UUID,
  p_receiver_id     UUID,
  p_amount          NUMERIC,
  p_notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n         public.notifications%ROWTYPE;
  v_requester UUID;
  v_amount    NUMERIC;
  v_result    JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_sender_id THEN
    RAISE EXCEPTION 'You can only pay requests sent to you.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_n FROM public.notifications
   WHERE id = p_notification_id AND user_id = p_sender_id AND type = 'payment_request'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found.' USING ERRCODE = 'P0002';
  END IF;
  IF COALESCE(v_n.status, 'pending') <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been handled.' USING ERRCODE = '22023';
  END IF;

  -- Trust the stored request, not the client.
  v_requester := COALESCE(v_n.related_user_id, NULLIF(v_n.metadata->>'requester_id', '')::UUID);
  v_amount    := COALESCE(v_n.amount, NULLIF(v_n.metadata->>'amount', '')::NUMERIC);
  IF v_requester IS NULL OR v_amount IS NULL THEN
    RAISE EXCEPTION 'Invalid payment request.' USING ERRCODE = '22023';
  END IF;
  IF v_requester IS DISTINCT FROM p_receiver_id OR ROUND(v_amount, 2) <> ROUND(p_amount, 2) THEN
    RAISE EXCEPTION 'Request details do not match.' USING ERRCODE = '22023';
  END IF;

  v_result := public._ifb_user_transfer(p_sender_id, v_requester, v_amount, 'USD',
                                        NULLIF(v_n.metadata->>'reason', ''), 'request');
  IF (v_result->>'success')::BOOLEAN IS NOT TRUE THEN
    RAISE EXCEPTION '%', COALESCE(v_result->>'error', 'Payment failed.') USING ERRCODE = '22023';
  END IF;

  UPDATE public.notifications SET status = 'completed', read = true WHERE id = v_n.id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.process_payment_request(UUID, UUID, NUMERIC, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_payment_request(UUID, UUID, NUMERIC, UUID) TO authenticated;

-- ── R1: logged-out visitors see only public profile fields ──────────────────
-- Rows stay visible (pay links and public event pages look people up by id),
-- but only these columns. Signed-in access is unchanged.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, active_tier) ON public.profiles TO anon;

COMMIT;
