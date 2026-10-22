-- ============================================================
-- IFB KYC COMPLIANCE EXPANSION — Full regulatory coverage
-- Adds missing FATCA/CRS, dual nationality, corporate KYC,
-- ongoing review schedule, and the admin_update_kyc RPC
-- ============================================================

-- 1. Add missing compliance columns to kyc_submissions
ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS dual_nationality            BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS second_nationality          TEXT,
  ADD COLUMN IF NOT EXISTS tax_residency_countries     TEXT[]         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fatca_applicable            BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crs_applicable              BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tin_per_country             JSONB          DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS previous_address_1          TEXT,
  ADD COLUMN IF NOT EXISTS previous_address_2          TEXT,
  ADD COLUMN IF NOT EXISTS years_at_previous_address_1 INTEGER,
  ADD COLUMN IF NOT EXISTS years_at_previous_address_2 INTEGER,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone     TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT,
  -- Corporate KYC
  ADD COLUMN IF NOT EXISTS is_corporate                BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS company_legal_name          TEXT,
  ADD COLUMN IF NOT EXISTS company_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS company_registration_country TEXT,
  ADD COLUMN IF NOT EXISTS company_type                TEXT,
  ADD COLUMN IF NOT EXISTS articles_of_association_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_of_incorporation_url TEXT,
  ADD COLUMN IF NOT EXISTS board_resolution_url        TEXT,
  ADD COLUMN IF NOT EXISTS ubo_ownership_percentage    NUMERIC,
  ADD COLUMN IF NOT EXISTS ubo_full_name               TEXT,
  ADD COLUMN IF NOT EXISTS ubo_nationality             TEXT,
  ADD COLUMN IF NOT EXISTS ubo_id_document_url         TEXT,
  ADD COLUMN IF NOT EXISTS share_registry_url          TEXT,
  -- Biometric
  ADD COLUMN IF NOT EXISTS nfc_chip_scanned            BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_verification_url      TEXT,
  ADD COLUMN IF NOT EXISTS video_verification_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fingerprint_captured        BOOLEAN        DEFAULT FALSE,
  -- Regulatory classification
  ADD COLUMN IF NOT EXISTS regulatory_category         TEXT           CHECK (regulatory_category IN ('retail','professional','institutional')),
  ADD COLUMN IF NOT EXISTS investor_classification     TEXT           CHECK (investor_classification IN ('retail','accredited','qualified')),
  ADD COLUMN IF NOT EXISTS fatca_w8ben_completed       BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fatca_w9_completed          BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS crs_self_certification_date DATE,
  ADD COLUMN IF NOT EXISTS crs_self_certification_url  TEXT,
  -- Watchlist / sanctions
  ADD COLUMN IF NOT EXISTS interpol_check_clear        BOOLEAN,
  ADD COLUMN IF NOT EXISTS fatf_blacklist_clear         BOOLEAN,
  ADD COLUMN IF NOT EXISTS watchlist_checked_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS watchlist_provider          TEXT,
  -- Ongoing review
  ADD COLUMN IF NOT EXISTS next_review_date            DATE,
  ADD COLUMN IF NOT EXISTS review_trigger              TEXT,
  ADD COLUMN IF NOT EXISTS last_review_date            DATE,
  -- Investor profile
  ADD COLUMN IF NOT EXISTS investment_experience       TEXT           CHECK (investment_experience IN ('none','beginner','intermediate','expert')),
  ADD COLUMN IF NOT EXISTS risk_appetite               TEXT           CHECK (risk_appetite IN ('conservative','moderate','aggressive')),
  ADD COLUMN IF NOT EXISTS investment_horizon          TEXT           CHECK (investment_horizon IN ('short','medium','long')),
  -- Additional documents
  ADD COLUMN IF NOT EXISTS income_tax_return_url       TEXT,
  ADD COLUMN IF NOT EXISTS company_financials_url      TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_funds_url          TEXT;

-- 2. KYC review schedule for ongoing / periodic re-screening
CREATE TABLE IF NOT EXISTS public.kyc_review_schedule (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_level      TEXT          NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  last_reviewed_at TIMESTAMPTZ,
  next_review_due  DATE         NOT NULL,
  review_trigger  TEXT,
  auto_flagged    BOOLEAN       DEFAULT FALSE,
  completed       BOOLEAN       DEFAULT FALSE,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.kyc_review_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_review_schedule' AND policyname = 'kyc_schedule_admin') THEN
    CREATE POLICY kyc_schedule_admin ON public.kyc_review_schedule
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')));
  END IF;
END $$;

-- 3. admin_update_kyc RPC — fixes the broken approve/reject in AdminDashboard
CREATE OR REPLACE FUNCTION public.admin_update_kyc(
  p_user_id  UUID,
  p_status   TEXT,
  p_notes    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_status TEXT;
  v_risk           TEXT;
  v_review_days    INTEGER;
BEGIN
  -- Access check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin','is_cot_processor')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Map submission status → profile kyc_status
  v_profile_status := CASE p_status
    WHEN 'approved'        THEN 'approved'
    WHEN 'rejected'        THEN 'rejected'
    WHEN 'needs_more_info' THEN 'pending_kyc'
    ELSE NULL
  END;

  -- Update kyc_submissions
  UPDATE public.kyc_submissions
  SET
    status           = p_status,
    reviewer_id      = auth.uid(),
    reviewer_notes   = COALESCE(p_notes, reviewer_notes),
    reviewed_at      = NOW(),
    updated_at       = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_notes ELSE rejection_reason END,
    last_review_date = CURRENT_DATE,
    -- Set next review date based on risk
    next_review_date = CASE
      WHEN p_status = 'approved' THEN
        CURRENT_DATE + INTERVAL '1 year' * CASE
          WHEN risk_rating = 'low'      THEN 3
          WHEN risk_rating = 'medium'   THEN 2
          WHEN risk_rating = 'high'     THEN 1
          WHEN risk_rating = 'critical' THEN 0.5
          ELSE 2
        END
      ELSE NULL
    END
  WHERE user_id = p_user_id;

  -- Update profiles
  IF v_profile_status IS NOT NULL THEN
    UPDATE public.profiles
    SET kyc_status = v_profile_status
    WHERE id = p_user_id;
  END IF;

  -- Schedule ongoing review
  IF p_status = 'approved' THEN
    SELECT risk_rating INTO v_risk FROM public.kyc_submissions WHERE user_id = p_user_id;
    v_review_days := CASE v_risk
      WHEN 'low'      THEN 1095  -- 3 years
      WHEN 'medium'   THEN 730   -- 2 years
      WHEN 'high'     THEN 365   -- 1 year
      WHEN 'critical' THEN 183   -- 6 months
      ELSE 730
    END;

    INSERT INTO public.kyc_review_schedule (user_id, risk_level, last_reviewed_at, next_review_due, review_trigger)
    VALUES (p_user_id, COALESCE(v_risk, 'medium'), NOW(), CURRENT_DATE + v_review_days, 'initial_approval')
    ON CONFLICT (user_id) DO UPDATE
      SET last_reviewed_at = NOW(),
          next_review_due   = CURRENT_DATE + v_review_days,
          completed         = FALSE,
          updated_at        = NOW();
  END IF;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, read, status, message)
  VALUES (
    p_user_id, 'system', false, 'completed',
    CASE p_status
      WHEN 'approved'        THEN 'KYC Approved — Your identity has been verified. You now have full access to IFB services.'
      WHEN 'rejected'        THEN 'KYC Rejected — ' || COALESCE(p_notes, 'Please resubmit with clearer documents.')
      WHEN 'needs_more_info' THEN 'KYC Update Required — ' || COALESCE(p_notes, 'Additional information needed.')
      ELSE 'Your KYC status has been updated.'
    END
  );
END;
$$;

-- Handle unique constraint for kyc_review_schedule
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kyc_review_schedule_user_id_key'
  ) THEN
    ALTER TABLE public.kyc_review_schedule ADD CONSTRAINT kyc_review_schedule_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Grant execute to authenticated users (SECURITY DEFINER handles the admin check internally)
GRANT EXECUTE ON FUNCTION public.admin_update_kyc(UUID, TEXT, TEXT) TO authenticated;
