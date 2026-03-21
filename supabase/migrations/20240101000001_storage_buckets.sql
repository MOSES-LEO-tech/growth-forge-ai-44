INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', TRUE),
  ('project-media', 'project-media', FALSE),
  ('gallery-media', 'gallery-media', FALSE);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access own project media" ON storage.objects
  FOR ALL USING (bucket_id = 'project-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access own gallery media" ON storage.objects
  FOR ALL USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Public gallery media is accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery-media');
