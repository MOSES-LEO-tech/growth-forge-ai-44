INSERT INTO storage.buckets (id, name, public) 
VALUES
  ('avatars', 'avatars', TRUE),
  ('project-media', 'project-media', FALSE),
  ('gallery-media', 'gallery-media', FALSE)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Avatar images are publicly accessible'
    ) THEN
        CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
          FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can upload their own avatar'
    ) THEN
        CREATE POLICY "Users can upload their own avatar" ON storage.objects
          FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can access own project media'
    ) THEN
        CREATE POLICY "Users can access own project media" ON storage.objects
          FOR ALL USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can access own gallery media'
    ) THEN
        CREATE POLICY "Users can access own gallery media" ON storage.objects
          FOR ALL USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public gallery media is accessible'
    ) THEN
        CREATE POLICY "Public gallery media is accessible" ON storage.objects
          FOR SELECT USING (bucket_id = 'gallery-media');
    END IF;
END $$;
