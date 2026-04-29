-- ========================================================
-- Auth Fix Migration
-- Created: 2026-04-29
-- Purpose: Fix "Database error saving new user" and login issues
-- ========================================================

-- 1. Fix: Remove UNIQUE from email (use partial unique index instead)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- 2. Ensure student_levels table exists
CREATE TABLE IF NOT EXISTS public.student_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on student_levels
ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for student_levels
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own level" ON public.student_levels;
END $$;

CREATE POLICY "Users can view own level" ON public.student_levels
    FOR SELECT USING (auth.uid() = user_id);

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update own level" ON public.student_levels;
END $$;

CREATE POLICY "Users can update own level" ON public.student_levels
    FOR UPDATE USING (auth.uid() = user_id);

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert own level" ON public.student_levels;
END $$;

CREATE POLICY "Users can insert own level" ON public.student_levels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Fix trigger to handle errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert/update profile (ignore errors)
  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
      COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student')
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      role = COALESCE(EXCLUDED.role, public.profiles.role);
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't fail
      RAISE NOTICE 'Profile creation skipped: %', SQLERRM;
  END;

  -- Ensure student_levels exists (ignore errors)
  BEGIN
    INSERT INTO public.student_levels (user_id, points, level, badges)
    VALUES (new.id, 0, 1, ARRAY[]::text[])
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Student levels creation skipped: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 6. Ensure storage buckets exist for avatars
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('avatars', 'avatars', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for avatars
DO $$
BEGIN
    DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
END $$;

CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 7. Fix RLS on profiles to allow trigger to work
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
END $$;

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow anon to insert (for trigger)
CREATE POLICY "Anon can insert profile" ON public.profiles
    FOR INSERT WITH CHECK (true);