-- ============================================================================
-- QA seed for Phase 4 Playwright sweep (approved plan §8/§9.9)
--
-- Approves the QA school + admin created via UI signup, links the admin to the
-- school (mirrors app_private.approve_school_application), ensures an active
-- join code, and seeds QA students/enrollments plus published CMS content so
-- the full sweep (roster, CSV import, public rendering) has data.
--
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING; safe to re-apply.
-- ============================================================================

DO $$
DECLARE
  v_admin_id   UUID := '0069eda0-1ddb-4d28-b7c3-997b813c491c'; -- admin.qa+20260821@example.com
  v_school_id  UUID;
  v_student_1  UUID := '10000000-0000-0000-0000-000000000001';
  v_student_2  UUID := '10000000-0000-0000-0000-000000000002';
  v_student_3  UUID := '10000000-0000-0000-0000-000000000003';
  v_student_4  UUID := '10000000-0000-0000-0000-000000000004';
  v_student_5  UUID := '10000000-0000-0000-0000-000000000005';
  v_student_6  UUID := '10000000-0000-0000-0000-000000000006';
  v_instance   UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Locate the QA school created during signup.
  SELECT id INTO v_school_id
  FROM public.schools
  WHERE admin_id = v_admin_id AND name = 'QA Demo School'
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'QA school not found for admin %', v_admin_id;
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  -- 1) Approve school + admin profile, link admin to school (mirror approve_school_application).
  UPDATE public.schools
  SET approval_status = 'approved', approved_at = now(), updated_at = now()
  WHERE id = v_school_id;

  UPDATE public.profiles
  SET school_id = v_school_id,
      account_status = 'approved',
      approved_at = now(),
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = v_admin_id;

  -- Ensure an active join code (used by the invite-CSV path).
  PERFORM app_private.ensure_active_school_code(v_school_id, v_admin_id);

  -- 2) QA student auth users (test-only; email confirmation auto-confirmed).
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_student_1, v_instance, 'authenticated', 'authenticated', 'student.qa+1@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now()),
    (v_student_2, v_instance, 'authenticated', 'authenticated', 'student.qa+2@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now()),
    (v_student_3, v_instance, 'authenticated', 'authenticated', 'student.qa+3@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now()),
    (v_student_4, v_instance, 'authenticated', 'authenticated', 'student.qa+4@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now()),
    (v_student_5, v_instance, 'authenticated', 'authenticated', 'student.qa+5@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now()),
    (v_student_6, v_instance, 'authenticated', 'authenticated', 'student.qa+6@example.com', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"student"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    ('student.qa+1@example.com', v_student_1, jsonb_build_object('sub', v_student_1::text, 'email', 'student.qa+1@example.com'), 'email', now(), now(), now()),
    ('student.qa+2@example.com', v_student_2, jsonb_build_object('sub', v_student_2::text, 'email', 'student.qa+2@example.com'), 'email', now(), now(), now()),
    ('student.qa+3@example.com', v_student_3, jsonb_build_object('sub', v_student_3::text, 'email', 'student.qa+3@example.com'), 'email', now(), now(), now()),
    ('student.qa+4@example.com', v_student_4, jsonb_build_object('sub', v_student_4::text, 'email', 'student.qa+4@example.com'), 'email', now(), now(), now()),
    ('student.qa+5@example.com', v_student_5, jsonb_build_object('sub', v_student_5::text, 'email', 'student.qa+5@example.com'), 'email', now(), now(), now()),
    ('student.qa+6@example.com', v_student_6, jsonb_build_object('sub', v_student_6::text, 'email', 'student.qa+6@example.com'), 'email', now(), now(), now())
  ON CONFLICT DO NOTHING;

  -- 3) Student profiles (approved so they appear on the public roster; name+grade only).
  INSERT INTO public.profiles (id, email, full_name, role, account_status, school_id, grade_level, class_name, approved_at, created_at, updated_at)
  VALUES
    (v_student_1, 'student.qa+1@example.com', 'Alice Amani',     'student', 'approved', v_school_id, 'Grade 9',  'Section A', now(), now(), now()),
    (v_student_2, 'student.qa+2@example.com', 'Brian Bakka',     'student', 'approved', v_school_id, 'Grade 9',  'Section A', now(), now(), now()),
    (v_student_3, 'student.qa+3@example.com', 'Chloe Chanda',    'student', 'approved', v_school_id, 'Grade 10', 'Section B', now(), now(), now()),
    (v_student_4, 'student.qa+4@example.com', 'David Dlamini',   'student', 'approved', v_school_id, 'Grade 11', 'Section A', now(), now(), now()),
    (v_student_5, 'student.qa+5@example.com', 'Eva Ejang',       'student', 'approved', v_school_id, 'Grade 12', 'Section B', now(), now(), now()),
    (v_student_6, 'student.qa+6@example.com', 'Frank Fudu',      'student', 'approved', v_school_id, 'Grade 9',  'Section A', now(), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- 4) Enrollments (varied statuses so roster status filters are exercisable).
  INSERT INTO public.enrollments (school_id, student_id, grade_level, class_name, school_year, status, enrolled_at, exited_at, created_by)
  VALUES
    (v_school_id, v_student_1, 'Grade 9',  'Section A', '2026-2027', 'active',    now() - interval '120 days', NULL, v_admin_id),
    (v_school_id, v_student_2, 'Grade 9',  'Section A', '2026-2027', 'active',    now() - interval '100 days', NULL, v_admin_id),
    (v_school_id, v_student_3, 'Grade 10', 'Section B', '2026-2027', 'active',    now() - interval '80 days',  NULL, v_admin_id),
    (v_school_id, v_student_4, 'Grade 11', 'Section A', '2026-2027', 'active',    now() - interval '60 days',  NULL, v_admin_id),
    (v_school_id, v_student_5, 'Grade 12', 'Section B', '2026-2027', 'withdrawn', now() - interval '200 days', now() - interval '10 days', v_admin_id),
    (v_school_id, v_student_6, 'Grade 9',  'Section A', '2026-2027', 'pending',   now(), NULL, v_admin_id)
  ON CONFLICT (school_id, student_id, school_year) DO NOTHING;

  -- 5) Published CMS content so public rendering is immediately verifiable.
  INSERT INTO public.cms_pages (id, school_id, slug, title, content, status, reviewed_by, reviewed_at, published_at, published_by, created_by, created_at, updated_at)
  VALUES ('30000000-0000-0000-0000-000000000001', v_school_id, 'about', 'About QA Demo School',
          'QA Demo School is a demonstration institution used for automated testing. This content is published from the CMS.',
          'published', v_admin_id, now(), now(), v_admin_id, v_admin_id, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cms_news (id, school_id, title, body, audience, status, featured, publish_at, reviewed_by, reviewed_at, published_at, published_by, created_by, created_at, updated_at)
  VALUES ('30000000-0000-0000-0000-000000000002', v_school_id, 'QA Demo Announcement',
          'Welcome to QA Demo School. This news item was seeded for the automated QA sweep.',
          'public', 'published', true, now() - interval '1 day', v_admin_id, now(), now(), v_admin_id, v_admin_id, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cms_events (id, school_id, title, description, location, event_date, audience, status, reviewed_by, reviewed_at, published_at, published_by, created_by, created_at, updated_at)
  VALUES ('30000000-0000-0000-0000-000000000003', v_school_id, 'QA Demo Open Day',
          'Tour the campus and meet the teachers.', 'Main Hall', now() + interval '7 days',
          'public', 'published', v_admin_id, now(), now(), v_admin_id, v_admin_id, now(), now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.cms_resources (id, school_id, title, description, category, file_url, file_type, file_size, tags, status, reviewed_by, reviewed_at, published_at, published_by, created_by, created_at, updated_at)
  VALUES ('30000000-0000-0000-0000-000000000004', v_school_id, 'QA Demo Handbook',
          'Student handbook for QA Demo School.', 'Documents',
          'https://example.com/qa-handbook.pdf', 'application/pdf', 102400, ARRAY['handbook'],
          'published', v_admin_id, now(), now(), v_admin_id, v_admin_id, now(), now())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'QA seed complete for school %', v_school_id;
END $$;
