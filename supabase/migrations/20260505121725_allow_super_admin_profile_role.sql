-- Allow the app's highest role through legacy text-based profile constraints.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role::text = ANY (ARRAY['student', 'parent', 'teacher', 'admin', 'super_admin']));
  END IF;
END $$;
