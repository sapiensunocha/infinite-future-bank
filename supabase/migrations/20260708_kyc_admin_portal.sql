-- ============================================================
-- KYC Admin Portal — Full Schema
-- ============================================================

-- pgcrypto for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Admin passcodes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_admin_passcodes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  name         text NOT NULL,
  passcode_hash text NOT NULL,          -- bcrypt hash
  is_active    boolean DEFAULT true,
  expires_at   timestamptz,             -- null = never
  created_at   timestamptz DEFAULT now()
);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_projects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Founder
  founder_email        text NOT NULL,
  founder_name         text NOT NULL,
  founder_phone        text,
  founder_country      text,
  founder_resume_text  text,
  -- Project
  project_type         text NOT NULL CHECK (project_type IN ('project','company')),
  sector               text NOT NULL,
  business_description text NOT NULL,
  revenue_model        text,
  team_size            int,
  stage                text NOT NULL CHECK (stage IN ('idea','mvp','growth','scaling')),
  website              text,
  timeline             text,
  -- Financing
  financing_types      text[]  DEFAULT '{}',
  financing_other      text,
  funding_amount_needed numeric,
  funding_currency     text    DEFAULT 'USD',
  -- Status & pipeline
  status               text    DEFAULT 'registered'
                        CHECK (status IN ('registered','payment_pending','active','in_pipeline','archived')),
  venturex_stage       text
                        CHECK (venturex_stage IN ('intake','evaluation','structuring','financing','execution')),
  -- Links
  user_id              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Meta
  registered_by        text NOT NULL,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- ── Documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_project_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES kyc_projects(id) ON DELETE CASCADE,
  doc_type    text NOT NULL CHECK (doc_type IN ('resume','business_plan','legal','passport','other')),
  file_url    text NOT NULL,
  file_name   text NOT NULL,
  file_size   bigint,
  uploaded_by text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_project_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES kyc_projects(id) ON DELETE CASCADE,
  amount         numeric NOT NULL,
  currency       text    DEFAULT 'USD',
  tier           text    NOT NULL CHECK (tier IN ('startup','sme','corporate','enterprise')),
  payment_method text    NOT NULL CHECK (payment_method IN ('deus','stripe','offline','bank_transfer')),
  payment_status text    DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','completed','failed','refunded')),
  reference      text,
  notes          text,
  paid_at        timestamptz,
  recorded_by    text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

-- ── Audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_admin_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email   text NOT NULL,
  action        text NOT NULL,
  resource_type text,
  resource_id   text,
  details       jsonb DEFAULT '{}',
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE kyc_admin_passcodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_admin_audit      ENABLE ROW LEVEL SECURITY;

-- No direct client access; all via edge functions (service role)
CREATE POLICY "kyc_passcodes_deny_all"  ON kyc_admin_passcodes  FOR ALL USING (false);
CREATE POLICY "kyc_payments_deny_all"   ON kyc_project_payments FOR ALL USING (false);
CREATE POLICY "kyc_audit_deny_all"      ON kyc_admin_audit      FOR ALL USING (false);
-- Users can read their own project & docs
CREATE POLICY "kyc_projects_own"  ON kyc_projects          FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "kyc_docs_own"      ON kyc_project_documents FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM kyc_projects WHERE user_id = auth.uid()));

-- ── auto updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION kyc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER kyc_project_updated_at
  BEFORE UPDATE ON kyc_projects
  FOR EACH ROW EXECUTE FUNCTION kyc_set_updated_at();

-- ── RPC: validate admin passcode (bcrypt) ────────────────────
CREATE OR REPLACE FUNCTION validate_kyc_admin(p_email text, p_passcode text)
RETURNS TABLE (admin_email text, admin_name text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT kap.email, kap.name
  FROM kyc_admin_passcodes kap
  WHERE kap.email = lower(trim(p_email))
    AND kap.is_active = true
    AND (kap.expires_at IS NULL OR kap.expires_at > now())
    AND crypt(p_passcode, kap.passcode_hash) = kap.passcode_hash;
END; $$;

-- ── Seed initial admin ────────────────────────────────────────
-- Default passcode: IFB-KYC-2026  (change via SQL after deploy)
INSERT INTO kyc_admin_passcodes (email, name, passcode_hash)
VALUES (
  'sapiens@infinitefuturebank.org',
  'Sapiens Admin',
  crypt('IFB-KYC-2026', gen_salt('bf', 10))
) ON CONFLICT (email) DO NOTHING;
