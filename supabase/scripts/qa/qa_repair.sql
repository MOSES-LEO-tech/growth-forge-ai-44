-- ============================================================================
-- QA repair (Phase 4): link the 6 QA student profiles to QA Demo School.
--
-- Root cause: handle_new_user (trigger on auth.users INSERT) created these
-- profiles first with school_id = NULL (student default: no school). The
-- qa_seed.sql profiles INSERT then hit ON CONFLICT (id) DO NOTHING and was
-- skipped, leaving the students unattached. Enrollments already reference
-- them (FK ok). This UPDATE attaches them + sets grade/class (guard bypassed
-- via the standard app.school_system_bypass pattern). Idempotent.
-- ============================================================================

DO $$
DECLARE
  v_school UUID;
BEGIN
  SELECT id INTO v_school FROM public.schools WHERE name = 'QA Demo School' LIMIT 1;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'QA school not found';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.profiles
  SET school_id    = v_school,
      grade_level  = CASE email
                       WHEN 'student.qa+1@example.com' THEN 'Grade 9'
                       WHEN 'student.qa+2@example.com' THEN 'Grade 9'
                       WHEN 'student.qa+3@example.com' THEN 'Grade 10'
                       WHEN 'student.qa+4@example.com' THEN 'Grade 11'
                       WHEN 'student.qa+5@example.com' THEN 'Grade 12'
                       WHEN 'student.qa+6@example.com' THEN 'Grade 9'
                     END,
      class_name   = CASE email
                       WHEN 'student.qa+1@example.com' THEN 'Section A'
                       WHEN 'student.qa+2@example.com' THEN 'Section A'
                       WHEN 'student.qa+3@example.com' THEN 'Section B'
                       WHEN 'student.qa+4@example.com' THEN 'Section A'
                       WHEN 'student.qa+5@example.com' THEN 'Section B'
                       WHEN 'student.qa+6@example.com' THEN 'Section A'
                     END,
      approved_at  = now(),
      updated_at   = now()
  WHERE email LIKE 'student.qa+%@example.com'
    AND role::text = 'student'
    AND school_id IS DISTINCT FROM v_school;
END $$;
