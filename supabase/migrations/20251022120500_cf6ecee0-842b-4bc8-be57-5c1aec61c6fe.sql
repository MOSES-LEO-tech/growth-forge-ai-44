-- Create app_role enum for proper role management
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student', 'parent');
    END IF;
END $$;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        INSERT INTO public.user_roles (user_id, role)
        SELECT id, role::text::app_role
        FROM public.profiles
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- RLS Policies for user_roles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own roles' AND tablename = 'user_roles') THEN
        CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all roles' AND tablename = 'user_roles') THEN
        CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update profiles RLS policies to allow admin access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update achievements RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Admins can view all achievements" ON public.achievements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Admins can manage all achievements" ON public.achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update events RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all events' AND tablename = 'events') THEN
        CREATE POLICY "Admins can manage all events" ON public.events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update media_items RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all media' AND tablename = 'media_items') THEN
        CREATE POLICY "Admins can manage all media" ON public.media_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update projects RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all projects' AND tablename = 'projects') THEN
        CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all projects' AND tablename = 'projects') THEN
        CREATE POLICY "Admins can manage all projects" ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Update parent_student_relationships RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all relationships' AND tablename = 'parent_student_relationships') THEN
        CREATE POLICY "Admins can view all relationships" ON public.parent_student_relationships FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all relationships' AND tablename = 'parent_student_relationships') THEN
        CREATE POLICY "Admins can manage all relationships" ON public.parent_student_relationships FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;
