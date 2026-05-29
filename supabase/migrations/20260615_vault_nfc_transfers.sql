-- IFB: Vault soft-transfer RPC + NFC transfer system

-- ── 1. VAULT SOFT TRANSFER ─────────────────────────────────────────────────────
-- Moves funds between liquid_usd and mysafe_digital_usd within same user account

CREATE OR REPLACE FUNCTION public.vault_transfer(
  p_amount    NUMERIC,
  p_direction TEXT  -- 'to_vault' | 'from_vault'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID    := auth.uid();
  v_liquid  NUMERIC;
  v_vault   NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT liquid_usd, mysafe_digital_usd
  INTO   v_liquid, v_vault
  FROM   balances
  WHERE  user_id = v_user_id;

  IF p_direction = 'to_vault' THEN
    IF COALESCE(v_liquid, 0) < p_amount THEN
      RAISE EXCEPTION 'Insufficient liquid balance. Available: $%.', COALESCE(v_liquid, 0);
    END IF;
    UPDATE balances SET
      liquid_usd         = liquid_usd         - p_amount,
      mysafe_digital_usd = mysafe_digital_usd + p_amount
    WHERE user_id = v_user_id;
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_user_id, 'vault_lock', -p_amount, 'Locked to IFB Vault', 'completed');

  ELSIF p_direction = 'from_vault' THEN
    IF COALESCE(v_vault, 0) < p_amount THEN
      RAISE EXCEPTION 'Insufficient vault balance. Available: $%.', COALESCE(v_vault, 0);
    END IF;
    UPDATE balances SET
      mysafe_digital_usd = mysafe_digital_usd - p_amount,
      liquid_usd         = liquid_usd         + p_amount
    WHERE user_id = v_user_id;
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (v_user_id, 'vault_unlock', p_amount, 'Unlocked from IFB Vault', 'completed');

  ELSE
    RAISE EXCEPTION 'Invalid direction. Use to_vault or from_vault.';
  END IF;

  -- Return refreshed balances
  SELECT liquid_usd, mysafe_digital_usd
  INTO   v_liquid, v_vault
  FROM   balances
  WHERE  user_id = v_user_id;

  RETURN json_build_object(
    'ok',        TRUE,
    'direction', p_direction,
    'amount',    p_amount,
    'liquid',    v_liquid,
    'vault',     v_vault
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vault_transfer TO authenticated;


-- ── 2. NFC / TAP TRANSFER REQUESTS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nfc_transfer_requests (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID        REFERENCES auth.users(id),
  amount      NUMERIC(12,2) NOT NULL,
  token       TEXT        UNIQUE NOT NULL,
  note        TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','completed','expired','cancelled')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

ALTER TABLE public.nfc_transfer_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "nfc_sender_read" ON public.nfc_transfer_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "nfc_insert" ON public.nfc_transfer_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_nfc_token    ON public.nfc_transfer_requests(token);
CREATE INDEX IF NOT EXISTS idx_nfc_sender   ON public.nfc_transfer_requests(sender_id);


-- ── 3. CREATE NFC TRANSFER REQUEST ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_nfc_transfer(
  p_amount NUMERIC,
  p_note   TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID    := auth.uid();
  v_liquid    NUMERIC;
  v_token     TEXT;
  v_req_id    UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT liquid_usd INTO v_liquid FROM balances WHERE user_id = v_user_id;
  IF COALESCE(v_liquid, 0) < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: $%.', COALESCE(v_liquid, 0);
  END IF;

  -- 8-char uppercase token (human-readable)
  v_token := upper(replace(gen_random_uuid()::text, '-', ''));
  v_token := substring(v_token, 1, 6);

  INSERT INTO nfc_transfer_requests (sender_id, amount, token, note)
  VALUES (v_user_id, p_amount, v_token, p_note)
  RETURNING id INTO v_req_id;

  RETURN json_build_object(
    'ok',         TRUE,
    'token',      v_token,
    'request_id', v_req_id,
    'amount',     p_amount,
    'expires_in', 600
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_nfc_transfer TO authenticated;


-- ── 4. CLAIM NFC TRANSFER (receiver calls this) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_nfc_transfer(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_id UUID := auth.uid();
  v_req         nfc_transfer_requests%ROWTYPE;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO v_req
  FROM   nfc_transfer_requests
  WHERE  token      = upper(trim(p_token))
    AND  status     = 'pending'
    AND  expires_at > NOW();

  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Transfer code not found or expired. Check the code and try again.';
  END IF;

  IF v_req.sender_id = v_receiver_id THEN
    RAISE EXCEPTION 'You cannot claim your own transfer.';
  END IF;

  -- Debit sender
  UPDATE balances SET liquid_usd = liquid_usd - v_req.amount WHERE user_id = v_req.sender_id;
  -- Credit receiver
  UPDATE balances SET liquid_usd = liquid_usd + v_req.amount WHERE user_id = v_receiver_id;

  -- Log both sides
  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES
    (v_req.sender_id,  'nfc_send',    -v_req.amount, 'NFC Tap Transfer — sent',     'completed'),
    (v_receiver_id,    'nfc_receive',  v_req.amount, 'NFC Tap Transfer — received', 'completed');

  -- Mark request complete
  UPDATE nfc_transfer_requests
  SET    status = 'completed', receiver_id = v_receiver_id
  WHERE  id = v_req.id;

  -- Get sender name for receipt
  SELECT COALESCE(full_name, 'IFB Member') INTO v_sender_name
  FROM   profiles WHERE id = v_req.sender_id;

  RETURN json_build_object(
    'ok',          TRUE,
    'amount',      v_req.amount,
    'sender_id',   v_req.sender_id,
    'sender_name', v_sender_name,
    'note',        v_req.note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_nfc_transfer TO authenticated;


-- ── 5. CONTACTS / RECIPIENTS TABLE ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname      TEXT,
  added_via     TEXT DEFAULT 'nfc',  -- 'nfc' | 'search' | 'qr'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, contact_id)
);

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "contacts_own" ON public.user_contacts
    FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON public.user_contacts(owner_id);


-- ── 6. ADD CONTACT RPC ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_contact(
  p_contact_id UUID,
  p_nickname   TEXT DEFAULT NULL,
  p_via        TEXT DEFAULT 'nfc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id   UUID := auth.uid();
  v_name       TEXT;
BEGIN
  IF v_owner_id = p_contact_id THEN
    RAISE EXCEPTION 'Cannot add yourself as a contact';
  END IF;

  SELECT COALESCE(p_nickname, full_name, 'IFB Member') INTO v_name
  FROM   profiles WHERE id = p_contact_id;

  INSERT INTO user_contacts (owner_id, contact_id, nickname, added_via)
  VALUES (v_owner_id, p_contact_id, v_name, p_via)
  ON CONFLICT (owner_id, contact_id) DO UPDATE SET nickname = EXCLUDED.nickname;

  RETURN json_build_object('ok', TRUE, 'contact_name', v_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_contact TO authenticated;
