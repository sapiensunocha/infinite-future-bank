-- Fix 1: admin_update_kyc — add admin_roles table check so admins stored in
-- admin_roles (but not via profiles.role) can approve/reject/request-info.
-- Previously only checked profiles.role, blocking admin_roles-only staff.

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
  -- Check profiles.role OR admin_roles table (matches admin_set_kyc_status)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'admin_l3', 'superadmin', 'is_cot_processor')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Map submission status → profile kyc_status
  v_profile_status := CASE p_status
    WHEN 'approved'        THEN 'approved'
    WHEN 'rejected'        THEN 'rejected'
    WHEN 'needs_more_info' THEN 'needs_more_info'
    ELSE NULL
  END;

  UPDATE public.kyc_submissions
  SET
    status           = p_status,
    reviewer_id      = auth.uid(),
    reviewer_notes   = COALESCE(p_notes, reviewer_notes),
    reviewed_at      = NOW(),
    updated_at       = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_notes ELSE rejection_reason END,
    last_review_date = CURRENT_DATE,
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

  IF v_profile_status IS NOT NULL THEN
    UPDATE public.profiles
    SET kyc_status = v_profile_status
    WHERE id = p_user_id;
  END IF;

  IF p_status = 'approved' THEN
    SELECT risk_rating INTO v_risk FROM public.kyc_submissions WHERE user_id = p_user_id;
    v_review_days := CASE v_risk
      WHEN 'low'      THEN 1095
      WHEN 'medium'   THEN 730
      WHEN 'high'     THEN 365
      WHEN 'critical' THEN 183
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

GRANT EXECUTE ON FUNCTION public.admin_update_kyc(UUID, TEXT, TEXT) TO authenticated;


-- Fix 2: admin_reset_stuck_kyc() — resets submissions stuck at 'ai_reviewing'
-- (ARIA never ran because the trigger URL was NULL before migration 20260833).
-- Resets status → 'pending' which re-fires the pg_net trigger and re-runs ARIA.
-- Only touches rows idle for > 30 minutes to avoid interrupting active reviews.
-- Returns the number of rows reset.

CREATE OR REPLACE FUNCTION public.admin_reset_stuck_kyc()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'admin_l3', 'superadmin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid() AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.kyc_submissions
  SET status = 'pending', updated_at = NOW()
  WHERE status = 'ai_reviewing'
    AND updated_at < NOW() - INTERVAL '30 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_stuck_kyc() TO authenticated;
