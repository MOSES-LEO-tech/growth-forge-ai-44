CREATE OR REPLACE FUNCTION app_private.current_user_is_teacher_for_school(p_school_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'teacher'
      AND p.account_status = 'approved'
      AND p.school_id = p_school_id
  );
$$;

DROP POLICY IF EXISTS "profiles_teacher_select_school_students" ON public.profiles;
CREATE POLICY "profiles_teacher_select_school_students" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    role::text = 'student'
    AND account_status = 'approved'
    AND school_id IS NOT NULL
    AND app_private.current_user_is_teacher_for_school(school_id)
  );

GRANT EXECUTE ON FUNCTION app_private.current_user_is_teacher_for_school(UUID) TO authenticated;
