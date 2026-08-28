-- ============================================================================
-- Public student roster (follow-up to student_enrollment.sql)
--
-- The public /schools/:id Students tab needs the real roster (Phase 3), but
-- `profiles` has no anonymous SELECT policy and RLS blocks anon reads. A plain
-- RLS policy would expose the full row (email, contacts, ...) to anonymous
-- users, which violates the FERPA note in the plan (§7.5: public exposure is
-- limited to name + grade).
--
-- This SECURITY DEFINER function exposes ONLY (student_id, full_name,
-- grade_level) for approved students of an approved school, granted to
-- anon + authenticated. Everything else stays behind the existing RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.school_public_roster(p_school_id UUID)
RETURNS TABLE (
  student_id UUID,
  full_name TEXT,
  grade_level TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id AS student_id,
    p.full_name AS full_name,
    p.grade_level AS grade_level
  FROM public.profiles p
  JOIN public.schools s ON s.id = p.school_id
  WHERE p.school_id = p_school_id
    AND p.role = 'student'
    AND p.account_status = 'approved'
    AND s.approval_status = 'approved'
  ORDER BY p.full_name NULLS LAST
$$;

GRANT EXECUTE ON FUNCTION public.school_public_roster(UUID) TO anon, authenticated;
