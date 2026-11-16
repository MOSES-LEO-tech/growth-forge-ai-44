-- ============================================================================
-- Phase 3: Student Management Module (profiles + enrollment)
-- Plan: school-admin-platform-enhancement.md §7
--
-- * enrollment_status enum + enrollments table (school-scoped, unique per
--   school/student/school-year)
-- * RLS: school admin full CRUD on own school; teacher SELECT only; super admin
-- * app_private.log_school_audit_action(...) — audit insert gated to school
--   admins / super admins (the existing app_private.log_admin_action is
--   super-admin-only and would break school-admin callers)
-- * app_private.admin_update_student_profile(...) + public wrapper — whitelisted
--   profile-field updates by the student's school admin, fully audited
-- ============================================================================

-- 1. enrollment_status enum (guarded for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_status') THEN
    CREATE TYPE enrollment_status AS ENUM ('active', 'withdrawn', 'graduated', 'pending');
  END IF;
END $$;

-- 2. enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  grade_level text,
  class_name text,
  school_year text,
  status enrollment_status not null default 'pending',
  enrolled_at timestamptz not null default now(),
  exited_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, school_year)
);

CREATE INDEX IF NOT EXISTS enrollments_school_status ON public.enrollments (school_id, status);
CREATE INDEX IF NOT EXISTS enrollments_student ON public.enrollments (student_id);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies (reuse existing school helpers)
DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
  );

DROP POLICY IF EXISTS "enrollments_teacher_select" ON public.enrollments;
CREATE POLICY "enrollments_teacher_select" ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

-- 4. School-scoped audit helper (school admin OR super admin)
--    The existing app_private.log_admin_action requires super admin and would
--    abort school-admin flows; this helper is the school-scoped counterpart.
CREATE OR REPLACE FUNCTION app_private.log_school_audit_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_school_id UUID,
  p_entity_id UUID DEFAULT NULL,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT (app_private.current_user_is_super_admin()
          OR (p_school_id IS NOT NULL AND app_private.current_user_is_school_admin(p_school_id))) THEN
    RAISE EXCEPTION 'Only school admins can write audit logs.';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before,
    after,
    metadata
  )
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_before,
    p_after,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 5. admin_update_student_profile — whitelisted profile edits by school admin
CREATE OR REPLACE FUNCTION app_private.admin_update_student_profile(p_student_id UUID, p_fields JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_student public.profiles%ROWTYPE;
  v_before JSONB;
  v_after JSONB;
  v_key TEXT;
  v_set_parts TEXT[] := '{}';
  v_sql TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id;
  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF NOT (app_private.current_user_is_super_admin()
          OR app_private.current_user_is_school_admin_for_student(p_student_id)) THEN
    RAISE EXCEPTION 'Only this school''s admin can update student profiles.';
  END IF;

  -- Whitelist build: only the allowed fields, rejecting anything else.
  FOR v_key IN SELECT jsonb_object_keys(p_fields) LOOP
    IF v_key = 'grade_level' OR v_key = 'class_name' OR v_key = 'bio' THEN
      v_set_parts := array_append(v_set_parts, format('%I = %L', v_key, p_fields->>v_key));
    ELSIF v_key = 'subjects' OR v_key = 'clubs' OR v_key = 'interests' THEN
      IF p_fields->v_key IS NULL OR jsonb_typeof(p_fields->v_key) = 'null' THEN
        v_set_parts := array_append(v_set_parts, format('%I = NULL', v_key));
      ELSIF jsonb_typeof(p_fields->v_key) <> 'array' THEN
        RAISE EXCEPTION 'Field "%" must be an array.', v_key;
      ELSE
        v_set_parts := array_append(v_set_parts,
          format('%I = %L', v_key,
            (SELECT COALESCE(array_agg(e), '{}'::TEXT[]) FROM jsonb_array_elements_text(p_fields->v_key) e)));
      END IF;
    ELSE
      RAISE EXCEPTION 'Field "%" is not editable.', v_key;
    END IF;
  END LOOP;

  IF array_length(v_set_parts, 1) IS NULL THEN
    RAISE EXCEPTION 'No editable fields provided.';
  END IF;

  v_before := to_jsonb(v_student);

  v_sql := 'UPDATE public.profiles t SET ' || array_to_string(v_set_parts, ', ')
        || ' WHERE t.id = $1 RETURNING to_jsonb(t.*)';
  EXECUTE v_sql INTO v_after USING p_student_id;

  PERFORM app_private.log_school_audit_action(
    'admin_update_student_profile', 'profiles', v_student.school_id, p_student_id,
    v_before, v_after, jsonb_build_object('fields', p_fields));

  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_student_profile(p_student_id UUID, p_fields JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.admin_update_student_profile(p_student_id, p_fields);
$$;

GRANT EXECUTE ON FUNCTION app_private.log_school_audit_action(TEXT, TEXT, UUID, UUID, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.admin_update_student_profile(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_student_profile(UUID, JSONB) TO authenticated;
