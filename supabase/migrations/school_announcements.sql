-- School announcements: in-app, audience-wide (students / parents / staff).
-- Reuses the app_private SECURITY DEFINER + public SECURITY INVOKER wrapper
-- convention and the school-scoped audit helper. Publishing fans out one
-- notification row per recipient through the existing notifications table.

-- ---------------------------------------------------------------------------
-- Storage: allow documents in the school-assets bucket and let school staff
-- (teachers + admins) upload so CMS authors can attach images and files.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets',
  TRUE,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "school_assets_school_staff_insert" ON storage.objects;
CREATE POLICY "school_assets_school_staff_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (
          app_private.current_user_is_school_admin(s.id)
          OR app_private.current_user_is_teacher_for_school(s.id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Announcements table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('students', 'parents', 'staff')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_announcements_school_status
  ON public.school_announcements (school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS school_announcements_school_audience
  ON public.school_announcements (school_id, audience);

-- ---------------------------------------------------------------------------
-- Author stamping
-- ---------------------------------------------------------------------------
-- The CMS review workflow lets teachers author drafts, and its insert
-- policies require created_by = auth.uid(). Stamp the author server-side so
-- client inserts never need to trust a caller-supplied user id.
CREATE OR REPLACE FUNCTION app_private.cms_stamp_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- The CMS tables live in school_cms.sql, which may apply before or after this
-- migration depending on tooling, so guard the trigger creation.
DO $$
BEGIN
  IF to_regclass('public.cms_pages') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS cms_pages_stamp_created_by ON public.cms_pages';
    EXECUTE 'CREATE TRIGGER cms_pages_stamp_created_by BEFORE INSERT ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION app_private.cms_stamp_created_by()';
  END IF;
  IF to_regclass('public.cms_news') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS cms_news_stamp_created_by ON public.cms_news';
    EXECUTE 'CREATE TRIGGER cms_news_stamp_created_by BEFORE INSERT ON public.cms_news FOR EACH ROW EXECUTE FUNCTION app_private.cms_stamp_created_by()';
  END IF;
  IF to_regclass('public.cms_events') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS cms_events_stamp_created_by ON public.cms_events';
    EXECUTE 'CREATE TRIGGER cms_events_stamp_created_by BEFORE INSERT ON public.cms_events FOR EACH ROW EXECUTE FUNCTION app_private.cms_stamp_created_by()';
  END IF;
  IF to_regclass('public.cms_resources') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS cms_resources_stamp_created_by ON public.cms_resources';
    EXECUTE 'CREATE TRIGGER cms_resources_stamp_created_by BEFORE INSERT ON public.cms_resources FOR EACH ROW EXECUTE FUNCTION app_private.cms_stamp_created_by()';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION app_private.announcements_stamp_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_announcements_stamp_created_by ON public.school_announcements;
CREATE TRIGGER school_announcements_stamp_created_by
  BEFORE INSERT ON public.school_announcements
  FOR EACH ROW EXECUTE FUNCTION app_private.announcements_stamp_created_by();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_announcements_select" ON public.school_announcements;
CREATE POLICY "school_announcements_select" ON public.school_announcements
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR created_by = auth.uid()
    OR (
      status = 'published'
      AND app_private.current_user_is_teacher_for_school(school_id)
    )
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.school_id = school_announcements.school_id
          AND p.role IN ('student', 'parent')
          AND p.account_status = 'approved'
      )
    )
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.parent_child_links l
        JOIN public.profiles c ON c.id = l.child_id
        WHERE l.parent_id = auth.uid()
          AND c.school_id = school_announcements.school_id
      )
    )
  );

DROP POLICY IF EXISTS "school_announcements_insert" ON public.school_announcements;
CREATE POLICY "school_announcements_insert" ON public.school_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (
      created_by = auth.uid()
      AND app_private.current_user_is_teacher_for_school(school_id)
    )
  );

DROP POLICY IF EXISTS "school_announcements_update" ON public.school_announcements;
CREATE POLICY "school_announcements_update" ON public.school_announcements
  FOR UPDATE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (
      created_by = auth.uid()
      AND status = 'draft'
      AND app_private.current_user_is_teacher_for_school(school_id)
    )
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (
      created_by = auth.uid()
      AND status = 'draft'
      AND app_private.current_user_is_teacher_for_school(school_id)
    )
  );

DROP POLICY IF EXISTS "school_announcements_delete" ON public.school_announcements;
CREATE POLICY "school_announcements_delete" ON public.school_announcements
  FOR DELETE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (
      created_by = auth.uid()
      AND status = 'draft'
      AND app_private.current_user_is_teacher_for_school(school_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Audit + publish
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.announcements_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS school_announcements_touch_updated_at ON public.school_announcements;
CREATE TRIGGER school_announcements_touch_updated_at
  BEFORE UPDATE ON public.school_announcements
  FOR EACH ROW EXECUTE FUNCTION app_private.announcements_touch_updated_at();

-- School admin: publish an announcement and fan out notifications.
CREATE OR REPLACE FUNCTION app_private.announcements_publish(p_announcement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_audience TEXT;
  v_title TEXT;
  v_message TEXT;
  v_recipients INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  SELECT school_id, audience, title, message
    INTO v_school_id, v_audience, v_title, v_message
  FROM public.school_announcements
  WHERE id = p_announcement_id;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Announcement not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id)
          OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this school''s admin can publish announcements.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.school_announcements
    WHERE id = p_announcement_id AND status = 'published'
  ) THEN
    RETURN jsonb_build_object(
      'id', p_announcement_id,
      'status', 'published',
      'recipients', (SELECT count(*)::int FROM public.notifications
                     WHERE resource_type = 'school_announcements' AND resource_id = p_announcement_id)
    );
  END IF;

  IF v_audience = 'students' THEN
    INSERT INTO public.notifications (user_id, type, title, message, resource_type, resource_id)
    SELECT p.id, 'announcement', v_title, v_message, 'school_announcements', p_announcement_id
    FROM public.profiles p
    WHERE p.role = 'student'
      AND p.school_id = v_school_id
      AND p.account_status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.resource_type = 'school_announcements'
          AND n.resource_id = p_announcement_id
      );
  ELSIF v_audience = 'parents' THEN
    INSERT INTO public.notifications (user_id, type, title, message, resource_type, resource_id)
    SELECT DISTINCT target.id, 'announcement', v_title, v_message, 'school_announcements', p_announcement_id
    FROM (
      SELECT p.id
      FROM public.profiles p
      WHERE p.role = 'parent'
        AND p.school_id = v_school_id
        AND p.account_status = 'approved'
      UNION
      SELECT l.parent_id AS id
      FROM public.parent_child_links l
      JOIN public.profiles c ON c.id = l.child_id
      JOIN public.profiles parent_profile ON parent_profile.id = l.parent_id
      WHERE c.school_id = v_school_id
        AND parent_profile.account_status = 'approved'
    ) target
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = target.id
        AND n.resource_type = 'school_announcements'
        AND n.resource_id = p_announcement_id
    );
  ELSIF v_audience = 'staff' THEN
    INSERT INTO public.notifications (user_id, type, title, message, resource_type, resource_id)
    SELECT p.id, 'announcement', v_title, v_message, 'school_announcements', p_announcement_id
    FROM public.profiles p
    WHERE p.role IN ('teacher', 'admin')
      AND p.school_id = v_school_id
      AND p.account_status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.id
          AND n.resource_type = 'school_announcements'
          AND n.resource_id = p_announcement_id
      );
  END IF;

  GET DIAGNOSTICS v_recipients = ROW_COUNT;

  UPDATE public.school_announcements
  SET status = 'published',
      published_by = auth.uid(),
      published_at = now(),
      updated_at = now()
  WHERE id = p_announcement_id;

  PERFORM app_private.log_school_audit_action(
    'announcements_publish', 'school_announcements', v_school_id, p_announcement_id,
    NULL, jsonb_build_object('audience', v_audience, 'recipients', v_recipients),
    jsonb_build_object('school_id', v_school_id)
  );

  RETURN jsonb_build_object(
    'id', p_announcement_id,
    'status', 'published',
    'recipients', v_recipients
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.announcements_publish(p_announcement_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.announcements_publish(p_announcement_id);
$$;

GRANT EXECUTE ON FUNCTION app_private.announcements_publish(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.announcements_publish(UUID) TO authenticated;
