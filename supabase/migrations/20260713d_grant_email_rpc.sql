GRANT EXECUTE ON FUNCTION public.get_confirmed_user_emails(integer) TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
