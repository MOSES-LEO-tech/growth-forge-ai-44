CREATE OR REPLACE FUNCTION app_private.current_user_can_manage_school_asset(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage, app_private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.schools school_row
    WHERE school_row.id::text = (storage.foldername(p_object_name))[1]
      AND app_private.current_user_is_school_admin(school_row.id)
  );
$$;

GRANT EXECUTE ON FUNCTION app_private.current_user_can_manage_school_asset(TEXT) TO authenticated;

DROP POLICY IF EXISTS "school_assets_school_admin_insert" ON storage.objects;
CREATE POLICY "school_assets_school_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND app_private.current_user_can_manage_school_asset(name)
  );

DROP POLICY IF EXISTS "school_assets_school_admin_update" ON storage.objects;
CREATE POLICY "school_assets_school_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND app_private.current_user_can_manage_school_asset(name)
  )
  WITH CHECK (
    bucket_id = 'school-assets'
    AND app_private.current_user_can_manage_school_asset(name)
  );

DROP POLICY IF EXISTS "school_assets_school_admin_delete" ON storage.objects;
CREATE POLICY "school_assets_school_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND app_private.current_user_can_manage_school_asset(name)
  );
