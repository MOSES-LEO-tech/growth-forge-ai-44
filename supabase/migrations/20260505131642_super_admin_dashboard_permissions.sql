-- Give Super Admin browser sessions live access to platform dashboard data.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE OR REPLACE FUNCTION app_private.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION app_private.current_user_is_super_admin() FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_super_admin() TO authenticated;

DROP POLICY IF EXISTS "super_admin_profiles_select" ON public.profiles;
CREATE POLICY "super_admin_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_profiles_update" ON public.profiles;
CREATE POLICY "super_admin_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_schools_all" ON public.schools;
CREATE POLICY "super_admin_schools_all" ON public.schools
  FOR ALL TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_projects_select" ON public.projects;
CREATE POLICY "super_admin_projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_projects_update" ON public.projects;
CREATE POLICY "super_admin_projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_achievements_select" ON public.achievements;
CREATE POLICY "super_admin_achievements_select" ON public.achievements
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_achievements_update" ON public.achievements;
CREATE POLICY "super_admin_achievements_update" ON public.achievements
  FOR UPDATE TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_recommendations_select" ON public.recommendations;
CREATE POLICY "super_admin_recommendations_select" ON public.recommendations
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_gallery_events_select" ON public.gallery_events;
CREATE POLICY "super_admin_gallery_events_select" ON public.gallery_events
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_gallery_events_update" ON public.gallery_events;
CREATE POLICY "super_admin_gallery_events_update" ON public.gallery_events
  FOR UPDATE TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_gallery_media_select" ON public.gallery_media;
CREATE POLICY "super_admin_gallery_media_select" ON public.gallery_media
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "super_admin_settings_all" ON public.settings;
CREATE POLICY "super_admin_settings_all" ON public.settings
  FOR ALL TO authenticated
  USING (app_private.current_user_is_super_admin())
  WITH CHECK (app_private.current_user_is_super_admin());

INSERT INTO public.settings (key, value, updated_at)
VALUES (
  'ai_governance',
  '{"smartBuddy": true, "recommendations": true, "scholarshipMatching": true, "essayReview": false}'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;
