ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "school_assets_school_admin_insert" ON storage.objects;
CREATE POLICY "school_assets_school_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'school-assets'
    AND EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND app_private.current_user_is_school_admin(s.id)
    )
  );

DROP POLICY IF EXISTS "school_assets_school_admin_update" ON storage.objects;
CREATE POLICY "school_assets_school_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND app_private.current_user_is_school_admin(s.id)
    )
  )
  WITH CHECK (
    bucket_id = 'school-assets'
    AND EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND app_private.current_user_is_school_admin(s.id)
    )
  );

DROP POLICY IF EXISTS "school_assets_school_admin_delete" ON storage.objects;
CREATE POLICY "school_assets_school_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'school-assets'
    AND EXISTS (
      SELECT 1
      FROM public.schools s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND app_private.current_user_is_school_admin(s.id)
    )
  );

UPDATE public.schools
SET cover_url = COALESCE(
      NULLIF(cover_url, ''),
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80'
    ),
    gallery_urls = CASE
      WHEN COALESCE(array_length(gallery_urls, 1), 0) = 0 THEN ARRAY[
        'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560785496-3c9d27877182?auto=format&fit=crop&w=1200&q=80'
      ]::TEXT[]
      ELSE gallery_urls
    END,
    updated_at = now()
WHERE name = 'Lighthouse STEM Academy';
