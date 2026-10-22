-- Auto-trigger ARIA (kyc-ai-reviewer) whenever a KYC submission
-- is inserted or transitions to 'pending' status.
-- Uses pg_net so the edge function runs async — the user's request
-- returns immediately while ARIA reviews in the background.

-- pg_net is enabled by default on Supabase hosted projects.
-- The trigger fires on INSERT (new submission) or UPDATE where
-- the status changes to 'pending' (re-submission after needs_more_info).

CREATE OR REPLACE FUNCTION public.trigger_kyc_ai_reviewer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url  TEXT;
  v_key  TEXT;
BEGIN
  -- Only fire when status becomes 'pending' (initial submit or re-submit)
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Skip if we already have a confident AI decision for this exact data
  IF OLD IS NOT NULL
     AND OLD.status = 'pending'
     AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/kyc-ai-reviewer';
  v_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('user_id', NEW.user_id::text)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kyc_ai_reviewer_trigger ON public.kyc_submissions;
CREATE TRIGGER kyc_ai_reviewer_trigger
  AFTER INSERT OR UPDATE OF status
  ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_kyc_ai_reviewer();
