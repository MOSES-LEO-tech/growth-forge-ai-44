-- Consolidated schema for TRAE Platform (run in Supabase SQL Editor)
-- Order: types -> core tables -> policies -> functions/triggers -> extensions -> storage buckets/policies -> additional tables -> adjustments

-- ========== Enums ==========
CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('student', 'parent', 'teacher', 'admin');
CREATE TYPE IF NOT EXISTS public.project_status AS ENUM ('pending', 'ongoing', 'complete');
CREATE TYPE IF NOT EXISTS public.skill_type AS ENUM ('teamwork', 'leadership', 'problem_solving', 'creativity', 'communication', 'technical');
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'teacher', 'student', 'parent');

-- ========== Core Tables & RLS ==========
-- profiles
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- parent_student_relationships
CREATE TABLE IF NOT EXISTS public.parent_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);
ALTER TABLE public.parent_student_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Parents can view their relationships"
  ON public.parent_student_relationships FOR SELECT USING (auth.uid() = parent_id);
CREATE POLICY IF NOT EXISTS "Students can view their parent relationships"
  ON public.parent_student_relationships FOR SELECT USING (auth.uid() = student_id);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view verified events"
  ON public.events FOR SELECT USING (verified = true OR auth.uid() = created_by);
CREATE POLICY IF NOT EXISTS "Authenticated users can create events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);

-- media_items
CREATE TABLE IF NOT EXISTS public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  verified BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view verified media"
  ON public.media_items FOR SELECT USING (verified = true OR auth.uid() = uploaded_by);
CREATE POLICY IF NOT EXISTS "Authenticated users can upload media"
  ON public.media_items FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own projects"
  ON public.projects FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = ANY(collaborators));
CREATE POLICY IF NOT EXISTS "Users can create their own projects"
  ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY IF NOT EXISTS "Users can update their own projects"
  ON public.projects FOR UPDATE USING (auth.uid() = owner_id);

-- achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  date_earned DATE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  media_id UUID REFERENCES public.media_items(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own achievements"
  ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Parents can view their children's achievements"
  ON public.achievements FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_student_relationships
      WHERE parent_id = auth.uid() AND student_id = achievements.user_id
    )
  );
CREATE POLICY IF NOT EXISTS "Users can create their own achievements"
  ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== Role Management ==========
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS elevated access (admin)
CREATE POLICY IF NOT EXISTS "Admins can view all profiles"
  ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can update all profiles"
  ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "Admins can manage all achievements"
  ON public.achievements FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can manage all events"
  ON public.events FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can view all projects"
  ON public.projects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can manage all projects"
  ON public.projects FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can view all relationships"
  ON public.parent_student_relationships FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "Admins can manage all relationships"
  ON public.parent_student_relationships FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ========== Scholarships ==========
CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2),
  deadline DATE NOT NULL,
  eligibility_criteria JSONB DEFAULT '{}',
  requirements TEXT[],
  application_url TEXT,
  organization TEXT NOT NULL,
  tags TEXT[],
  grade_levels TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can view scholarships"
  ON public.scholarships FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admins can manage scholarships"
  ON public.scholarships FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholarship_id UUID REFERENCES public.scholarships(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected')),
  applied_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own applications"
  ON public.scholarship_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can create their own applications"
  ON public.scholarship_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own applications"
  ON public.scholarship_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Admins can view all applications"
  ON public.scholarship_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ========== Functions & Triggers ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  );
  RETURN new;
END;$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========== Storage Buckets & Policies ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('project-files', 'project-files', true, 52428800, ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png','image/gif','video/mp4','video/quicktime']),
  ('gallery-media', 'gallery-media', true, 52428800, ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/x-msvideo']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/gif','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- project-files policies
CREATE POLICY IF NOT EXISTS "Users can upload their own project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Users can view their own project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Users can update their own project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Users can delete their own project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Admins can manage all project files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'project-files' AND has_role(auth.uid(), 'admin'));

-- gallery-media policies
CREATE POLICY IF NOT EXISTS "Authenticated users can upload gallery media"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-media');
CREATE POLICY IF NOT EXISTS "Everyone can view gallery media"
ON storage.objects FOR SELECT USING (bucket_id = 'gallery-media');
CREATE POLICY IF NOT EXISTS "Users can update media they uploaded"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Users can delete media they uploaded"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'gallery-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Admins can manage all gallery media"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'gallery-media' AND has_role(auth.uid(), 'admin'));

-- avatars policies
CREATE POLICY IF NOT EXISTS "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Everyone can view avatars"
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY IF NOT EXISTS "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY IF NOT EXISTS "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========== Schools & AI Cache ==========
CREATE TABLE IF NOT EXISTS public.schools (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- final schema adjustments below will add/remove columns
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  established_year INTEGER,
  student_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Everyone can view schools"
ON public.schools FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Admins can manage schools"
ON public.schools FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(cache_key)
);
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view their own cache"
ON public.ai_response_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "System can insert cache"
ON public.ai_response_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "System can update cache"
ON public.ai_response_cache FOR UPDATE TO authenticated USING (true);

-- updated_at trigger for schools
DROP TRIGGER IF EXISTS update_schools_updated_at ON public.schools;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========== Final Adjustments (Latest Migration) ==========
-- Schools final columns
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS user_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hall_of_fame JSONB,
  ADD COLUMN IF NOT EXISTS yearbooks JSONB,
  ADD COLUMN IF NOT EXISTS gallery JSONB;

-- Drop legacy columns if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'contact_email') THEN
    ALTER TABLE public.schools DROP COLUMN contact_email;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'contact_phone') THEN
    ALTER TABLE public.schools DROP COLUMN contact_phone;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'website_url') THEN
    ALTER TABLE public.schools DROP COLUMN website_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'established_year') THEN
    ALTER TABLE public.schools DROP COLUMN established_year;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schools' AND column_name = 'verified') THEN
    ALTER TABLE public.schools DROP COLUMN verified;
  END IF;
END $$;

-- AI cache final column names
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_response_cache' AND column_name = 'cache_key') THEN
    ALTER TABLE public.ai_response_cache RENAME COLUMN cache_key TO query;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_response_cache' AND column_name = 'response_data') THEN
    ALTER TABLE public.ai_response_cache RENAME COLUMN response_data TO response;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_response_cache' AND column_name = 'expires_at') THEN
    ALTER TABLE public.ai_response_cache DROP COLUMN expires_at;
  END IF;
END $$;

-- Yearbooks bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('yearbooks', 'yearbooks', true)
ON CONFLICT (id) DO NOTHING;