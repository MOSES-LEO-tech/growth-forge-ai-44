-- Create table for site settings including hero video
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read site settings
CREATE POLICY "Site settings are publicly readable"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins can modify site settings
CREATE POLICY "Only admins can modify site settings"
ON public.site_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Create storage bucket for hero videos
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true);

-- Storage policies for hero media
CREATE POLICY "Hero media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-media');

CREATE POLICY "Admins can upload hero media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'hero-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update hero media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'hero-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete hero media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'hero-media' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Insert default hero video setting
INSERT INTO public.site_settings (key, value) VALUES ('hero_video_url', NULL);