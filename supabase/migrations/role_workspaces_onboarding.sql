-- Role-based workspaces: onboarding + role-specific settings support.
-- Adds education-system, onboarding-completion, and notification-preference
-- fields to profiles, plus a parent -> student link RPC used during parent
-- onboarding. Reuses the app_private SECURITY DEFINER + public wrapper
-- convention.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_system TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Parent links to an approved student account by the student's email.
CREATE OR REPLACE FUNCTION app_private.link_parent_to_student_by_email(p_student_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_student_id UUID;
  v_parent_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  v_parent_id := auth.uid();

  SELECT p.id INTO v_student_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(p_student_email))
    AND p.role = 'student'
    AND p.account_status = 'approved';

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'No approved student account found with that email.';
  END IF;

  IF v_student_id = v_parent_id THEN
    RAISE EXCEPTION 'You cannot link your own account.';
  END IF;

  INSERT INTO public.parent_child_links (parent_id, child_id)
  VALUES (v_parent_id, v_student_id)
  ON CONFLICT (parent_id, child_id) DO NOTHING;

  RETURN jsonb_build_object('child_id', v_student_id, 'status', 'linked');
END;
$$;

CREATE OR REPLACE FUNCTION public.link_parent_to_student_by_email(p_student_email TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.link_parent_to_student_by_email(p_student_email);
$$;

GRANT EXECUTE ON FUNCTION app_private.link_parent_to_student_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_parent_to_student_by_email(TEXT) TO authenticated;
