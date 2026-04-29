-- Create enum types for roles and status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('student', 'parent', 'teacher', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE public.project_status AS ENUM ('pending', 'ongoing', 'complete');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_type') THEN
        CREATE TYPE public.skill_type AS ENUM ('teamwork', 'leadership', 'problem_solving', 'creativity', 'communication', 'technical');
    END IF;
END $$;

-- Create profiles table with role and age-based personalization
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  age INTEGER,
  grade_level TEXT,
  school_id TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Create parent-student relationships table
CREATE TABLE IF NOT EXISTS public.parent_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'mother', 'father', 'guardian'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

ALTER TABLE public.parent_student_relationships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their relationships' AND tablename = 'parent_student_relationships') THEN
        CREATE POLICY "Parents can view their relationships" ON public.parent_student_relationships FOR SELECT USING (auth.uid() = parent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can view their parent relationships' AND tablename = 'parent_student_relationships') THEN
        CREATE POLICY "Students can view their parent relationships" ON public.parent_student_relationships FOR SELECT USING (auth.uid() = student_id);
    END IF;
END $$;

-- Create events table (matches types.ts and frontend usage)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
DO $$
BEGIN
    -- Users can view their own events or public events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own events' AND tablename = 'events') THEN
        CREATE POLICY "Users can view own events" ON public.events FOR SELECT
          USING (auth.uid() = user_id OR is_public = TRUE);
    END IF;

    -- Authenticated users can create events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create events' AND tablename = 'events') THEN
        CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update their own events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own events' AND tablename = 'events') THEN
        CREATE POLICY "Users can update own events" ON public.events FOR UPDATE
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_is_public_created_at ON public.events(is_public, created_at DESC) WHERE is_public = TRUE;

-- Create media gallery table
CREATE TABLE IF NOT EXISTS public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'video'
  uploaded_by UUID REFERENCES public.profiles(id),
  verified BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view verified media' AND tablename = 'media_items') THEN
        CREATE POLICY "Anyone can view verified media" ON public.media_items FOR SELECT USING (verified = true OR auth.uid() = uploaded_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload media' AND tablename = 'media_items') THEN
        CREATE POLICY "Authenticated users can upload media" ON public.media_items FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
    END IF;
END $$;

-- Create projects table with skill tracking
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status public.project_status NOT NULL DEFAULT 'pending',
  skills_tracked JSONB DEFAULT '{}',
  media_id UUID REFERENCES public.media_items(id),
  verified BOOLEAN DEFAULT false,
  collaborators UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add/debug owner_id column (renamed from legacy 'user_id')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'owner_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE public.projects RENAME COLUMN user_id TO owner_id;
        ELSE
            ALTER TABLE public.projects ADD COLUMN owner_id UUID;
        END IF;
    END IF;

    -- Make NOT NULL and add FK if not already present
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'projects' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE public.projects
          ALTER COLUMN owner_id SET NOT NULL,
          ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own projects' AND tablename = 'projects') THEN
        CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = ANY(collaborators));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own projects' AND tablename = 'projects') THEN
        CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own projects' AND tablename = 'projects') THEN
        CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = owner_id);
    END IF;
END $$;

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'academic', 'sports', 'arts', 'leadership', 'community'
  date_earned DATE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  media_id UUID REFERENCES public.media_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Users can view their own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view their children''s achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Parents can view their children's achievements" ON public.achievements FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.parent_student_relationships
              WHERE parent_id = auth.uid() AND student_id = achievements.user_id
            )
          );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Users can create their own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
        CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_events_updated_at') THEN
        CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_projects_updated_at') THEN
        CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
