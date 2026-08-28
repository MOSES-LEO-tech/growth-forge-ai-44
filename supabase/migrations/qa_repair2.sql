-- ============================================================================
-- QA repair #2 (Phase 4): restore proper student display data for QA Demo School.
--
-- QA finding: handle_new_user creates student profiles with full_name falling
-- back to the email address when signup provides no name; qa_seed.sql's
-- profiles INSERT was skipped by ON CONFLICT DO NOTHING. Result: roster,
-- public Students tab, and CSV export all showed the email as the name
-- (FERPA exposure on the public tab). This resets full_name + grade/class on
-- both profiles and enrollments to the spec values (plan §7.4 sample roster).
-- Idempotent; keyed on the fixed QA emails. Brian's enrollment stays
-- 'graduated' (the target state set during the enrollment-change QA step).
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

  UPDATE public.profiles p
  SET full_name  = CASE p.email
                     WHEN 'student.qa+1@example.com' THEN 'Alice Amani'
                     WHEN 'student.qa+2@example.com' THEN 'Brian Bakka'
                     WHEN 'student.qa+3@example.com' THEN 'Chloe Chanda'
                     WHEN 'student.qa+4@example.com' THEN 'David Dlamini'
                     WHEN 'student.qa+5@example.com' THEN 'Eva Ejang'
                     WHEN 'student.qa+6@example.com' THEN 'Frank Fudu'
                   END,
      grade_level = CASE p.email
                     WHEN 'student.qa+1@example.com' THEN 'Grade 9'
                     WHEN 'student.qa+2@example.com' THEN 'Grade 9'
                     WHEN 'student.qa+3@example.com' THEN 'Grade 10'
                     WHEN 'student.qa+4@example.com' THEN 'Grade 11'
                     WHEN 'student.qa+5@example.com' THEN 'Grade 12'
                     WHEN 'student.qa+6@example.com' THEN 'Grade 9'
                   END,
      class_name  = CASE p.email
                     WHEN 'student.qa+1@example.com' THEN 'Section A'
                     WHEN 'student.qa+2@example.com' THEN 'Section A'
                     WHEN 'student.qa+3@example.com' THEN 'Section B'
                     WHEN 'student.qa+4@example.com' THEN 'Section A'
                     WHEN 'student.qa+5@example.com' THEN 'Section B'
                     WHEN 'student.qa+6@example.com' THEN 'Section A'
                   END,
      updated_at = now()
  WHERE p.school_id = v_school
    AND p.email LIKE 'student.qa+%@example.com';

  UPDATE public.enrollments e
  SET grade_level = CASE p.email
                      WHEN 'student.qa+1@example.com' THEN 'Grade 9'
                      WHEN 'student.qa+2@example.com' THEN 'Grade 9'
                      WHEN 'student.qa+3@example.com' THEN 'Grade 10'
                      WHEN 'student.qa+4@example.com' THEN 'Grade 11'
                      WHEN 'student.qa+5@example.com' THEN 'Grade 12'
                      WHEN 'student.qa+6@example.com' THEN 'Grade 9'
                    END,
      class_name  = CASE p.email
                      WHEN 'student.qa+1@example.com' THEN 'Section A'
                      WHEN 'student.qa+2@example.com' THEN 'Section A'
                      WHEN 'student.qa+3@example.com' THEN 'Section B'
                      WHEN 'student.qa+4@example.com' THEN 'Section A'
                      WHEN 'student.qa+5@example.com' THEN 'Section B'
                      WHEN 'student.qa+6@example.com' THEN 'Section A'
                    END,
      updated_at = now()
  FROM public.profiles p
  WHERE e.student_id = p.id
    AND e.school_id = v_school
    AND p.email LIKE 'student.qa+%@example.com';
END $$;
