-- Secure RPC for broadcast emails — SECURITY DEFINER bypasses RLS to read auth.users
CREATE OR REPLACE FUNCTION public.get_confirmed_user_emails()
RETURNS TABLE(id UUID, email TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email, COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', '') AS full_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND u.deleted_at IS NULL;
$$;
