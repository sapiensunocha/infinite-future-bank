-- ============================================================
-- IFB ADMIN BACK OFFICE — Full RPC suite for admin operations
-- Fixes 400 errors, adds admin bypass policies, and exposes
-- all data manipulation RPCs for the AdminDashboard
-- ============================================================

-- 1. Add admin bypass SELECT policies on tables missing them
DO $$ BEGIN
  -- venturex_companies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venturex_companies' AND policyname='admin_read_all_companies') THEN
    CREATE POLICY admin_read_all_companies ON public.venturex_companies FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- support_tickets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets' AND policyname='admin_read_all_tickets') THEN
    CREATE POLICY admin_read_all_tickets ON public.support_tickets FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- p2p_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='p2p_orders' AND policyname='admin_read_all_orders') THEN
    CREATE POLICY admin_read_all_orders ON public.p2p_orders FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- kyc_submissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kyc_submissions' AND policyname='admin_read_all_kyc') THEN
    CREATE POLICY admin_read_all_kyc ON public.kyc_submissions FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin','is_cot_processor')));
  END IF;
  -- venturex_deals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venturex_deals' AND policyname='admin_read_all_deals') THEN
    CREATE POLICY admin_read_all_deals ON public.venturex_deals FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- wallets
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wallets' AND policyname='admin_read_all_wallets') THEN
    CREATE POLICY admin_read_all_wallets ON public.wallets FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- balances
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='balances' AND policyname='admin_read_all_balances') THEN
    CREATE POLICY admin_read_all_balances ON public.balances FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- afr_ledger
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='afr_ledger' AND policyname='admin_read_all_afr') THEN
    CREATE POLICY admin_read_all_afr ON public.afr_ledger FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- venturex_investors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venturex_investors' AND policyname='admin_read_all_investors') THEN
    CREATE POLICY admin_read_all_investors ON public.venturex_investors FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
  -- venturex_milestones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='venturex_milestones' AND policyname='admin_read_all_milestones') THEN
    CREATE POLICY admin_read_all_milestones ON public.venturex_milestones FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
END $$;

-- Drop old get_platform_stats if return type changed
DROP FUNCTION IF EXISTS public.get_platform_stats();

-- Helper: check caller is admin
CREATE OR REPLACE FUNCTION private_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin','is_cot_processor')
  );
$$;

-- 2. admin_get_support_tickets — joins support_tickets with profiles
CREATE OR REPLACE FUNCTION public.admin_get_support_tickets(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id UUID, user_id UUID, status TEXT, subject TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  user_full_name TEXT, user_email TEXT, user_kyc_status TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    st.id, st.user_id, st.status, st.subject, st.created_at, st.updated_at,
    p.full_name, p.email, p.kyc_status
  FROM public.support_tickets st
  LEFT JOIN public.profiles p ON p.id = st.user_id
  ORDER BY st.created_at DESC
  LIMIT p_limit;
$$;

-- 3. admin_get_venturex — all companies with owner info
CREATE OR REPLACE FUNCTION public.admin_get_venturex(p_limit INT DEFAULT 100, p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, legal_name TEXT, sector TEXT, country TEXT, status TEXT,
  product_stage TEXT, funding_goal NUMERIC, investment_readiness_score NUMERIC,
  risk_score NUMERIC, valuation NUMERIC, total_raised NUMERIC, current_round TEXT,
  financial_verified BOOLEAN, identity_verified BOOLEAN, traction_verified BOOLEAN,
  is_public BOOLEAN, created_at TIMESTAMPTZ, pitch_deck_url TEXT,
  financial_statements_url TEXT, legal_docs_url TEXT,
  user_full_name TEXT, user_email TEXT, user_kyc_status TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    vc.id, vc.user_id, vc.legal_name, vc.sector, vc.country, vc.status,
    vc.product_stage, vc.funding_goal, vc.investment_readiness_score,
    vc.risk_score, vc.valuation, vc.total_raised, vc.current_round,
    vc.financial_verified, vc.identity_verified, vc.traction_verified,
    vc.is_public, vc.created_at, vc.pitch_deck_url,
    vc.financial_statements_url, vc.legal_docs_url,
    p.full_name, p.email, p.kyc_status
  FROM public.venturex_companies vc
  LEFT JOIN public.profiles p ON p.id = vc.user_id
  WHERE (p_status IS NULL OR vc.status = p_status)
  ORDER BY vc.created_at DESC
  LIMIT p_limit;
$$;

-- 4. admin_get_all_transactions — unified transaction feed
CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(p_limit INT DEFAULT 200, p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  tx_id TEXT, source TEXT, user_id UUID, user_email TEXT, user_name TEXT,
  tx_type TEXT, amount NUMERIC, currency TEXT, status TEXT, created_at TIMESTAMPTZ, notes TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  -- P2P Orders
  SELECT
    po.id::TEXT, 'p2p_order'::TEXT, po.user_id,
    p.email, p.full_name,
    po.order_type, po.amount_usd, 'USD'::TEXT,
    po.status, po.created_at, po.payment_method::TEXT
  FROM public.p2p_orders po
  LEFT JOIN public.profiles p ON p.id = po.user_id
  WHERE (p_user_id IS NULL OR po.user_id = p_user_id)

  UNION ALL

  -- AFR Ledger
  SELECT
    al.id::TEXT, 'afr_ledger'::TEXT, al.user_id,
    p.email, p.full_name,
    al.tx_type, al.usd_equivalent, 'AFR'::TEXT,
    al.status, al.created_at, al.notes
  FROM public.afr_ledger al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE (p_user_id IS NULL OR al.user_id = p_user_id)

  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- 5. admin_get_kyc_submissions — all KYC with documents
CREATE OR REPLACE FUNCTION public.admin_get_kyc_submissions(p_limit INT DEFAULT 100, p_status TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID, user_id UUID, status TEXT, risk_rating TEXT,
  legal_full_name TEXT, nationality TEXT, id_type TEXT, id_number TEXT,
  email_primary TEXT, phone_primary TEXT, residential_country TEXT,
  employment_status TEXT, monthly_income_usd NUMERIC, source_of_funds TEXT,
  politically_exposed_person BOOLEAN, fatca_applicable BOOLEAN,
  ai_confidence_score NUMERIC, ai_recommendation TEXT, ai_flags TEXT[],
  id_front_url TEXT, id_back_url TEXT, selfie_url TEXT, selfie_with_id_url TEXT,
  proof_of_address_url TEXT, proof_of_income_url TEXT, bank_statement_url TEXT,
  certificate_of_incorporation_url TEXT, board_resolution_url TEXT,
  is_corporate BOOLEAN, company_legal_name TEXT,
  submitted_at TIMESTAMPTZ, reviewed_at TIMESTAMPTZ, reviewer_notes TEXT,
  user_full_name TEXT, user_email TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    k.id, k.user_id, k.status, k.risk_rating,
    k.legal_full_name, k.nationality, k.id_type, k.id_number,
    k.email_primary, k.phone_primary, k.residential_country,
    k.employment_status, k.monthly_income_usd, k.source_of_funds,
    k.politically_exposed_person, k.fatca_applicable,
    k.ai_confidence_score, k.ai_recommendation, k.ai_flags,
    k.id_front_url, k.id_back_url, k.selfie_url, k.selfie_with_id_url,
    k.proof_of_address_url, k.proof_of_income_url, k.bank_statement_url,
    k.certificate_of_incorporation_url, k.board_resolution_url,
    k.is_corporate, k.company_legal_name,
    k.submitted_at, k.reviewed_at, k.reviewer_notes,
    p.full_name, p.email
  FROM public.kyc_submissions k
  LEFT JOIN public.profiles p ON p.id = k.user_id
  WHERE (p_status IS NULL OR k.status = p_status)
  ORDER BY k.submitted_at DESC NULLS LAST, k.reviewed_at DESC NULLS LAST
  LIMIT p_limit;
$$;

-- 6. admin_update_venturex_company — approve/reject/verify companies
CREATE OR REPLACE FUNCTION public.admin_update_venturex_company(
  p_company_id UUID,
  p_status TEXT DEFAULT NULL,
  p_financial_verified BOOLEAN DEFAULT NULL,
  p_identity_verified BOOLEAN DEFAULT NULL,
  p_traction_verified BOOLEAN DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT NULL,
  p_investment_readiness_score NUMERIC DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT private_is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE public.venturex_companies SET
    status = COALESCE(p_status, status),
    financial_verified = COALESCE(p_financial_verified, financial_verified),
    identity_verified = COALESCE(p_identity_verified, identity_verified),
    traction_verified = COALESCE(p_traction_verified, traction_verified),
    is_public = COALESCE(p_is_public, is_public),
    investment_readiness_score = COALESCE(p_investment_readiness_score, investment_readiness_score),
    updated_at = NOW()
  WHERE id = p_company_id;
END;
$$;

-- 7. admin_create_venturex_company — create a company on behalf of a user
CREATE OR REPLACE FUNCTION public.admin_create_venturex_company(
  p_user_id UUID,
  p_legal_name TEXT,
  p_sector TEXT,
  p_country TEXT,
  p_product_stage TEXT DEFAULT 'idea',
  p_funding_goal NUMERIC DEFAULT 0,
  p_current_round TEXT DEFAULT 'pre-seed',
  p_status TEXT DEFAULT 'draft'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT private_is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  INSERT INTO public.venturex_companies (user_id, legal_name, sector, country, product_stage, funding_goal, current_round, status, is_public, created_at, updated_at)
  VALUES (p_user_id, p_legal_name, p_sector, p_country, p_product_stage, p_funding_goal, p_current_round, p_status, false, NOW(), NOW())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 8. admin_update_any_profile — edit any user profile field
CREATE OR REPLACE FUNCTION public.admin_update_any_profile(
  p_user_id UUID,
  p_updates JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key TEXT; v_val TEXT;
BEGIN
  IF NOT private_is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  -- Safe field whitelist
  FOR v_key, v_val IN SELECT key, value #>> '{}' FROM jsonb_each(p_updates) LOOP
    IF v_key IN (
      'full_name','full_legal_name','phone','dob','country','residential_address',
      'kyc_status','role','employer','source_of_revenue','transaction_methods',
      'aml_terms_agreed','is_active','cot_status','docs_signed','mfa_enabled',
      'email','avatar_url','bio','occupation'
    ) THEN
      EXECUTE format('UPDATE public.profiles SET %I = $1 WHERE id = $2', v_key)
        USING v_val, p_user_id;
    END IF;
  END LOOP;
END;
$$;

-- 9. admin_get_user_full — full profile + balances + KYC summary for one user
CREATE OR REPLACE FUNCTION public.admin_get_user_full(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_profile JSONB; v_kyc JSONB; v_balances JSONB; v_wallet JSONB;
BEGIN
  IF NOT private_is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE id = p_user_id;
  SELECT to_jsonb(k) INTO v_kyc FROM public.kyc_submissions k WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;
  SELECT jsonb_agg(to_jsonb(b)) INTO v_balances FROM public.balances b WHERE user_id = p_user_id;
  SELECT jsonb_agg(to_jsonb(w)) INTO v_wallet FROM public.wallets w WHERE user_id = p_user_id;
  RETURN jsonb_build_object(
    'profile', v_profile,
    'kyc', v_kyc,
    'balances', v_balances,
    'wallets', v_wallet
  );
END;
$$;

-- 10. admin_get_platform_stats — extended stats for overview
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users',       (SELECT COUNT(*) FROM public.profiles),
    'verified_users',    (SELECT COUNT(*) FROM public.profiles WHERE kyc_status IN ('verified','approved')),
    'pending_kyc',       (SELECT COUNT(*) FROM public.kyc_submissions WHERE status IN ('pending','p2p_review','ai_reviewing')),
    'total_p2p_volume',  (SELECT COALESCE(SUM(amount_usd),0) FROM public.p2p_orders WHERE status='completed'),
    'open_tickets',      (SELECT COUNT(*) FROM public.support_tickets WHERE status='open'),
    'venturex_companies',(SELECT COUNT(*) FROM public.venturex_companies),
    'active_companies',  (SELECT COUNT(*) FROM public.venturex_companies WHERE status='active'),
    'total_afr_tx',      (SELECT COUNT(*) FROM public.afr_ledger),
    'total_afr_volume',  (SELECT COALESCE(SUM(usd_equivalent),0) FROM public.afr_ledger WHERE status='confirmed')
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- 11. admin_reply_ticket — send reply to support ticket
CREATE OR REPLACE FUNCTION public.admin_reply_ticket(
  p_ticket_id UUID,
  p_message TEXT,
  p_close BOOLEAN DEFAULT FALSE
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
BEGIN
  IF NOT private_is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT user_id INTO v_user_id FROM public.support_tickets WHERE id = p_ticket_id;
  IF p_close THEN
    UPDATE public.support_tickets SET status='closed', updated_at=NOW() WHERE id=p_ticket_id;
  END IF;
  INSERT INTO public.notifications(user_id, type, read, status, message)
  VALUES (v_user_id, 'support', false, 'completed', 'Support reply: ' || p_message);
END;
$$;

-- Grant all admin RPCs to authenticated
GRANT EXECUTE ON FUNCTION public.admin_get_support_tickets(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_venturex(INT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_transactions(INT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_kyc_submissions(INT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_venturex_company(UUID,TEXT,BOOLEAN,BOOLEAN,BOOLEAN,BOOLEAN,NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_venturex_company(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_any_profile(UUID,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_full(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_ticket(UUID,TEXT,BOOLEAN) TO authenticated;
