-- ========================================================
-- Supabase PWA Baseline Migration
-- Created: 2026-04-29
-- Purpose: Unified schema for PWA + Super Admin features
-- ========================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('student', 'parent', 'teacher', 'admin', 'super_admin');
    ELSE
        -- Add super_admin if it doesn't exist in the enum
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('pending', 'ongoing', 'complete');
    END IF;
END $$;

-- 2. PROFILES TABLE
-- Create profiles table if it doesn't exist (basic structure from unified_schema)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    grade_level TEXT,
    gpa DECIMAL(3,2),
    interests TEXT[],
    extracurriculars TEXT[],
    role public.user_role NOT NULL DEFAULT 'student',
    school_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure email column exists (added in PWA migration, may be missing from older schema)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Copy email from auth.users if null (for existing rows)
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL
  AND au.email IS NOT NULL;

-- Create unique index for non-null emails (for partial uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
    ON public.profiles(email)
    WHERE email IS NOT NULL;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. SCHOOLS TABLE
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROJECTS TABLE (with owner_id)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    media_urls TEXT[],
    status public.project_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    date_earned DATE,
    verified BOOLEAN DEFAULT FALSE,
    certificate_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SCHOLARSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.scholarships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    amount DECIMAL(10,2),
    deadline DATE,
    requirements TEXT,
    school_id UUID REFERENCES public.schools(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPER ADMIN PROMOTION FUNCTION
CREATE OR REPLACE FUNCTION public.promote_super_admin_by_email(admin_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE email = admin_email;
END;
$$;

-- 8. TRIGGER FOR NEW USER (comprehensive: profiles, student_levels, user_roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert/update profile
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

  -- Ensure student_levels exists
  INSERT INTO public.student_levels (user_id, points, level, badges)
  VALUES (new.id, 0, 1, ARRAY[]::text[])
  ON CONFLICT (user_id) DO NOTHING;

  -- Attempt to insert into user_roles if table/enum exist (ignore errors if missing)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      new.id,
      COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN
      NULL;
    WHEN undefined_object THEN
      NULL;
  END;

  RETURN new;
END;
$$;

-- Drop and recreate trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
