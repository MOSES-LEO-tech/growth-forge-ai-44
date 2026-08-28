-- School public page: hero media + curated gallery managed from the CMS.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS hero_video_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER;

CREATE TABLE IF NOT EXISTS public.school_gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_gallery_media_school_order_idx
  ON public.school_gallery_media (school_id, sort_order);

-- Backfill existing schools.gallery_urls as image rows (runs only when empty).
INSERT INTO public.school_gallery_media (school_id, url, media_type, caption, sort_order)
SELECT s.id, u.url, 'image', NULL, u.ord - 1
FROM public.schools s
CROSS JOIN LATERAL unnest(COALESCE(s.gallery_urls, ARRAY[]::text[])) WITH ORDINALITY AS u(url, ord)
WHERE u.url IS NOT NULL AND u.url <> ''
  AND NOT EXISTS (SELECT 1 FROM public.school_gallery_media LIMIT 1);

ALTER TABLE public.school_gallery_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_gallery_media_public_read" ON public.school_gallery_media;
CREATE POLICY "school_gallery_media_public_read" ON public.school_gallery_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.id = school_id AND s.approval_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "school_gallery_media_admin_manage" ON public.school_gallery_media;
CREATE POLICY "school_gallery_media_admin_manage" ON public.school_gallery_media
  FOR ALL TO authenticated
  USING (app_private.current_user_is_school_admin(school_id))
  WITH CHECK (app_private.current_user_is_school_admin(school_id));

-- Allow video uploads and larger files for hero/gallery media.
UPDATE storage.buckets
SET file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
WHERE id = 'school-assets';
