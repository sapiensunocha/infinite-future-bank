-- Ensure admin_roles table exists
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Allow users to read their own admin_roles row
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_roles' AND policyname = 'admin_roles_read_own'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY admin_roles_read_own ON public.admin_roles
        FOR SELECT
        USING (user_id = auth.uid())
    $pol$;
  END IF;

  -- Allow admins to manage all rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_roles' AND policyname = 'super_admin_manage_roles'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY super_admin_manage_roles ON public.admin_roles
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin','admin_l3','superadmin')
          )
        )
    $pol$;
  END IF;
END $$;

-- Grant super admin to sapiens@xeltis.org
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'sapiens@xeltis.org'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User sapiens@xeltis.org not found in auth.users';
  END IF;

  -- Set superadmin on profiles
  UPDATE public.profiles
  SET role = 'superadmin'
  WHERE id = v_user_id;

  -- Upsert into admin_roles with full super role
  INSERT INTO public.admin_roles (user_id, role, permissions, is_active, granted_by)
  VALUES (v_user_id, 'super', '{"all": true}'::jsonb, true, v_user_id)
  ON CONFLICT (user_id)
  DO UPDATE SET
    role        = 'super',
    permissions = '{"all": true}'::jsonb,
    is_active   = true;

  RAISE NOTICE 'superadmin granted to sapiens@xeltis.org (id: %)', v_user_id;
END $$;
