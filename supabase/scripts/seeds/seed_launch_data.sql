-- =============================================================
-- Growth-Forge-AI: Seed data for production launch
-- Idempotent: safe to re-apply (ON CONFLICT DO NOTHING where supported)
-- =============================================================

-- -------------------------------------------------------------
-- 1) Sample approved schools (so the Schools page has content)
-- -------------------------------------------------------------
INSERT INTO public.schools (id, name, location, country, description, logo_url, cover_url, approval_status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Greenwood High School', 'Kampala', 'Uganda',
   'A leading STEM-focused secondary school preparing students for university and beyond.',
   NULL, NULL, 'approved'),
  ('22222222-2222-2222-2222-222222222222', 'Riverside Academy', 'Nairobi', 'Kenya',
   'Riverside Academy nurtures creativity, leadership, and academic excellence.',
   NULL, NULL, 'approved'),
  ('33333333-3333-3333-3333-333333333333', 'Atlas International School', 'Accra', 'Ghana',
   'Atlas International offers a globally recognized curriculum for students aged 12-18.',
   NULL, NULL, 'approved')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 2) Sample scholarships (linked to schools above)
-- -------------------------------------------------------------
INSERT INTO public.scholarships (id, title, amount, deadline, requirements, school_id)
VALUES
  ('aaaaaaa1-0000-0000-0000-000000000001', 'Greenwood STEM Excellence Scholarship',
   5000, (CURRENT_DATE + INTERVAL '90 days'),
   'Open to students with strong mathematics and science grades.', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaa2-0000-0000-0000-000000000002', 'Riverside Leadership Scholarship',
   3000, (CURRENT_DATE + INTERVAL '120 days'),
   'For students who demonstrate outstanding leadership in their communities.', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaa3-0000-0000-0000-000000000003', 'Atlas Global Citizen Award',
   7500, (CURRENT_DATE + INTERVAL '60 days'),
   'Recognizes students with a record of cross-cultural engagement.', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------------
-- 3) Sample settings (key/value pairs used by frontend)
-- -------------------------------------------------------------
INSERT INTO public.settings (key, value)
VALUES
  ('app.maintenance_mode', 'false'::jsonb),
  ('app.feature_flags', '{"smartbuddy": true, "scholarships": true, "gallery": true}'::jsonb),
  ('app.contact_email', '"support@growthforge.ai"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- -------------------------------------------------------------
-- NOTE about super_admin user:
-- The first super_admin must be promoted manually via the Supabase
-- dashboard or via:
--   UPDATE public.profiles SET role = 'super_admin' WHERE email = '<your-email>';
-- We deliberately do not seed auth.users here because it requires
-- service-role credentials and is a one-time operator action.
-- -------------------------------------------------------------
