-- W5: Fix admin "Send to AI Review" — previously only set profiles.kyc_status = 'ai_reviewing'
-- but never updated kyc_submissions.status, so the pg_net trigger never fired ARIA.
-- Fix: when status = 'ai_reviewing', also set kyc_submissions.status = 'pending'
-- which fires the trigger_kyc_ai_reviewer pg_net trigger.

CREATE OR REPLACE FUNCTION public.admin_set_kyc_status(
  p_user_id UUID,
  p_status  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  IF p_status NOT IN ('verified','approved','unverified','pending','pending_kyc','rejected','needs_more_info','ai_reviewing','suspended') THEN
    RAISE EXCEPTION 'Invalid kyc_status: %', p_status;
  END IF;

  UPDATE public.profiles
  SET kyc_status = p_status
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- When admin sends to AI review, also update kyc_submissions.status = 'pending'
  -- so the pg_net trigger fires kyc-ai-reviewer (ARIA) automatically.
  IF p_status = 'ai_reviewing' THEN
    UPDATE public.kyc_submissions
    SET status = 'pending', updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_kyc_status(UUID, TEXT) TO authenticated;
