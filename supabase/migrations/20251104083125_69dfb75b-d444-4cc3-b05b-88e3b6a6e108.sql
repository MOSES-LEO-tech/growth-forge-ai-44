-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('project-files', 'project-files', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']),
  ('gallery-media', 'gallery-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- RLS policies for project-files bucket
CREATE POLICY "Users can upload their own project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own project files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all project files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'project-files' AND has_role(auth.uid(), 'admin'));

-- RLS policies for gallery-media bucket
CREATE POLICY "Authenticated users can upload gallery media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-media');

CREATE POLICY "Everyone can view gallery media"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery-media');

CREATE POLICY "Users can update media they uploaded"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete media they uploaded"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage all gallery media"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'gallery-media' AND has_role(auth.uid(), 'admin'));

-- RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Everyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  established_year INTEGER,
  student_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Schools RLS policies
CREATE POLICY "Everyone can view schools"
ON public.schools FOR SELECT
USING (true);

CREATE POLICY "Admins can manage schools"
ON public.schools FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create ai_response_cache table
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(cache_key)
);

-- Enable RLS on ai_response_cache
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- AI cache RLS policies
CREATE POLICY "Users can view their own cache"
ON public.ai_response_cache FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert cache"
ON public.ai_response_cache FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update cache"
ON public.ai_response_cache FOR UPDATE
TO authenticated
USING (true);

-- Trigger for schools updated_at
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();