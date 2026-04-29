-- ========================================================
-- RLS Fix - Remove Infinite Recursion
-- Created: 2026-04-29
-- ========================================================

-- Drop all problematic RLS policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles in their school" ON public.profiles;
DROP POLICY IF EXISTS "Anon can insert profile" ON public.profiles;

-- Simple RLS: Allow anyone authenticated to view/update their own profile
-- Using auth.uid() directly without subqueries to avoid recursion
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple SELECT policy
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Simple INSERT policy
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Simple UPDATE policy
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow service_role to do anything (for admin functions)
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO authenticated;