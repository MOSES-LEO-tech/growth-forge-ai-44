ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_approval_status_check,
  ADD CONSTRAINT projects_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.gallery_events
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.gallery_events
  DROP CONSTRAINT IF EXISTS gallery_events_approval_status_check,
  ADD CONSTRAINT gallery_events_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_approval_status_check,
  ADD CONSTRAINT achievements_approval_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE OR REPLACE FUNCTION app_private.profile_school_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE id = p_user_id
    AND account_status = 'approved'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.current_user_is_teacher_for_student(p_student_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles teacher
    JOIN public.profiles student ON student.id = p_student_id
    WHERE teacher.id = auth.uid()
      AND teacher.role::text = 'teacher'
      AND teacher.account_status = 'approved'
      AND teacher.school_id IS NOT NULL
      AND teacher.school_id = student.school_id
      AND student.role::text = 'student'
      AND student.account_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_user_is_school_admin_for_student(p_student_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    JOIN public.profiles student ON student.id = p_student_id
    JOIN public.schools school ON school.id = student.school_id
    WHERE admin_profile.id = auth.uid()
      AND admin_profile.role::text = 'admin'
      AND admin_profile.account_status = 'approved'
      AND admin_profile.school_id = student.school_id
      AND school.admin_id = admin_profile.id
      AND school.approval_status = 'approved'
      AND student.role::text = 'student'
      AND student.account_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.content_owner_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role::text
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app_private.prepare_project_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_id UUID;
  owner_role TEXT;
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  owner_id := COALESCE(NEW.user_id, NEW.owner_id);
  owner_role := app_private.content_owner_role(owner_id);

  IF owner_role = 'student' THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.verified := false;
  ELSE
    NEW.approval_status := COALESCE(NULLIF(NEW.approval_status, ''), 'approved');
    IF NEW.approval_status = 'approved' THEN
      NEW.approved_at := COALESCE(NEW.approved_at, now());
      NEW.verified := COALESCE(NEW.verified, true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_prepare_approval ON public.projects;
CREATE TRIGGER projects_prepare_approval
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prepare_project_approval();

CREATE OR REPLACE FUNCTION app_private.guard_project_approval_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'Project approval fields can only be changed through the teacher approval workflow.';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.tags IS DISTINCT FROM OLD.tags
     OR NEW.media_urls IS DISTINCT FROM OLD.media_urls
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.start_date IS DISTINCT FROM OLD.start_date
     OR NEW.end_date IS DISTINCT FROM OLD.end_date
     OR NEW.skills_tracked IS DISTINCT FROM OLD.skills_tracked THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.verified := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_guard_approval_update ON public.projects;
CREATE TRIGGER projects_guard_approval_update
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_project_approval_update();

CREATE OR REPLACE FUNCTION app_private.prepare_gallery_event_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_role TEXT;
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  owner_role := app_private.content_owner_role(NEW.user_id);

  IF owner_role = 'student' THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
  ELSE
    NEW.approval_status := COALESCE(NULLIF(NEW.approval_status, ''), 'approved');
    IF NEW.approval_status = 'approved' THEN
      NEW.approved_at := COALESCE(NEW.approved_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_events_prepare_approval ON public.gallery_events;
CREATE TRIGGER gallery_events_prepare_approval
  BEFORE INSERT ON public.gallery_events
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prepare_gallery_event_approval();

CREATE OR REPLACE FUNCTION app_private.guard_gallery_event_approval_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'Media approval fields can only be changed through the teacher approval workflow.';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.location IS DISTINCT FROM OLD.location
     OR NEW.event_date IS DISTINCT FROM OLD.event_date
     OR NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_events_guard_approval_update ON public.gallery_events;
CREATE TRIGGER gallery_events_guard_approval_update
  BEFORE UPDATE ON public.gallery_events
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_gallery_event_approval_update();

CREATE OR REPLACE FUNCTION app_private.reset_gallery_event_approval_on_media_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_event_id UUID;
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  target_event_id := COALESCE(NEW.event_id, OLD.event_id);
  IF target_event_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.gallery_events
  SET approval_status = 'pending',
      approved_by = NULL,
      approved_at = NULL,
      rejection_reason = NULL
  WHERE id = target_event_id
    AND approval_status = 'approved'
    AND app_private.content_owner_role(user_id) = 'student';

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gallery_media_reset_event_approval ON public.gallery_media;
CREATE TRIGGER gallery_media_reset_event_approval
  AFTER INSERT OR UPDATE OR DELETE ON public.gallery_media
  FOR EACH ROW
  EXECUTE FUNCTION app_private.reset_gallery_event_approval_on_media_change();

CREATE OR REPLACE FUNCTION app_private.prepare_achievement_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  owner_role TEXT;
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  owner_role := app_private.content_owner_role(NEW.user_id);

  IF owner_role = 'student' THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.verified := false;
    NEW.verified_by := NULL;
  ELSE
    NEW.approval_status := COALESCE(NULLIF(NEW.approval_status, ''), 'approved');
    IF NEW.approval_status = 'approved' THEN
      NEW.approved_at := COALESCE(NEW.approved_at, now());
      NEW.verified := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS achievements_prepare_approval ON public.achievements;
CREATE TRIGGER achievements_prepare_approval
  BEFORE INSERT ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prepare_achievement_approval();

CREATE OR REPLACE FUNCTION app_private.guard_achievement_approval_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    RAISE EXCEPTION 'Achievement approval fields can only be changed through the school admin approval workflow.';
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.date_earned IS DISTINCT FROM OLD.date_earned
     OR NEW.certificate_url IS DISTINCT FROM OLD.certificate_url THEN
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.verified := false;
    NEW.verified_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS achievements_guard_approval_update ON public.achievements;
CREATE TRIGGER achievements_guard_approval_update
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_achievement_approval_update();

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
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF target_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  target_student := COALESCE(target_project.user_id, target_project.owner_id);
  IF NOT (app_private.current_user_is_teacher_for_student(target_student) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only an approved teacher at this student''s school can approve projects.';
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

CREATE OR REPLACE FUNCTION public.approve_student_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.approve_student_project(p_project_id);
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
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF target_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  target_student := COALESCE(target_project.user_id, target_project.owner_id);
  IF NOT (app_private.current_user_is_teacher_for_student(target_student) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only an approved teacher at this student''s school can reject projects.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.projects
  SET approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = COALESCE(reason, 'Project was rejected by the teacher.'),
      verified = false,
      updated_at = now()
  WHERE id = target_project.id;

  RETURN jsonb_build_object('project_id', target_project.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_student_project(p_project_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.reject_student_project(p_project_id, p_reason);
$$;

CREATE OR REPLACE FUNCTION app_private.approve_student_media_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_event public.gallery_events%ROWTYPE;
BEGIN
  SELECT * INTO target_event
  FROM public.gallery_events
  WHERE id = p_event_id
    AND deleted_at IS NULL;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Media submission not found.';
  END IF;

  IF NOT (app_private.current_user_is_teacher_for_student(target_event.user_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only an approved teacher at this student''s school can approve media.';
  END IF;

  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.gallery_events
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = NULL
  WHERE id = target_event.id;

  RETURN jsonb_build_object('event_id', target_event.id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_student_media_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.approve_student_media_event(p_event_id);
$$;

CREATE OR REPLACE FUNCTION app_private.reject_student_media_event(p_event_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_event public.gallery_events%ROWTYPE;
  reason TEXT;
BEGIN
  SELECT * INTO target_event
  FROM public.gallery_events
  WHERE id = p_event_id
    AND deleted_at IS NULL;

  IF target_event.id IS NULL THEN
    RAISE EXCEPTION 'Media submission not found.';
  END IF;

  IF NOT (app_private.current_user_is_teacher_for_student(target_event.user_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only an approved teacher at this student''s school can reject media.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.gallery_events
  SET approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = COALESCE(reason, 'Media submission was rejected by the teacher.')
  WHERE id = target_event.id;

  RETURN jsonb_build_object('event_id', target_event.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_student_media_event(p_event_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.reject_student_media_event(p_event_id, p_reason);
$$;

CREATE OR REPLACE FUNCTION app_private.approve_student_achievement(p_achievement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_achievement public.achievements%ROWTYPE;
BEGIN
  SELECT * INTO target_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;

  IF target_achievement.id IS NULL THEN
    RAISE EXCEPTION 'Achievement not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin_for_student(target_achievement.user_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this student''s school admin can approve achievements.';
  END IF;

  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.achievements
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = NULL,
      verified = true,
      verified_by = auth.uid()
  WHERE id = target_achievement.id;

  RETURN jsonb_build_object('achievement_id', target_achievement.id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_student_achievement(p_achievement_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.approve_student_achievement(p_achievement_id);
$$;

CREATE OR REPLACE FUNCTION app_private.reject_student_achievement(p_achievement_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_achievement public.achievements%ROWTYPE;
  reason TEXT;
BEGIN
  SELECT * INTO target_achievement
  FROM public.achievements
  WHERE id = p_achievement_id;

  IF target_achievement.id IS NULL THEN
    RAISE EXCEPTION 'Achievement not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin_for_student(target_achievement.user_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this student''s school admin can reject achievements.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  PERFORM set_config('app.content_approval_bypass', 'on', true);

  UPDATE public.achievements
  SET approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = COALESCE(reason, 'Achievement was rejected by the school admin.'),
      verified = false,
      verified_by = NULL
  WHERE id = target_achievement.id;

  RETURN jsonb_build_object('achievement_id', target_achievement.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_student_achievement(p_achievement_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.reject_student_achievement(p_achievement_id, p_reason);
$$;

SELECT set_config('app.content_approval_bypass', 'on', true);

UPDATE public.projects
SET approval_status = CASE
      WHEN COALESCE(verified, false) OR COALESCE(status, '') <> 'pending' THEN 'approved'
      ELSE 'pending'
    END,
    approved_at = CASE
      WHEN COALESCE(verified, false) OR COALESCE(status, '') <> 'pending' THEN COALESCE(approved_at, updated_at, created_at, now())
      ELSE approved_at
    END
WHERE approval_status IS NULL
   OR approval_status = 'pending';

UPDATE public.gallery_events
SET approval_status = CASE
      WHEN COALESCE(is_public, false) OR app_private.content_owner_role(user_id) <> 'student' THEN 'approved'
      ELSE 'pending'
    END,
    approved_at = CASE
      WHEN COALESCE(is_public, false) OR app_private.content_owner_role(user_id) <> 'student' THEN COALESCE(approved_at, created_at, now())
      ELSE approved_at
    END
WHERE approval_status IS NULL
   OR approval_status = 'pending';

UPDATE public.achievements
SET approval_status = CASE
      WHEN COALESCE(verified, false) THEN 'approved'
      ELSE 'pending'
    END,
    approved_at = CASE
      WHEN COALESCE(verified, false) THEN COALESCE(approved_at, created_at, now())
      ELSE approved_at
    END,
    approved_by = COALESCE(approved_by, verified_by)
WHERE approval_status IS NULL
   OR approval_status = 'pending';

SELECT set_config('app.content_approval_bypass', 'off', true);

DROP POLICY IF EXISTS "Teachers view school student projects" ON public.projects;
DROP POLICY IF EXISTS "projects_teacher_select_school_students" ON public.projects;
CREATE POLICY "projects_teacher_select_school_students" ON public.projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND app_private.current_user_is_teacher_for_student(COALESCE(user_id, owner_id))
  );

DROP POLICY IF EXISTS "projects_teacher_update_school_students" ON public.projects;

DROP POLICY IF EXISTS "gallery_events_owner_or_public_select" ON public.gallery_events;
DROP POLICY IF EXISTS "gallery_events_owner_or_approved_public_select" ON public.gallery_events;
CREATE POLICY "gallery_events_owner_or_approved_public_select" ON public.gallery_events
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      is_public IS TRUE
      AND deleted_at IS NULL
      AND approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Anyone can view public events" ON public.gallery_events;
DROP POLICY IF EXISTS "gallery_events_approved_public_anon_select" ON public.gallery_events;
CREATE POLICY "gallery_events_approved_public_anon_select" ON public.gallery_events
  FOR SELECT TO anon
  USING (
    is_public IS TRUE
    AND deleted_at IS NULL
    AND approval_status = 'approved'
  );

DROP POLICY IF EXISTS "Public events visible to all" ON public.gallery_events;

DROP POLICY IF EXISTS "gallery_events_teacher_select_school_students" ON public.gallery_events;
CREATE POLICY "gallery_events_teacher_select_school_students" ON public.gallery_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND app_private.current_user_is_teacher_for_student(user_id)
  );

DROP POLICY IF EXISTS "gallery_media_owner_or_public_select" ON public.gallery_media;
DROP POLICY IF EXISTS "gallery_media_owner_or_approved_public_select" ON public.gallery_media;
CREATE POLICY "gallery_media_owner_or_approved_public_select" ON public.gallery_media
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.gallery_events e
      WHERE e.id = gallery_media.event_id
        AND (
          e.user_id = auth.uid()
          OR (
            e.is_public IS TRUE
            AND e.deleted_at IS NULL
            AND e.approval_status = 'approved'
          )
          OR app_private.current_user_is_teacher_for_student(e.user_id)
        )
    )
  );

DROP POLICY IF EXISTS "school_join_codes_admin_select" ON public.school_join_codes;
DROP POLICY IF EXISTS "school_join_codes_staff_select" ON public.school_join_codes;
CREATE POLICY "school_join_codes_staff_select" ON public.school_join_codes
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

DROP POLICY IF EXISTS "achievements_school_admin_select_students" ON public.achievements;
CREATE POLICY "achievements_school_admin_select_students" ON public.achievements
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_school_admin_for_student(user_id)
  );

DROP POLICY IF EXISTS "achievements_school_admin_update_students" ON public.achievements;

GRANT EXECUTE ON FUNCTION app_private.profile_school_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_teacher_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_school_admin_for_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_project(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_project(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_media_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_media_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_student_achievement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_student_achievement(UUID, TEXT) TO authenticated;
