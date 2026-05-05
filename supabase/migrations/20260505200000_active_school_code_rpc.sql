CREATE OR REPLACE FUNCTION public.get_active_school_join_code(p_school_id UUID)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  code TEXT,
  created_by UUID,
  is_active BOOLEAN,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF NOT (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(p_school_id)
    OR app_private.current_user_is_teacher_for_school(p_school_id)
  ) THEN
    RAISE EXCEPTION 'Only approved school staff can view this school code.';
  END IF;

  RETURN QUERY
  SELECT
    code_row.id,
    code_row.school_id,
    code_row.code,
    code_row.created_by,
    code_row.is_active,
    code_row.expires_at,
    code_row.created_at,
    code_row.updated_at
  FROM public.school_join_codes code_row
  WHERE code_row.school_id = p_school_id
    AND code_row.is_active IS TRUE
    AND (code_row.expires_at IS NULL OR code_row.expires_at > now())
  ORDER BY code_row.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_school_join_code(UUID) TO authenticated;
