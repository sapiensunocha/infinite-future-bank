-- Fix: trigger_kyc_ai_reviewer was calling net.http_post with NULL url
-- because app.settings.supabase_url was never set in the live DB.
-- net.http_post(url := NULL) raises a NOT NULL constraint error which
-- silently rolls back the `UPDATE kyc_submissions SET status='pending'`
-- so ARIA never ran on any resubmission.
--
-- Fix: hardcode the project URL (non-sensitive — it's public).
-- kyc-ai-reviewer already has verify_jwt=false so no bearer token needed.

CREATE OR REPLACE FUNCTION public.trigger_kyc_ai_reviewer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only fire when status becomes 'pending' (initial submit or re-submit)
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Skip no-op updates (status was already pending)
  IF OLD IS NOT NULL
     AND OLD.status = 'pending'
     AND NEW.status = 'pending' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://nfztdpyygfrpbjbhidxe.supabase.co/functions/v1/kyc-ai-reviewer',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('user_id', NEW.user_id::text)
  );

  RETURN NEW;
END;
$$;
