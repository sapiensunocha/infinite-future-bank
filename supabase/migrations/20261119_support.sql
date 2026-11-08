-- ============================================================================
-- 20261119 — Customer support: live chat, disputes, transaction tracing
--
-- Builds on the existing support_tickets / support_messages (used by the AI chat
-- hand-off and the admin support desk):
--   * tickets get a number (SUP-000123), category, priority, linked transaction,
--     assignee and dispute outcome fields
--   * live chat really is live: both tables join the realtime publication
--     (they were not in it, so agent replies never arrived until reload)
--   * customers can only post as themselves (could post as 'agent' before)
--   * create_support_ticket / open_dispute / trace_transaction for customers
--   * resolve_support_ticket for IFB agents (admins): resolve, reject, or refund
--     a dispute into the customer's wallet (once, capped at the disputed amount)
-- Additive and backwards compatible with the current app.
-- ============================================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1001;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS number          TEXT,
  ADD COLUMN IF NOT EXISTS category        TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority        TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS transaction_id  UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution      TEXT,
  ADD COLUMN IF NOT EXISTS outcome         TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount   NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS refund_transaction_id UUID,
  ADD COLUMN IF NOT EXISTS resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_sender     TEXT;

UPDATE public.support_tickets SET number = 'SUP-' || lpad(nextval('public.support_ticket_seq')::text, 6, '0') WHERE number IS NULL;
ALTER TABLE public.support_tickets ALTER COLUMN number SET DEFAULT 'SUP-' || lpad(nextval('public.support_ticket_seq')::text, 6, '0');
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_number_uniq ON public.support_tickets (number);
CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_open_idx ON public.support_tickets (status, priority, last_message_at DESC);

ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_category_check CHECK (category IN
  ('general', 'account', 'kyc', 'deposit', 'withdrawal', 'transfer', 'card', 'invoice', 'dispute', 'fraud', 'other'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_priority_check CHECK (priority IN ('normal', 'high', 'urgent'));
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_outcome_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_outcome_check CHECK (outcome IS NULL OR outcome IN ('resolved', 'refunded', 'rejected'));

-- Only one open dispute per transaction.
CREATE UNIQUE INDEX IF NOT EXISTS support_one_open_dispute ON public.support_tickets (transaction_id)
  WHERE category = 'dispute' AND status NOT IN ('resolved', 'closed');

-- Customers post only as themselves, only on their own tickets; agents post as agent/system.
DROP POLICY IF EXISTS "Users insert messages to own tickets" ON public.support_messages;
DROP POLICY IF EXISTS support_messages_user_insert ON public.support_messages;
CREATE POLICY support_messages_user_insert ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (sender_type = 'user' AND sender_id = auth.uid()
              AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins insert messages" ON public.support_messages;
DROP POLICY IF EXISTS support_messages_agent_insert ON public.support_messages;
CREATE POLICY support_messages_agent_insert ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND sender_type IN ('agent', 'system') AND sender_id = auth.uid());

-- Ticket activity + notify the customer when an agent replies.
CREATE OR REPLACE FUNCTION public._support_message_after()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_t public.support_tickets%ROWTYPE;
BEGIN
  UPDATE public.support_tickets
     SET last_message_at = NEW.created_at, updated_at = now(), last_sender = NEW.sender_type,
         status = CASE WHEN NEW.sender_type = 'user' AND status = 'resolved' THEN 'open'
                       WHEN NEW.sender_type = 'agent' AND status = 'open' THEN 'agent_assigned'
                       ELSE status END
   WHERE id = NEW.ticket_id
   RETURNING * INTO v_t;
  IF NEW.sender_type = 'agent' AND v_t.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, message, status, metadata)
    VALUES (v_t.user_id, 'support_reply', 'Support replied to ' || v_t.number || ': ' || left(NEW.message, 120),
            'pending', jsonb_build_object('ticket_id', v_t.id));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS support_message_after ON public.support_messages;
CREATE TRIGGER support_message_after AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public._support_message_after();

-- ── Customer: open a ticket (optionally about a transaction) ────────────────
CREATE OR REPLACE FUNCTION public.create_support_ticket(p_category TEXT, p_subject TEXT, p_message TEXT, p_transaction_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cat TEXT := lower(COALESCE(p_category, 'general'));
  v_t public.support_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF length(trim(COALESCE(p_message, ''))) < 3 THEN RAISE EXCEPTION 'Tell us a little more about the problem' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.support_tickets WHERE user_id = v_uid AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many new requests. Please reply in your existing conversation.' USING ERRCODE = '22023';
  END IF;
  IF p_transaction_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.transactions WHERE id = p_transaction_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Transaction not found on your account' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.support_tickets (user_id, status, subject, category, priority, transaction_id)
  VALUES (v_uid, 'open', left(COALESCE(NULLIF(trim(p_subject), ''), left(trim(p_message), 80)), 100), v_cat,
          CASE WHEN v_cat IN ('dispute', 'fraud') THEN 'high' ELSE 'normal' END, p_transaction_id)
  RETURNING * INTO v_t;

  INSERT INTO public.support_messages (ticket_id, sender_id, sender_type, message) VALUES (v_t.id, v_uid, 'user', left(trim(p_message), 4000));
  INSERT INTO public.support_messages (ticket_id, sender_id, sender_type, message) VALUES (v_t.id, NULL, 'system',
    'Thanks — your request ' || v_t.number || ' is with the IFB support team. An agent will reply in this conversation and you will get a notification.');
  RETURN jsonb_build_object('id', v_t.id, 'number', v_t.number);
END;
$$;
REVOKE ALL ON FUNCTION public.create_support_ticket(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- ── Customer: dispute a transaction ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_dispute(p_transaction_id UUID, p_reason TEXT, p_details TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_tx public.transactions%ROWTYPE;
  v_existing TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found on your account' USING ERRCODE = 'P0002'; END IF;
  IF v_tx.created_at < now() - interval '120 days' THEN
    RAISE EXCEPTION 'Disputes must be opened within 120 days. Contact support instead.' USING ERRCODE = '22023';
  END IF;
  SELECT number INTO v_existing FROM public.support_tickets
   WHERE transaction_id = p_transaction_id AND category = 'dispute' AND status NOT IN ('resolved', 'closed');
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('existing', true, 'number', v_existing,
      'id', (SELECT id FROM public.support_tickets WHERE number = v_existing));
  END IF;
  RETURN public.create_support_ticket('dispute',
    'Dispute: ' || COALESCE(NULLIF(trim(p_reason), ''), 'transaction') || ' (' || to_char(abs(v_tx.amount), 'FM999999990.00') || ' USD)',
    'Reason: ' || COALESCE(NULLIF(trim(p_reason), ''), 'not given') || E'\n' || COALESCE(trim(p_details), ''),
    p_transaction_id);
END;
$$;
REVOKE ALL ON FUNCTION public.open_dispute(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_dispute(UUID, TEXT, TEXT) TO authenticated;

-- ── Trace a transaction by receipt number, transaction ID or reference ──────
-- Customers can trace only their own; IFB agents (admins) can trace any.
CREATE OR REPLACE FUNCTION public.trace_transaction(p_ref TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_admin BOOLEAN := public.is_admin();
  v_ref   TEXT := trim(COALESCE(p_ref, ''));
  v_hex   TEXT;
  v_out   JSONB := '[]'::jsonb;
  r       RECORD;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF length(v_ref) < 6 THEN RETURN v_out; END IF;
  -- Receipt numbers look like IFB-1A2B3C4D5E (first 10 hex characters of the transaction id).
  v_hex := lower(regexp_replace(regexp_replace(v_ref, '^IFB-', '', 'i'), '[^0-9a-fA-F]', '', 'g'));

  FOR r IN
    SELECT t.*, u.full_name AS holder,
           (SELECT jsonb_agg(jsonb_build_object('number', s.number, 'status', s.status, 'outcome', s.outcome) ORDER BY s.created_at)
              FROM public.support_tickets s WHERE s.transaction_id = t.id) AS tickets
      FROM public.transactions t
      LEFT JOIN public.profiles u ON u.id = t.user_id
     WHERE (v_admin OR t.user_id = v_uid)
       AND ( t.id::text = lower(v_ref)
          OR (length(v_hex) >= 10 AND replace(t.id::text, '-', '') LIKE v_hex || '%')
          OR t.metadata->>'ref' = v_ref OR t.metadata->>'reference' = v_ref
          OR t.external_id IN (v_ref, 'deposit:' || v_ref) )
     ORDER BY t.created_at DESC
     LIMIT 5
  LOOP
    v_out := v_out || jsonb_build_object(
      'kind', 'transaction', 'id', r.id, 'created_at', r.created_at, 'type', r.transaction_type,
      'description', r.description, 'amount', r.amount, 'status', r.status,
      'holder', CASE WHEN v_admin THEN r.holder END, 'user_id', CASE WHEN v_admin THEN r.user_id END,
      'reference', COALESCE(r.metadata->>'ref', r.metadata->>'reference', r.external_id),
      'disputes', COALESCE(r.tickets, '[]'::jsonb));
  END LOOP;

  -- Withdrawals and payouts (agent or Flutterwave) by order id or payout reference.
  FOR r IN
    SELECT o.*, pp.full_name AS agent
      FROM public.p2p_orders o LEFT JOIN public.profiles pp ON pp.id = o.processor_id
     WHERE (v_admin OR o.user_id = v_uid)
       AND (o.id::text = lower(v_ref) OR o.metadata->>'flw_reference' = v_ref)
     LIMIT 5
  LOOP
    v_out := v_out || jsonb_build_object(
      'kind', 'order', 'id', r.id, 'created_at', r.created_at, 'type', r.order_type, 'description', r.payment_method,
      'amount', CASE WHEN r.order_type = 'withdraw' THEN -r.amount_usd ELSE r.amount_usd END, 'status', r.status,
      'agent', r.agent, 'locked_at', r.locked_at, 'completed_at', r.completed_at, 'reference', r.metadata->>'flw_reference');
  END LOOP;

  -- Deposits started through Instant Deposit / mobile money (reference IFB.INSTANT.…).
  FOR r IN
    SELECT d.* FROM public.deposit_intents d
     WHERE (v_admin OR d.user_id = v_uid) AND (d.tx_ref = v_ref OR d.id::text = lower(v_ref) OR d.provider_ref = v_ref)
     LIMIT 5
  LOOP
    v_out := v_out || jsonb_build_object(
      'kind', 'deposit', 'id', r.id, 'created_at', r.created_at, 'type', 'deposit',
      'description', 'Deposit via ' || r.provider || ' (' || r.charge_currency || ' ' || r.charge_amount || ')',
      'amount', r.amount_usd, 'status', r.status, 'completed_at', r.completed_at, 'reference', r.tx_ref, 'note', r.failure_reason);
  END LOOP;

  RETURN v_out;
END;
$$;
REVOKE ALL ON FUNCTION public.trace_transaction(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trace_transaction(TEXT) TO authenticated;

-- ── Agent (admin): settle a ticket / dispute ────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_support_ticket(p_ticket_id UUID, p_outcome TEXT, p_note TEXT, p_refund NUMERIC DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent UUID := auth.uid();
  v_t public.support_tickets%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_amt NUMERIC;
  v_ref UUID;
  v_msg TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only IFB support agents can do this' USING ERRCODE = '42501'; END IF;
  IF p_outcome NOT IN ('resolved', 'refunded', 'rejected') THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE = '22023'; END IF;
  IF length(trim(COALESCE(p_note, ''))) < 3 THEN RAISE EXCEPTION 'Add a short explanation for the customer' USING ERRCODE = '22023'; END IF;

  SELECT * INTO v_t FROM public.support_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002'; END IF;
  IF v_t.status IN ('resolved', 'closed') AND v_t.outcome IS NOT NULL THEN RAISE EXCEPTION 'This ticket is already settled' USING ERRCODE = '22023'; END IF;

  IF p_outcome = 'refunded' THEN
    IF v_t.transaction_id IS NULL THEN RAISE EXCEPTION 'A refund needs a linked transaction' USING ERRCODE = '22023'; END IF;
    IF v_t.refund_transaction_id IS NOT NULL THEN RAISE EXCEPTION 'Already refunded' USING ERRCODE = '22023'; END IF;
    SELECT * INTO v_tx FROM public.transactions WHERE id = v_t.transaction_id;
    v_amt := ROUND(COALESCE(p_refund, abs(v_tx.amount)), 2);
    IF v_amt <= 0 OR v_amt > abs(v_tx.amount) THEN
      RAISE EXCEPTION 'Refund must be between $0.01 and the disputed amount ($%)', abs(v_tx.amount) USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.balances (user_id) VALUES (v_t.user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.balances SET liquid_usd = COALESCE(liquid_usd, 0) + v_amt, last_synced = now() WHERE user_id = v_t.user_id;
    INSERT INTO public.transactions (user_id, amount, transaction_type, description, status, metadata, source_type, authorized_by)
    VALUES (v_t.user_id, v_amt, 'dispute_refund', 'Refund for ' || v_t.number, 'completed',
            jsonb_build_object('ticket_id', v_t.id, 'original_transaction_id', v_t.transaction_id, 'agent_id', v_agent), 'support', v_agent::text)
    RETURNING id INTO v_ref;
  END IF;

  UPDATE public.support_tickets
     SET status = 'resolved', outcome = p_outcome, resolution = trim(p_note), refund_amount = v_amt,
         refund_transaction_id = COALESCE(v_ref, refund_transaction_id), resolved_by = v_agent, resolved_at = now(), updated_at = now()
   WHERE id = v_t.id;

  v_msg := CASE p_outcome
    WHEN 'refunded' THEN 'Resolved: we refunded $' || to_char(v_amt, 'FM999999990.00') || ' to your IFB wallet. ' || trim(p_note)
    WHEN 'rejected' THEN 'Reviewed: we could not uphold this dispute. ' || trim(p_note)
    ELSE 'Resolved: ' || trim(p_note) END;
  INSERT INTO public.support_messages (ticket_id, sender_id, sender_type, message) VALUES (v_t.id, v_agent, 'system', v_msg);
  INSERT INTO public.notifications (user_id, type, message, amount, status, metadata)
  VALUES (v_t.user_id, 'support_resolved', v_t.number || ' — ' || left(v_msg, 160), v_amt, 'completed', jsonb_build_object('ticket_id', v_t.id));

  RETURN jsonb_build_object('success', true, 'outcome', p_outcome, 'refund', v_amt, 'refund_transaction_id', v_ref);
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_support_ticket(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_support_ticket(UUID, TEXT, TEXT, NUMERIC) TO authenticated;

-- Live chat: stream new tickets/messages to the app (row-level security still applies).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
    END IF;
  END IF;
END $$;

COMMIT;
