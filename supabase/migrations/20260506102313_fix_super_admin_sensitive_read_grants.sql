-- Allow legacy/cached Super Admin dashboard clients to reach sensitive read tables
-- through the Data API while RLS keeps the rows Super Admin-only.
GRANT SELECT ON TABLE public.smartbuddy_usage TO authenticated;
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;

DROP POLICY IF EXISTS "smartbuddy_usage_owner_or_super_admin_select" ON public.smartbuddy_usage;
DROP POLICY IF EXISTS "smartbuddy_usage_super_admin_select" ON public.smartbuddy_usage;
CREATE POLICY "smartbuddy_usage_super_admin_select" ON public.smartbuddy_usage
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

DROP POLICY IF EXISTS "admin_audit_logs_super_admin_select" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_super_admin_select" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (app_private.current_user_is_super_admin());

-- Settings are intentionally public-readable app configuration; RLS already has
-- public SELECT policies, so the grants make that policy reachable via REST.
GRANT SELECT ON TABLE public.settings TO anon, authenticated;
