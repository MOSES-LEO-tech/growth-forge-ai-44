-- Create table for site settings including hero video
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Allow anyone to read site settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Site settings are publicly readable' AND tablename = 'site_settings') THEN
        CREATE POLICY "Site settings are publicly readable" ON public.site_settings FOR SELECT USING (true);
    END IF;

    -- Only admins can modify site settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can modify site settings' AND tablename = 'site_settings') THEN
        CREATE POLICY "Only admins can modify site settings" ON public.site_settings FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
          )
        );
    END IF;
END $$;

-- Create storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('hero-media', 'hero-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hero media
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Hero media is publicly accessible' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Hero media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'hero-media');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload hero media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Admins can upload hero media" ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = 'hero-media' 
          AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update hero media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Admins can update hero media" ON storage.objects FOR UPDATE
        USING (
          bucket_id = 'hero-media' 
          AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
          )
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete hero media' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Admins can delete hero media" ON storage.objects FOR DELETE
        USING (
          bucket_id = 'hero-media' 
          AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
          )
        );
    END IF;
END $$;

-- Insert default hero video setting
INSERT INTO public.site_settings (key, value) 
VALUES ('hero_video_url', NULL)
ON CONFLICT (key) DO NOTHING;
