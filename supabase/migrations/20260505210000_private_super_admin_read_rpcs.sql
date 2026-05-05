-- Keep sensitive Super Admin reads out of direct authenticated table grants.

CREATE OR REPLACE FUNCTION app_private.super_admin_dashboard_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.super_admin_dashboard_summary()
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_dashboard_summary();
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_list_smartbuddy_usage(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.super_admin_list_smartbuddy_usage(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_list_smartbuddy_usage(p_page, p_page_size, p_search);
$$;

CREATE OR REPLACE FUNCTION app_private.super_admin_list_audit_logs(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.super_admin_list_audit_logs(
  p_page INTEGER DEFAULT 0,
  p_page_size INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.super_admin_list_audit_logs(p_page, p_page_size, p_search);
$$;

REVOKE ALL PRIVILEGES ON public.admin_audit_logs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.smartbuddy_usage FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.settings FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.events FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION app_private.super_admin_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.super_admin_list_smartbuddy_usage(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.super_admin_list_audit_logs(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_dashboard_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_smartbuddy_usage(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_audit_logs(INTEGER, INTEGER, TEXT) TO authenticated;
