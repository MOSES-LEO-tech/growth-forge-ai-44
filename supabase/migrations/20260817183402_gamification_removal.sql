-- Gamification removal (P0)
-- Removes the student_levels table (points/level/badges) and stops the
-- signup trigger from writing gamification rows. Academic `achievements`
-- table, its RPCs, and policies are untouched.

-- 1. Drop the gamification table (cascades indexes, RLS policies, constraints)
DROP TABLE IF EXISTS public.student_levels CASCADE;

-- 2. Recreate the signup trigger without the student_levels insert.
--    Mirrors the live definition from 20260505170000_school_registration_approval.sql.
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

-- Keep the existing grants for the recreated function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
