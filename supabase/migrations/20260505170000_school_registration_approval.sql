-- School registration, approval, and join-code workflow.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_status_allowed;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_status_allowed
  CHECK (account_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_approval_status_allowed;

ALTER TABLE public.schools
  ADD CONSTRAINT schools_approval_status_allowed
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS schools_one_active_per_admin
  ON public.schools(admin_id)
  WHERE admin_id IS NOT NULL AND approval_status <> 'rejected';

CREATE TABLE IF NOT EXISTS public.school_join_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS school_join_codes_active_code_unique
  ON public.school_join_codes (upper(code))
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_school_join_codes_school_id
  ON public.school_join_codes(school_id);

CREATE TABLE IF NOT EXISTS public.school_connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS school_connection_requests_one_pending_per_user
  ON public.school_connection_requests(user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_school_connection_requests_school_status
  ON public.school_connection_requests(school_id, status, requested_at);

ALTER TABLE public.school_join_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_connection_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_private.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'super_admin'
      AND account_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_user_is_school_admin(p_school_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.schools s ON s.id = p_school_id
    WHERE p.id = auth.uid()
      AND p.role::text = 'admin'
      AND p.account_status = 'approved'
      AND p.school_id = p_school_id
      AND s.admin_id = p.id
      AND s.approval_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.current_user_is_teacher_for_school(p_school_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'teacher'
      AND p.account_status = 'approved'
      AND p.school_id = p_school_id
  );
$$;

CREATE OR REPLACE FUNCTION app_private.generate_school_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.school_join_codes
      WHERE upper(code) = candidate
        AND is_active
    );
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.ensure_active_school_code(p_school_id UUID, p_actor UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
BEGIN
  SELECT code INTO existing_code
  FROM public.school_join_codes
  WHERE school_id = p_school_id
    AND is_active
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  new_code := app_private.generate_school_code();

  INSERT INTO public.school_join_codes (school_id, code, created_by)
  VALUES (p_school_id, new_code, p_actor);

  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.guard_profile_sensitive_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF current_setting('app.school_system_bypass', true) = 'on'
     OR app_private.current_user_is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.account_status IS DISTINCT FROM OLD.account_status
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Sensitive profile fields can only be changed through the approval workflow.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_update ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_profile_sensitive_update();

CREATE OR REPLACE FUNCTION app_private.guard_school_sensitive_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF current_setting('app.school_system_bypass', true) = 'on'
     OR app_private.current_user_is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.admin_id IS DISTINCT FROM OLD.admin_id
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Sensitive school fields can only be changed through the approval workflow.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS schools_guard_sensitive_update ON public.schools;
CREATE TRIGGER schools_guard_sensitive_update
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_school_sensitive_update();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requested_role TEXT;
  requested_status TEXT;
  school_name TEXT;
  school_location TEXT;
  school_country TEXT;
  school_description TEXT;
  school_logo_url TEXT;
  join_code TEXT;
  matched_school_id UUID;
BEGIN
  PERFORM set_config('app.school_system_bypass', 'on', true);

  requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
  IF requested_role NOT IN ('student', 'parent', 'teacher', 'admin') THEN
    requested_role := 'student';
  END IF;

  requested_status := CASE
    WHEN requested_role IN ('admin', 'teacher') THEN 'pending'
    ELSE 'approved'
  END;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    account_status,
    approved_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    requested_role,
    requested_status,
    CASE WHEN requested_status = 'approved' THEN now() ELSE NULL END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(public.profiles.email, EXCLUDED.email),
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      updated_at = now();

  INSERT INTO public.student_levels (user_id, points, level, badges)
  VALUES (NEW.id, 0, 1, ARRAY[]::text[])
  ON CONFLICT (user_id) DO NOTHING;

  IF requested_role = 'admin' THEN
    school_name := trim(COALESCE(NEW.raw_user_meta_data->>'school_name', ''));
    school_location := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'school_location', '')), '');
    school_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'school_country', '')), '');
    school_description := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'school_description', '')), '');
    school_logo_url := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'school_logo_url', '')), '');

    IF school_name <> '' THEN
      INSERT INTO public.schools (
        name,
        location,
        country,
        description,
        logo_url,
        admin_id,
        approval_status,
        created_at,
        updated_at
      )
      VALUES (
        school_name,
        school_location,
        school_country,
        school_description,
        school_logo_url,
        NEW.id,
        'pending',
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    ELSE
      UPDATE public.profiles
      SET rejection_reason = 'School admins must register a school before approval.'
      WHERE id = NEW.id;
    END IF;
  END IF;

  IF requested_role = 'teacher' THEN
    join_code := upper(trim(COALESCE(NEW.raw_user_meta_data->>'school_join_code', '')));

    IF join_code <> '' THEN
      SELECT school_id INTO matched_school_id
      FROM public.school_join_codes
      WHERE upper(code) = join_code
        AND is_active
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;

      IF matched_school_id IS NOT NULL THEN
        INSERT INTO public.school_connection_requests (school_id, user_id, role, status)
        VALUES (matched_school_id, NEW.id, 'teacher', 'pending')
        ON CONFLICT DO NOTHING;
      ELSE
        UPDATE public.profiles
        SET rejection_reason = 'The school code entered during signup was not found.'
        WHERE id = NEW.id;
      END IF;
    ELSE
      UPDATE public.profiles
      SET rejection_reason = 'Teachers need a school code from their school admin.'
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.request_school_connection(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  normalized_code TEXT;
  current_profile public.profiles%ROWTYPE;
  matched_school public.schools%ROWTYPE;
  pending_request public.school_connection_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to connect to a school.';
  END IF;

  normalized_code := upper(trim(COALESCE(p_code, '')));
  IF normalized_code = '' THEN
    RAISE EXCEPTION 'Enter a school code.';
  END IF;

  SELECT * INTO current_profile
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_profile.id IS NULL THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF current_profile.role::text NOT IN ('student', 'teacher') THEN
    RAISE EXCEPTION 'Only students and teachers can connect with a school code.';
  END IF;

  SELECT s.* INTO matched_school
  FROM public.school_join_codes c
  JOIN public.schools s ON s.id = c.school_id
  WHERE upper(c.code) = normalized_code
    AND c.is_active
    AND (c.expires_at IS NULL OR c.expires_at > now())
    AND s.approval_status = 'approved'
  LIMIT 1;

  IF matched_school.id IS NULL THEN
    RAISE EXCEPTION 'That school code is invalid or inactive.';
  END IF;

  IF current_profile.school_id = matched_school.id THEN
    RETURN jsonb_build_object('status', 'approved', 'school_id', matched_school.id, 'school_name', matched_school.name);
  END IF;

  SELECT * INTO pending_request
  FROM public.school_connection_requests
  WHERE user_id = current_profile.id
    AND status = 'pending'
  LIMIT 1;

  IF pending_request.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'pending', 'request_id', pending_request.id, 'school_id', pending_request.school_id);
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  INSERT INTO public.school_connection_requests (school_id, user_id, role, status)
  VALUES (matched_school.id, current_profile.id, current_profile.role::text, 'pending')
  RETURNING * INTO pending_request;

  IF current_profile.role::text = 'teacher' THEN
    UPDATE public.profiles
    SET account_status = 'pending',
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = current_profile.id;
  END IF;

  RETURN jsonb_build_object('status', 'pending', 'request_id', pending_request.id, 'school_id', matched_school.id, 'school_name', matched_school.name);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_school_connection(p_code TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.request_school_connection(p_code);
$$;

CREATE OR REPLACE FUNCTION app_private.rotate_school_join_code(p_school_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  target_school public.schools%ROWTYPE;
  new_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  SELECT * INTO actor FROM public.profiles WHERE id = auth.uid();

  IF actor.role::text <> 'admin' OR actor.account_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved school admins can generate school codes.';
  END IF;

  SELECT * INTO target_school
  FROM public.schools
  WHERE id = COALESCE(p_school_id, actor.school_id)
    AND admin_id = actor.id
    AND approval_status = 'approved';

  IF target_school.id IS NULL THEN
    RAISE EXCEPTION 'Approved school not found for this admin.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.school_join_codes
  SET is_active = false,
      updated_at = now()
  WHERE school_id = target_school.id
    AND is_active;

  new_code := app_private.generate_school_code();

  INSERT INTO public.school_join_codes (school_id, code, created_by)
  VALUES (target_school.id, new_code, actor.id);

  RETURN jsonb_build_object('school_id', target_school.id, 'code', new_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_school_join_code(p_school_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.rotate_school_join_code(p_school_id);
$$;

CREATE OR REPLACE FUNCTION app_private.approve_school_application(p_school_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_school public.schools%ROWTYPE;
  new_code TEXT;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can approve schools.';
  END IF;

  SELECT * INTO target_school
  FROM public.schools
  WHERE id = p_school_id
  FOR UPDATE;

  IF target_school.id IS NULL THEN
    RAISE EXCEPTION 'School not found.';
  END IF;

  IF target_school.admin_id IS NULL THEN
    RAISE EXCEPTION 'School does not have an admin.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.schools
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = target_school.id;

  UPDATE public.profiles
  SET school_id = target_school.id,
      account_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now(),
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = target_school.admin_id;

  new_code := app_private.ensure_active_school_code(target_school.id, auth.uid());

  RETURN jsonb_build_object('school_id', target_school.id, 'admin_id', target_school.admin_id, 'code', new_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_school_application(p_school_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.approve_school_application(p_school_id);
$$;

CREATE OR REPLACE FUNCTION app_private.reject_school_application(p_school_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_school public.schools%ROWTYPE;
  reason TEXT;
BEGIN
  IF NOT app_private.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can reject schools.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');

  SELECT * INTO target_school
  FROM public.schools
  WHERE id = p_school_id
  FOR UPDATE;

  IF target_school.id IS NULL THEN
    RAISE EXCEPTION 'School not found.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.schools
  SET approval_status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  WHERE id = target_school.id;

  IF target_school.admin_id IS NOT NULL THEN
    UPDATE public.profiles
    SET account_status = 'rejected',
        rejection_reason = COALESCE(reason, 'School registration was rejected.'),
        updated_at = now()
    WHERE id = target_school.admin_id
      AND role::text = 'admin';
  END IF;

  RETURN jsonb_build_object('school_id', target_school.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_school_application(p_school_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.reject_school_application(p_school_id, p_reason);
$$;

CREATE OR REPLACE FUNCTION app_private.approve_school_connection(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_request public.school_connection_requests%ROWTYPE;
BEGIN
  SELECT * INTO target_request
  FROM public.school_connection_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending connection request not found.';
  END IF;

  IF NOT app_private.current_user_is_school_admin(target_request.school_id) THEN
    RAISE EXCEPTION 'Only this school admin can approve the request.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.school_connection_requests
  SET status = 'approved',
      decided_by = auth.uid(),
      decided_at = now(),
      rejection_reason = NULL
  WHERE id = target_request.id;

  UPDATE public.profiles
  SET school_id = target_request.school_id,
      account_status = CASE WHEN role::text = 'teacher' THEN 'approved' ELSE account_status END,
      approved_by = CASE WHEN role::text = 'teacher' THEN auth.uid() ELSE approved_by END,
      approved_at = CASE WHEN role::text = 'teacher' THEN now() ELSE approved_at END,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = target_request.user_id
    AND role::text IN ('student', 'teacher');

  RETURN jsonb_build_object('request_id', target_request.id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_school_connection(p_request_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.approve_school_connection(p_request_id);
$$;

CREATE OR REPLACE FUNCTION app_private.reject_school_connection(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  target_request public.school_connection_requests%ROWTYPE;
  reason TEXT;
BEGIN
  SELECT * INTO target_request
  FROM public.school_connection_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF target_request.id IS NULL THEN
    RAISE EXCEPTION 'Pending connection request not found.';
  END IF;

  IF NOT app_private.current_user_is_school_admin(target_request.school_id) THEN
    RAISE EXCEPTION 'Only this school admin can reject the request.';
  END IF;

  reason := NULLIF(trim(COALESCE(p_reason, '')), '');

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.school_connection_requests
  SET status = 'rejected',
      decided_by = auth.uid(),
      decided_at = now(),
      rejection_reason = COALESCE(reason, 'School connection request was rejected.')
  WHERE id = target_request.id;

  IF target_request.role = 'teacher' THEN
    UPDATE public.profiles
    SET account_status = 'rejected',
        rejection_reason = COALESCE(reason, 'School connection request was rejected.'),
        updated_at = now()
    WHERE id = target_request.user_id
      AND school_id IS NULL;
  END IF;

  RETURN jsonb_build_object('request_id', target_request.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_school_connection(p_request_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.reject_school_connection(p_request_id, p_reason);
$$;

CREATE OR REPLACE FUNCTION app_private.disconnect_my_school()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM set_config('app.school_system_bypass', 'on', true);

  UPDATE public.profiles
  SET school_id = NULL,
      updated_at = now()
  WHERE id = auth.uid()
    AND role::text = 'student';

  UPDATE public.school_connection_requests
  SET status = 'rejected',
      decided_at = now(),
      rejection_reason = 'Student disconnected from school.'
  WHERE user_id = auth.uid()
    AND status = 'pending';

  RETURN jsonb_build_object('status', 'independent');
END;
$$;

CREATE OR REPLACE FUNCTION public.disconnect_my_school()
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.disconnect_my_school();
$$;

DROP POLICY IF EXISTS "Only admins can modify schools" ON public.schools;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

DROP POLICY IF EXISTS "school_admin_schools_update" ON public.schools;
CREATE POLICY "school_admin_schools_update" ON public.schools
  FOR UPDATE TO authenticated
  USING (app_private.current_user_is_school_admin(id))
  WITH CHECK (app_private.current_user_is_school_admin(id));

DROP POLICY IF EXISTS "school_join_codes_admin_select" ON public.school_join_codes;
CREATE POLICY "school_join_codes_admin_select" ON public.school_join_codes
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
  );

DROP POLICY IF EXISTS "school_connection_requests_own_select" ON public.school_connection_requests;
CREATE POLICY "school_connection_requests_own_select" ON public.school_connection_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
  );

DROP POLICY IF EXISTS "profiles_school_admin_select" ON public.profiles;
CREATE POLICY "profiles_school_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    school_id IS NOT NULL
    AND app_private.current_user_is_school_admin(school_id)
  );

DROP POLICY IF EXISTS "profiles_teacher_select_school_students" ON public.profiles;
CREATE POLICY "profiles_teacher_select_school_students" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    role::text = 'student'
    AND account_status = 'approved'
    AND school_id IS NOT NULL
    AND app_private.current_user_is_teacher_for_school(school_id)
  );

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_school_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.current_user_is_teacher_for_school(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_school_connection(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_school_join_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_school_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_school_application(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_school_connection(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_school_connection(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disconnect_my_school() TO authenticated;

UPDATE public.profiles
SET account_status = 'approved',
    approved_at = COALESCE(approved_at, now())
WHERE account_status IS NULL
   OR account_status NOT IN ('pending', 'approved', 'rejected');

UPDATE public.schools
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE approval_status IS NULL
   OR approval_status NOT IN ('pending', 'approved', 'rejected');
