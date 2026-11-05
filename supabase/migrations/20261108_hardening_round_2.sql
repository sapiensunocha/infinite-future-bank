-- 20261108_hardening_round_2.sql
-- Follow-up to 20261107_lock_open_objects.sql (see docs/STATUS-2026-11-05.md).
--
--   PART 1  Charge the 0.5% withdrawal routing fee on the server, when a P2P
--           withdrawal completes (the app shows the fee but has not charged it
--           since 2026-10-27).
--   PART 2  Pin search_path on admin-rights (SECURITY DEFINER) functions.
--   PART 3  Replace "anyone can write" rules with rules that match how the
--           apps actually use each table.
--
-- Each part can be run on its own. Forward-only and idempotent.
-- Checked against every app in this repo (apps/*). NOT checked against the
-- Skylink app, so its tables (sl_*) and storage buckets are left alone.

-- ===========================================================================
-- PART 1. Withdrawal fee, charged at completion.
--   * Charged only when the withdrawal actually completes, so a cancelled or
--     disputed order never pays a fee.
--   * Never takes the balance below zero: if the user spent the money in the
--     meantime, only what is there is taken (and the ledger says so).
--   * Recorded in the user's history (transactions) and in ifb_revenue_ledger.
--   * Everything else in this function is unchanged from the live version.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public._finalize_p2p_trade_impl(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   UUID := auth.uid();
  v_order RECORD;
  v_ok    BOOLEAN := FALSE;
  v_fee   NUMERIC;
  v_taken NUMERIC;
BEGIN
  SELECT * INTO v_order FROM public.p2p_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF public._is_trusted_backend() OR public.is_admin() THEN
    v_ok := TRUE;
  ELSIF v_uid IS NOT NULL THEN
    v_ok := v_order.user_id = v_uid
         OR v_order.processor_id = v_uid
         OR EXISTS (SELECT 1 FROM public.processor_profiles pp
                    WHERE pp.id = v_order.processor_id AND pp.user_id = v_uid AND pp.status = 'active');
  END IF;

  IF NOT COALESCE(v_ok, FALSE) THEN
    RAISE EXCEPTION 'Access denied: not a party to this order' USING ERRCODE = '42501';
  END IF;

  IF v_order.order_type = 'deposit' THEN
    RAISE EXCEPTION 'Deposit orders are confirmed via confirm_p2p_receipt';
  END IF;

  IF v_order.status NOT IN ('locked_in_escrow', 'proof_uploaded', 'proof_verified', 'escrow_locked') THEN
    RAISE EXCEPTION 'Order cannot be finalized: status is %', v_order.status;
  END IF;

  UPDATE public.balances
     SET escrow_usd = GREATEST(0, COALESCE(escrow_usd, 0) - v_order.amount_usd), updated_at = NOW()
   WHERE user_id = v_order.user_id;

  UPDATE public.p2p_orders
     SET status = 'completed', completed_at = NOW()
   WHERE id = p_id;

  INSERT INTO public.transactions (user_id, transaction_type, amount, description, status, created_at)
  VALUES (v_order.user_id, 'p2p_withdrawal', -v_order.amount_usd,
          'P2P withdrawal via ' || COALESCE(v_order.payment_method, 'bank'), 'completed', NOW());

  -- NEW: 0.5% routing fee on withdrawals (same rate the app shows).
  IF v_order.order_type = 'withdraw' THEN
    v_fee := ROUND(COALESCE(v_order.amount_usd, 0) * 0.005, 2);
    IF v_fee > 0 THEN
      SELECT LEAST(v_fee, GREATEST(COALESCE(liquid_usd, 0), 0)) INTO v_taken
        FROM public.balances WHERE user_id = v_order.user_id FOR UPDATE;
      v_taken := COALESCE(v_taken, 0);
      IF v_taken > 0 THEN
        UPDATE public.balances
           SET liquid_usd = liquid_usd - v_taken, updated_at = NOW()
         WHERE user_id = v_order.user_id;

        INSERT INTO public.transactions (user_id, transaction_type, amount, description, status, metadata, created_at)
        VALUES (v_order.user_id, 'withdrawal_fee', -v_taken,
                'Withdrawal Routing Fee (0.5%) — $' || to_char(v_order.amount_usd, 'FM999999990.00'),
                'completed', jsonb_build_object('p2p_order_id', p_id, 'fee_due', v_fee), NOW());

        INSERT INTO public.ifb_revenue_ledger (source_type, reference_id, amount_usd, customer_id, description, received_at)
        VALUES ('withdrawal_fee', p_id::text, v_taken, v_order.user_id::text,
                'P2P withdrawal routing fee (0.5%)', NOW());
      END IF;
    END IF;
  END IF;
END;
$function$;

-- ===========================================================================
-- PART 2. Admin-rights functions without a fixed search_path.
--   A SECURITY DEFINER function that resolves names through the caller's
--   search_path can be tricked into calling an object the caller created.
--   'public, extensions' matches what these functions see today (Supabase's
--   default search_path), so their behaviour does not change.
--   A function this role does not own is skipped and reported, not fatal.
-- ===========================================================================
DO $$
DECLARE r record; n_ok int := 0; n_skip int := 0;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', r.sig);
      n_ok := n_ok + 1;
    EXCEPTION WHEN insufficient_privilege THEN
      n_skip := n_skip + 1;
      RAISE NOTICE 'skipped (not owner): %', r.sig;
    END;
  END LOOP;
  RAISE NOTICE 'search_path pinned on % functions, skipped %', n_ok, n_skip;
END;
$$;

-- ===========================================================================
-- PART 3. "Anyone can write" rules.
-- ===========================================================================

-- 3a. Tables no app in this repo uses, open to ALL (read + write + delete)
--     for everyone. Now server/admin only.
DROP POLICY IF EXISTS all_certs   ON public.ifb_academy_certificates;
DROP POLICY IF EXISTS all_progress ON public.ifb_academy_progress;
DROP POLICY IF EXISTS pa_public    ON public.protected_addresses;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ifb_academy_certificates', 'ifb_academy_progress', 'protected_addresses'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t || '_admin_all', t);
  END LOOP;
END;
$$;

-- 3b. News: anyone may still read (existing "Allow public read access");
--     only admins may write (was: anyone could edit or delete any article).
DROP POLICY IF EXISTS "Allow all for authenticated/admin" ON public.news_articles;
DROP POLICY IF EXISTS news_articles_admin_write ON public.news_articles;
CREATE POLICY news_articles_admin_write ON public.news_articles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3c. Anyone could change any row (no app in this repo does this). Removed;
--     submitting new rows (forms) still works where an INSERT rule exists.
DROP POLICY IF EXISTS anon_update_pitch               ON public.ifb_pitch_codes;
DROP POLICY IF EXISTS "Allow update representatives"  ON public.ifb_representatives;
DROP POLICY IF EXISTS "Allow update surveys"          ON public.ifb_surveys;

-- 3d. NPO money records. Donations are written by the npo-donate function
--     (service role); raffle tickets are not sold by any app in this repo.
--     Anyone could insert fake donations or free tickets. Removed.
DROP POLICY IF EXISTS donations_insert     ON public.npo_donations;
DROP POLICY IF EXISTS raffle_tickets_insert ON public.npo_raffle_tickets;

-- 3e. Event registrations: only for yourself (apps insert attendee_id = you).
DROP POLICY IF EXISTS registrations_insert ON public.npo_event_registrations;
DROP POLICY IF EXISTS registrations_insert_own ON public.npo_event_registrations;
CREATE POLICY registrations_insert_own ON public.npo_event_registrations FOR INSERT TO authenticated
  WITH CHECK (attendee_id = auth.uid());

-- 3f. Notifications: you may notify someone only about something you did
--     (related_user_id = you), notify yourself, or be an admin.
--     Was: any logged-in user could put any message in anyone's inbox.
--     App uses: P2P trades and withdrawals set related_user_id = sender;
--     transfers now do too (PayInterface); admin broadcasts pass is_admin().
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_scoped ON public.notifications;
CREATE POLICY notifications_insert_scoped ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR related_user_id = auth.uid() OR public.is_admin());

-- 3g. Marketplace order lines: only on your own order that is still pending.
DROP POLICY IF EXISTS market_items_insert ON public.deus_market_order_items;
DROP POLICY IF EXISTS market_items_insert_own ON public.deus_market_order_items;
CREATE POLICY market_items_insert_own ON public.deus_market_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.deus_market_orders o
                       WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status = 'pending'));

-- 3h. Feedback form: anonymous or as yourself, never as someone else.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'ifb_feedback_surveys' AND column_name = 'user_id') THEN
    DROP POLICY IF EXISTS "Enable insert for all users" ON public.ifb_feedback_surveys;
    DROP POLICY IF EXISTS feedback_insert_self_or_anon ON public.ifb_feedback_surveys;
    CREATE POLICY feedback_insert_self_or_anon ON public.ifb_feedback_surveys FOR INSERT TO anon, authenticated
      WITH CHECK (user_id IS NULL OR user_id = auth.uid());
  END IF;
END;
$$;

-- Kept on purpose (insert-only public forms, nothing readable back):
--   app_telemetry, disaster_heroes, ifb_investor_access_requests,
--   ifb_investor_expressions, ifb_learning_requests, ifb_learning_search_log,
--   ifb_representatives (insert), ifb_surveys (insert), ifb_survey_responses,
--   and the *_submit_only form tables from 20261107.
-- Left alone: sl_relay_legs (Skylink app; decide together with Part B).

-- ---------------------------------------------------------------------------
-- CHECKS (read the results)
-- ---------------------------------------------------------------------------
-- Should return 0 rows (only the kept insert-only forms may still say "true"):
SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public' AND cmd IN ('UPDATE', 'DELETE', 'ALL')
   AND (COALESCE(qual, '') = 'true' OR COALESCE(with_check, '') = 'true')
   AND 'service_role' <> ALL (roles)
   AND tablename NOT LIKE 'sl\_%';

-- Should return 0:
SELECT count(*) AS definer_functions_without_search_path
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef
   AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%');
