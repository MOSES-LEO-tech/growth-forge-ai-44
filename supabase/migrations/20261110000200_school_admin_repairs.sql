-- Academic structure (school-scoped CRUD for school admins).

CREATE TABLE IF NOT EXISTS public.academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade TEXT,
  student_count INTEGER,
  teacher_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_classes_school_admin" ON public.academic_classes;
CREATE POLICY "academic_classes_school_admin" ON public.academic_classes
  FOR ALL TO authenticated
  USING (app_private.current_user_is_school_admin(school_id))
  WITH CHECK (app_private.current_user_is_school_admin(school_id));

DROP POLICY IF EXISTS "academic_subjects_school_admin" ON public.academic_subjects;
CREATE POLICY "academic_subjects_school_admin" ON public.academic_subjects
  FOR ALL TO authenticated
  USING (app_private.current_user_is_school_admin(school_id))
  WITH CHECK (app_private.current_user_is_school_admin(school_id));

DROP POLICY IF EXISTS "academic_years_school_admin" ON public.academic_years;
CREATE POLICY "academic_years_school_admin" ON public.academic_years
  FOR ALL TO authenticated
  USING (app_private.current_user_is_school_admin(school_id))
  WITH CHECK (app_private.current_user_is_school_admin(school_id));

-- Let school admins also approve/reject their students' projects (was teacher-only).
CREATE OR REPLACE FUNCTION app_private.approve_student_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_project public.projects%ROWTYPE;
  target_student UUID;
BEGIN
  SELECT * INTO target_project
  FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF target_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  target_student := COALESCE(target_project.user_id, target_project.owner_id);
  IF NOT (
    app_private.current_user_is_teacher_for_student(target_student)
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin((SELECT school_id FROM public.profiles WHERE id = target_student))
  ) THEN
    RAISE EXCEPTION 'Only an approved teacher or school admin can approve projects.';
  END IF;

  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.projects
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = NULL,
      verified = true,
      status = CASE WHEN status = 'pending' THEN 'ongoing' ELSE status END,
      updated_at = now()
  WHERE id = target_project.id;

  RETURN jsonb_build_object('project_id', target_project.id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION app_private.reject_student_project(p_project_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_project public.projects%ROWTYPE;
  target_student UUID;
  reason TEXT;
BEGIN
  SELECT * INTO target_project
  FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF target_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  target_student := COALESCE(target_project.user_id, target_project.owner_id);
  IF NOT (
    app_private.current_user_is_teacher_for_student(target_student)
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin((SELECT school_id FROM public.profiles WHERE id = target_student))
  ) THEN
    RAISE EXCEPTION 'Only an approved teacher or school admin can reject projects.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.projects
  SET approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = COALESCE(reason, 'Project was rejected.'),
      verified = false,
      updated_at = now()
  WHERE id = target_project.id;

  RETURN jsonb_build_object('project_id', target_project.id, 'status', 'rejected');
END;
$$;

-- School admins may soft-delete their students' projects.
CREATE OR REPLACE FUNCTION public.delete_student_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_student UUID;
BEGIN
  SELECT COALESCE(user_id, owner_id) INTO target_student
  FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF target_student IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  IF NOT (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin((SELECT school_id FROM public.profiles WHERE id = target_student))
  ) THEN
    RAISE EXCEPTION 'Only a school admin can delete this project.';
  END IF;

  UPDATE public.projects
  SET deleted_at = now(), updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object('project_id', p_project_id, 'status', 'deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_student_project(UUID) TO authenticated;
