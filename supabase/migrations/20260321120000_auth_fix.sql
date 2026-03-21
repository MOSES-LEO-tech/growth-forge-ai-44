-- ============================================
-- MIGRATION: Fix Supabase Auth Issues
-- Created: 2026-03-21
-- Purpose: Fix login/account creation issues
-- ============================================

-- ============================================
-- STEP 1: Add email column to profiles table
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Copy email from auth.users if available
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND au.email IS NOT NULL;

-- Add unique constraint on email (nullable)
-- This allows multiple NULLs but prevents duplicates
-- Note: We can't add UNIQUE directly on nullable column without allowing NULLs
-- So we'll create a partial unique index instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique 
ON public.profiles(email) 
WHERE email IS NOT NULL;

-- ============================================
-- STEP 2: Fix and enhance the handle_new_user trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile with email from auth.users
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  -- Create student_levels if doesn't exist
  INSERT INTO public.student_levels (user_id, points, level, badges)
  VALUES (new.id, 0, 1, ARRAY[]::text[])
  ON CONFLICT (user_id) DO NOTHING;

  -- Also add to user_roles table if exists and has the right structure
  -- This is a best-effort insert - will silently fail if table doesn't exist
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      new.id,
      COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      -- Table doesn't exist, ignore
      NULL;
  END;

  RETURN new;
END;
$$;

-- ============================================
-- STEP 3: Add RLS policies for profiles
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles in their school" ON public.profiles;

-- SELECT - Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT - Users can insert their own profile (mainly for trigger)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE - Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin policies (if has_role function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE 'CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), ''admin''))';
    EXECUTE 'CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), ''admin''))';
  END IF;
END
$$;

-- Teachers can view student profiles in their school
CREATE POLICY "Teachers can view student profiles in their school" ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles viewer
    WHERE viewer.id = auth.uid()
    AND viewer.role = 'teacher'
    AND viewer.school_id = profiles.school_id
  ));

-- ============================================
-- STEP 4: Add RLS policies for parent_child_links
-- ============================================

ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Parents view own links" ON public.parent_child_links;

-- SELECT - parents can view their links
CREATE POLICY "Parents view own links"
  ON public.parent_child_links FOR SELECT
  USING (auth.uid() = parent_id);

-- SELECT - students can view their links
CREATE POLICY "Students view own links"
  ON public.parent_child_links FOR SELECT
  USING (auth.uid() = child_id);

-- INSERT - parents can create links
CREATE POLICY "Parents can create links"
  ON public.parent_child_links FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- DELETE - parents can delete their links
CREATE POLICY "Parents can delete links"
  ON public.parent_child_links FOR DELETE
  USING (auth.uid() = parent_id);

-- ============================================
-- STEP 5: Ensure auth.users is accessible
-- ============================================
-- Note: auth.users is managed by Supabase and typically accessible 
-- to authenticated users via their JWT claims

-- ============================================
-- STEP 6: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent ON public.parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child ON public.parent_child_links(child_id);

-- ============================================
-- STEP 7: Grant necessary permissions
-- ============================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;

-- ============================================
-- STEP 8: Fix scholarships table schema if needed
-- ============================================

-- The unified_schema creates scholarships with fewer columns
-- Check if description column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scholarships' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.scholarships ADD COLUMN description TEXT;
  END IF;
END
$$;

-- ============================================
-- STEP 9: Ensure storage buckets exist
-- ============================================

-- Create avatars bucket if not exists
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('avatars', 'avatars', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create avatars storage policies
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner can delete" ON storage.objects;

CREATE POLICY "Avatar upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar owner can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- END OF MIGRATION
-- ============================================
