-- Public exposure hardening, Super Admin audit trail, SmartBuddy telemetry,
-- and RPC-backed dashboard aggregates.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

-- SECURITY DEFINER views bypass caller RLS. Postgres 17 supports invoker views.
CREATE OR REPLACE VIEW public.events
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  title,
  description,
  location,
  event_date,
  is_public,
  created_at,
  deleted_at
FROM public.gallery_events;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id
  ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
  ON public.admin_audit_logs(entity_type, entity_id);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_super_admin_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_super_admin_select" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

CREATE TABLE IF NOT EXISTS public.smartbuddy_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'lovable-ai-gateway',
  personality TEXT NOT NULL DEFAULT 'default',
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  total_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (total_cost_usd >= 0),
  cost_source TEXT NOT NULL DEFAULT 'provider_usage',
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_smartbuddy_usage_created_at
  ON public.smartbuddy_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smartbuddy_usage_user_id
  ON public.smartbuddy_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_smartbuddy_usage_status_created_at
  ON public.smartbuddy_usage(status, created_at DESC);

ALTER TABLE public.smartbuddy_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smartbuddy_usage_owner_or_super_admin_select" ON public.smartbuddy_usage;
CREATE POLICY "smartbuddy_usage_owner_or_super_admin_select" ON public.smartbuddy_usage
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR app_private.current_user_is_super_admin()
  );

-- Cover currently unindexed foreign keys flagged by Supabase performance advisors.
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_school_id ON public.scholarships(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_by ON public.profiles(approved_by);
CREATE INDEX IF NOT EXISTS idx_schools_approved_by ON public.schools(approved_by);
CREATE INDEX IF NOT EXISTS idx_school_connection_requests_decided_by ON public.school_connection_requests(decided_by);
CREATE INDEX IF NOT EXISTS idx_school_join_codes_created_by ON public.school_join_codes(created_by);

-- Remove the broadest settings write path. Existing admin/super-admin policies remain.
DROP POLICY IF EXISTS "settings_write_authenticated" ON public.settings;

-- Public buckets do not need broad SELECT policies for public URL delivery, and broad
-- SELECT permits listing all files through storage APIs.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;

CREATE OR REPLACE FUNCTION app_private.log_admin_action(
  p_action TEXT,
  p_entity_type TEXT,
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
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can write admin audit logs.';
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

CREATE OR REPLACE FUNCTION app_private.super_admin_update_user_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
  normalized_role TEXT;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can update user roles.';
  END IF;

  normalized_role := lower(trim(COALESCE(p_role, '')));
  IF normalized_role NOT IN ('student', 'parent', 'teacher', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  IF p_user_id = auth.uid() AND normalized_role <> 'super_admin' THEN
    RAISE EXCEPTION 'You cannot remove your own Super Admin role.';
  END IF;

  SELECT to_jsonb(p.*) INTO before_row
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.profiles
  SET role = normalized_role,
      updated_at = now()
  WHERE id = p_user_id;

  SELECT to_jsonb(p.*) INTO after_row
  FROM public.profiles p
  WHERE p.id = p_user_id;

  PERFORM app_private.log_admin_action('user.role.update', 'profiles', p_user_id, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_user_role(p_user_id, p_role);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_update_user_school(
  p_user_id UUID,
  p_school_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can assign users to schools.';
  END IF;

  IF p_school_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.schools WHERE id = p_school_id) THEN
    RAISE EXCEPTION 'School not found.';
  END IF;

  SELECT to_jsonb(p.*) INTO before_row
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.profiles
  SET school_id = p_school_id,
      updated_at = now()
  WHERE id = p_user_id;

  SELECT to_jsonb(p.*) INTO after_row
  FROM public.profiles p
  WHERE p.id = p_user_id;

  PERFORM app_private.log_admin_action('user.school.update', 'profiles', p_user_id, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_user_school(p_user_id UUID, p_school_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_user_school(p_user_id, p_school_id);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_create_school(
  p_name TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  after_row JSONB;
  new_id UUID;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can create schools.';
  END IF;

  IF length(trim(COALESCE(p_name, ''))) < 2 THEN
    RAISE EXCEPTION 'School name is required.';
  END IF;

  INSERT INTO public.schools (name, location, description, approval_status, approved_by, approved_at, created_at, updated_at)
  VALUES (
    trim(p_name),
    NULLIF(trim(COALESCE(p_location, '')), ''),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    'approved',
    auth.uid(),
    now(),
    now(),
    now()
  )
  RETURNING id INTO new_id;

  SELECT to_jsonb(s.*) INTO after_row
  FROM public.schools s
  WHERE s.id = new_id;

  PERFORM app_private.log_admin_action('school.create', 'schools', new_id, NULL, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_create_school(
  p_name TEXT,
  p_location TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_create_school(p_name, p_location, p_description);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_update_project_moderation(
  p_project_id UUID,
  p_status TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can moderate projects.';
  END IF;

  SELECT to_jsonb(p.*) INTO before_row
  FROM public.projects p
  WHERE p.id = p_project_id
  FOR UPDATE;

  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Project not found.';
  END IF;

  UPDATE public.projects
  SET status = COALESCE(NULLIF(trim(COALESCE(p_status, '')), ''), status),
      verified = COALESCE(p_verified, verified),
      updated_at = now()
  WHERE id = p_project_id;

  SELECT to_jsonb(p.*) INTO after_row
  FROM public.projects p
  WHERE p.id = p_project_id;

  PERFORM app_private.log_admin_action('project.moderation.update', 'projects', p_project_id, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_project_moderation(
  p_project_id UUID,
  p_status TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_project_moderation(p_project_id, p_status, p_verified);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_update_achievement_verification(
  p_achievement_id UUID,
  p_verified BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can verify achievements.';
  END IF;

  SELECT to_jsonb(a.*) INTO before_row
  FROM public.achievements a
  WHERE a.id = p_achievement_id
  FOR UPDATE;

  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Achievement not found.';
  END IF;

  UPDATE public.achievements
  SET verified = COALESCE(p_verified, false)
  WHERE id = p_achievement_id;

  SELECT to_jsonb(a.*) INTO after_row
  FROM public.achievements a
  WHERE a.id = p_achievement_id;

  PERFORM app_private.log_admin_action('achievement.verification.update', 'achievements', p_achievement_id, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_achievement_verification(p_achievement_id UUID, p_verified BOOLEAN)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_achievement_verification(p_achievement_id, p_verified);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_update_gallery_event_visibility(
  p_event_id UUID,
  p_is_public BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can update gallery visibility.';
  END IF;

  SELECT to_jsonb(e.*) INTO before_row
  FROM public.gallery_events e
  WHERE e.id = p_event_id
  FOR UPDATE;

  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Gallery event not found.';
  END IF;

  UPDATE public.gallery_events
  SET is_public = COALESCE(p_is_public, false)
  WHERE id = p_event_id;

  SELECT to_jsonb(e.*) INTO after_row
  FROM public.gallery_events e
  WHERE e.id = p_event_id;

  PERFORM app_private.log_admin_action('gallery.visibility.update', 'gallery_events', p_event_id, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_gallery_event_visibility(p_event_id UUID, p_is_public BOOLEAN)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_gallery_event_visibility(p_event_id, p_is_public);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_update_ai_governance_settings(p_settings JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can update AI governance settings.';
  END IF;

  IF p_settings IS NULL OR jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'Settings must be a JSON object.';
  END IF;

  SELECT to_jsonb(s.*) INTO before_row
  FROM public.settings s
  WHERE s.key = 'ai_governance';

  INSERT INTO public.settings (key, value, updated_at)
  VALUES ('ai_governance', p_settings, now())
  ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();

  SELECT to_jsonb(s.*) INTO after_row
  FROM public.settings s
  WHERE s.key = 'ai_governance';

  PERFORM app_private.log_admin_action('settings.ai_governance.update', 'settings', NULL, before_row, after_row);
  RETURN after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_update_ai_governance_settings(p_settings JSONB)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_update_ai_governance_settings(p_settings);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_approve_school_application(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can approve school applications.';
  END IF;

  SELECT to_jsonb(s.*) INTO before_row
  FROM public.schools s
  WHERE s.id = p_school_id;

  result := app_private.approve_school_application(p_school_id);

  SELECT to_jsonb(s.*) INTO after_row
  FROM public.schools s
  WHERE s.id = p_school_id;

  PERFORM app_private.log_admin_action('school_application.approve', 'schools', p_school_id, before_row, after_row, result);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_approve_school_application(p_school_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_approve_school_application(p_school_id);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_reject_school_application(
  p_school_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reject school applications.';
  END IF;

  SELECT to_jsonb(s.*) INTO before_row
  FROM public.schools s
  WHERE s.id = p_school_id;

  result := app_private.reject_school_application(p_school_id, p_reason);

  SELECT to_jsonb(s.*) INTO after_row
  FROM public.schools s
  WHERE s.id = p_school_id;

  PERFORM app_private.log_admin_action(
    'school_application.reject',
    'schools',
    p_school_id,
    before_row,
    after_row,
    jsonb_build_object('reason', p_reason)
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_reject_school_application(
  p_school_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_reject_school_application(p_school_id, p_reason);
$$;

CREATE OR REPLACE FUNCTION public.super_admin_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  result JSONB;
  ai_settings JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can read platform aggregates.';
  END IF;

  SELECT s.value INTO ai_settings
  FROM public.settings s
  WHERE s.key = 'ai_governance';

  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'totalUsers', (SELECT count(*) FROM public.profiles),
      'activeStudents', (SELECT count(*) FROM public.profiles WHERE role::text = 'student' AND account_status = 'approved'),
      'admins', (SELECT count(*) FROM public.profiles WHERE role::text IN ('admin', 'super_admin')),
      'partnerSchools', (SELECT count(*) FROM public.schools WHERE approval_status = 'approved'),
      'totalProjects', (SELECT count(*) FROM public.projects WHERE deleted_at IS NULL),
      'pendingProjects', (SELECT count(*) FROM public.projects WHERE deleted_at IS NULL AND lower(COALESCE(status, '')) = 'pending'),
      'verifiedAchievements', (SELECT count(*) FROM public.achievements WHERE verified IS TRUE),
      'pendingAchievements', (SELECT count(*) FROM public.achievements WHERE COALESCE(verified, false) IS FALSE),
      'guidanceRequests', (SELECT count(*) FROM public.smartbuddy_usage),
      'publicEvents', (SELECT count(*) FROM public.gallery_events WHERE is_public IS TRUE AND deleted_at IS NULL)
    ),
    'roleCounts', jsonb_build_object(
      'student', (SELECT count(*) FROM public.profiles WHERE role::text = 'student'),
      'parent', (SELECT count(*) FROM public.profiles WHERE role::text = 'parent'),
      'teacher', (SELECT count(*) FROM public.profiles WHERE role::text = 'teacher'),
      'admin', (SELECT count(*) FROM public.profiles WHERE role::text = 'admin'),
      'super_admin', (SELECT count(*) FROM public.profiles WHERE role::text = 'super_admin')
    ),
    'projectStatusCounts', COALESCE((
      SELECT jsonb_object_agg(status_key, status_count)
      FROM (
        SELECT COALESCE(NULLIF(status, ''), 'unknown') AS status_key, count(*) AS status_count
        FROM public.projects
        WHERE deleted_at IS NULL
        GROUP BY COALESCE(NULLIF(status, ''), 'unknown')
      ) project_counts
    ), '{}'::jsonb),
    'smartBuddyStatusCounts', COALESCE((
      SELECT jsonb_object_agg(status, status_count)
      FROM (
        SELECT status, count(*) AS status_count
        FROM public.smartbuddy_usage
        GROUP BY status
      ) usage_counts
    ), '{}'::jsonb),
    'smartBuddyTotals', jsonb_build_object(
      'requests', (SELECT count(*) FROM public.smartbuddy_usage),
      'promptTokens', COALESCE((SELECT sum(prompt_tokens) FROM public.smartbuddy_usage), 0),
      'completionTokens', COALESCE((SELECT sum(completion_tokens) FROM public.smartbuddy_usage), 0),
      'totalTokens', COALESCE((SELECT sum(total_tokens) FROM public.smartbuddy_usage), 0),
      'costUsd', COALESCE((SELECT sum(total_cost_usd) FROM public.smartbuddy_usage), 0)
    ),
    'pendingSchoolApplications', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'name', s.name,
          'location', s.location,
          'country', s.country,
          'description', s.description,
          'logo_url', s.logo_url,
          'admin_id', s.admin_id,
          'approval_status', s.approval_status,
          'approved_by', s.approved_by,
          'approved_at', s.approved_at,
          'created_at', s.created_at,
          'updated_at', s.updated_at,
          'admin_name', p.full_name,
          'admin_email', p.email
        )
        ORDER BY s.created_at ASC
      )
      FROM public.schools s
      LEFT JOIN public.profiles p ON p.id = s.admin_id
      WHERE s.approval_status = 'pending'
    ), '[]'::jsonb),
    'recentActivity', COALESCE((
      SELECT jsonb_agg(activity ORDER BY activity_created_at DESC)
      FROM (
        SELECT activity, (activity->>'created_at')::timestamptz AS activity_created_at
        FROM (
        SELECT jsonb_build_object(
          'id', p.id,
          'type', 'project',
          'title', p.title,
          'detail', COALESCE(owner.full_name, owner.email, 'Unknown user') || ' submitted a project',
          'created_at', p.created_at
        ) AS activity
        FROM public.projects p
        LEFT JOIN public.profiles owner ON owner.id = COALESCE(p.user_id, p.owner_id)
        WHERE p.deleted_at IS NULL
        UNION ALL
        SELECT jsonb_build_object(
          'id', a.id,
          'type', 'achievement',
          'title', a.title,
          'detail', COALESCE(owner.full_name, owner.email, 'Unknown user') || ' added an achievement',
          'created_at', COALESCE(a.created_at, now())
        )
        FROM public.achievements a
        LEFT JOIN public.profiles owner ON owner.id = a.user_id
        UNION ALL
        SELECT jsonb_build_object(
          'id', u.id,
          'type', 'smartbuddy',
          'title', 'SmartBuddy request',
          'detail', COALESCE(owner.full_name, owner.email, 'Unknown user') || ' used SmartBuddy',
          'created_at', u.created_at
        )
        FROM public.smartbuddy_usage u
        LEFT JOIN public.profiles owner ON owner.id = u.user_id
        UNION ALL
        SELECT jsonb_build_object(
          'id', g.id,
          'type', 'gallery',
          'title', g.title,
          'detail', COALESCE(owner.full_name, owner.email, 'Unknown user') || ' created a gallery event',
          'created_at', COALESCE(g.created_at, now())
        )
        FROM public.gallery_events g
        LEFT JOIN public.profiles owner ON owner.id = g.user_id
        WHERE g.deleted_at IS NULL
        ) unioned_activity
        ORDER BY activity_created_at DESC
        LIMIT 8
      ) recent
    ), '[]'::jsonb),
    'aiSettings', COALESCE(ai_settings, '{}'::jsonb),
    'generatedAt', now()
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_users(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_school_id UUID DEFAULT NULL,
  p_unassigned BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list users.';
  END IF;

  WITH filtered AS (
    SELECT p.*
    FROM public.profiles p
    LEFT JOIN public.schools s ON s.id = p.school_id
    WHERE (v_search IS NULL OR p.full_name ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%' OR s.name ILIKE '%' || v_search || '%')
      AND (p_role IS NULL OR p_role = '' OR p_role = 'all' OR p.role::text = p_role)
      AND (
        (COALESCE(p_unassigned, false) IS TRUE AND p.school_id IS NULL)
        OR (COALESCE(p_unassigned, false) IS FALSE AND (p_school_id IS NULL OR p.school_id = p_school_id))
      )
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  ),
  paged AS (
    SELECT f.*, s.name AS school_name
    FROM filtered f
    LEFT JOIN public.schools s ON s.id = f.school_id
    ORDER BY f.created_at DESC
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'school_id', p.school_id,
        'grade_level', p.grade_level,
        'class_name', p.class_name,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'school_name', p.school_name,
        'project_count', (SELECT count(*) FROM public.projects pr WHERE pr.deleted_at IS NULL AND (pr.user_id = p.id OR pr.owner_id = p.id)),
        'achievement_count', (SELECT count(*) FROM public.achievements a WHERE a.user_id = p.id),
        'recommendation_count', (SELECT count(*) FROM public.recommendations r WHERE r.user_id = p.id),
        'smartbuddy_count', (SELECT count(*) FROM public.smartbuddy_usage u WHERE u.user_id = p.id),
        'gallery_count', (SELECT count(*) FROM public.gallery_events g WHERE g.deleted_at IS NULL AND g.user_id = p.id)
      )
    ), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged p;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_schools(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list schools.';
  END IF;

  WITH filtered AS (
    SELECT s.*
    FROM public.schools s
    WHERE v_search IS NULL
      OR s.name ILIKE '%' || v_search || '%'
      OR s.location ILIKE '%' || v_search || '%'
      OR s.country ILIKE '%' || v_search || '%'
  ),
  counted AS (
    SELECT count(*) AS total FROM filtered
  ),
  paged AS (
    SELECT *
    FROM filtered
    ORDER BY name
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(
      to_jsonb(s.*) || jsonb_build_object(
        'total_users', (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id),
        'students', (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id AND p.role::text = 'student'),
        'teachers', (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id AND p.role::text = 'teacher'),
        'parents', (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id AND p.role::text = 'parent'),
        'admins', (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id AND p.role::text = 'admin'),
        'projects', (
          SELECT count(*)
          FROM public.projects pr
          JOIN public.profiles p ON p.id = COALESCE(pr.user_id, pr.owner_id)
          WHERE pr.deleted_at IS NULL AND p.school_id = s.id
        ),
        'achievements', (
          SELECT count(*)
          FROM public.achievements a
          JOIN public.profiles p ON p.id = a.user_id
          WHERE p.school_id = s.id
        ),
        'engagement_score',
          (SELECT count(*) FROM public.profiles p WHERE p.school_id = s.id)
          + (
            SELECT count(*) * 2
            FROM public.projects pr
            JOIN public.profiles p ON p.id = COALESCE(pr.user_id, pr.owner_id)
            WHERE pr.deleted_at IS NULL AND p.school_id = s.id
          )
          + (
            SELECT count(*)
            FROM public.achievements a
            JOIN public.profiles p ON p.id = a.user_id
            WHERE p.school_id = s.id
          )
      )
    ), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged s;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_projects(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list projects.';
  END IF;

  WITH enriched AS (
    SELECT pr.*, owner.full_name AS student_name, s.name AS school_name
    FROM public.projects pr
    LEFT JOIN public.profiles owner ON owner.id = COALESCE(pr.user_id, pr.owner_id)
    LEFT JOIN public.schools s ON s.id = owner.school_id
    WHERE pr.deleted_at IS NULL
      AND (
        v_search IS NULL
        OR pr.title ILIKE '%' || v_search || '%'
        OR owner.full_name ILIKE '%' || v_search || '%'
        OR owner.email ILIKE '%' || v_search || '%'
        OR s.name ILIKE '%' || v_search || '%'
      )
  ),
  counted AS (SELECT count(*) AS total FROM enriched),
  paged AS (
    SELECT *
    FROM enriched
    ORDER BY created_at DESC
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged p;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_achievements(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list achievements.';
  END IF;

  WITH enriched AS (
    SELECT a.*, owner.full_name AS student_name, s.name AS school_name
    FROM public.achievements a
    LEFT JOIN public.profiles owner ON owner.id = a.user_id
    LEFT JOIN public.schools s ON s.id = owner.school_id
    WHERE v_search IS NULL
      OR a.title ILIKE '%' || v_search || '%'
      OR owner.full_name ILIKE '%' || v_search || '%'
      OR owner.email ILIKE '%' || v_search || '%'
      OR s.name ILIKE '%' || v_search || '%'
  ),
  counted AS (SELECT count(*) AS total FROM enriched),
  paged AS (
    SELECT *
    FROM enriched
    ORDER BY created_at DESC NULLS LAST
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged a;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_gallery_events(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list gallery events.';
  END IF;

  WITH enriched AS (
    SELECT g.*, owner.full_name AS owner_name, s.name AS school_name
    FROM public.gallery_events g
    LEFT JOIN public.profiles owner ON owner.id = g.user_id
    LEFT JOIN public.schools s ON s.id = owner.school_id
    WHERE g.deleted_at IS NULL
      AND (
        v_search IS NULL
        OR g.title ILIKE '%' || v_search || '%'
        OR owner.full_name ILIKE '%' || v_search || '%'
        OR owner.email ILIKE '%' || v_search || '%'
        OR s.name ILIKE '%' || v_search || '%'
      )
  ),
  counted AS (SELECT count(*) AS total FROM enriched),
  paged AS (
    SELECT *
    FROM enriched
    ORDER BY created_at DESC NULLS LAST
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(to_jsonb(g.*)), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged g;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_smartbuddy_usage(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list SmartBuddy usage.';
  END IF;

  WITH enriched AS (
    SELECT u.*, p.full_name AS user_name, p.email AS user_email, s.name AS school_name
    FROM public.smartbuddy_usage u
    LEFT JOIN public.profiles p ON p.id = u.user_id
    LEFT JOIN public.schools s ON s.id = p.school_id
    WHERE v_search IS NULL
      OR p.full_name ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
      OR s.name ILIKE '%' || v_search || '%'
      OR u.model ILIKE '%' || v_search || '%'
      OR u.personality ILIKE '%' || v_search || '%'
  ),
  counted AS (SELECT count(*) AS total FROM enriched),
  paged AS (
    SELECT *
    FROM enriched
    ORDER BY created_at DESC
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(to_jsonb(u.*)), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged u;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_list_audit_logs(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_page INTEGER := greatest(COALESCE(p_page, 0), 0);
  v_page_size INTEGER := least(greatest(COALESCE(p_page_size, 50), 1), 100);
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  result JSONB;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can list audit logs.';
  END IF;

  WITH enriched AS (
    SELECT l.*, p.full_name AS actor_name, p.email AS actor_email
    FROM public.admin_audit_logs l
    LEFT JOIN public.profiles p ON p.id = l.actor_id
    WHERE v_search IS NULL
      OR l.action ILIKE '%' || v_search || '%'
      OR l.entity_type ILIKE '%' || v_search || '%'
      OR p.full_name ILIKE '%' || v_search || '%'
      OR p.email ILIKE '%' || v_search || '%'
  ),
  counted AS (SELECT count(*) AS total FROM enriched),
  paged AS (
    SELECT *
    FROM enriched
    ORDER BY created_at DESC
    LIMIT v_page_size OFFSET v_page * v_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb),
    'total', (SELECT total FROM counted),
    'page', v_page,
    'pageSize', v_page_size
  )
  INTO result
  FROM paged l;

  RETURN COALESCE(result, jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'page', v_page, 'pageSize', v_page_size));
END;
$$;

-- Anonymous clients should no longer access public base tables directly.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- Keep telemetry/audit direct writes unavailable to browser roles; functions/service role insert.
REVOKE ALL PRIVILEGES ON public.admin_audit_logs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.smartbuddy_usage FROM anon, authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT SELECT ON public.smartbuddy_usage TO authenticated;

-- Public RPCs should not be executable anonymously by default.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_school_connection(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_school_join_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_school_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_school_application(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_school_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_school_connection(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_my_school() TO authenticated;

GRANT EXECUTE ON FUNCTION public.super_admin_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_users(INTEGER, INTEGER, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_schools(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_projects(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_achievements(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_gallery_events(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_smartbuddy_usage(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_audit_logs(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_user_school(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_create_school(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_project_moderation(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_achievement_verification(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_gallery_event_visibility(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_update_ai_governance_settings(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_approve_school_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_reject_school_application(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END;
$$;
