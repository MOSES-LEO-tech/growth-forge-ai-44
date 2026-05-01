-- Dashboard schema repair
-- Creates the app tables that are missing in some Supabase environments and
-- relaxes legacy drift that was blocking student dashboard QA data.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('student', 'parent', 'teacher', 'admin', 'super_admin');
  ELSE
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'student';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  grade_level TEXT,
  gpa NUMERIC,
  interests TEXT[],
  extracurriculars TEXT[],
  role public.user_role NOT NULL DEFAULT 'student',
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gpa NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extracurriculars TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.student_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS public.student_levels_user_id_unique;
CREATE UNIQUE INDEX student_levels_user_id_unique
  ON public.student_levels(user_id);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  date_earned DATE,
  verified BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS date_earned DATE;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  media_urls TEXT[],
  status TEXT DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  skills_tracked JSONB DEFAULT '{}'::jsonb,
  verified BOOLEAN DEFAULT false,
  collaborators UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS media_urls TEXT[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS skills_tracked JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS collaborators UUID[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.projects ALTER COLUMN start_date DROP NOT NULL;

UPDATE public.projects
SET owner_id = user_id
WHERE owner_id IS NULL
  AND user_id IS NOT NULL;

UPDATE public.projects
SET user_id = owner_id
WHERE user_id IS NULL
  AND owner_id IS NOT NULL;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'status'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.projects ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE public.projects ALTER COLUMN status TYPE TEXT USING status::text;
  END IF;

  ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'pending';

  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.projects DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.projects'::regclass
      AND conname = 'projects_status_allowed'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_status_allowed
      CHECK (
        status IS NULL OR status IN (
          'pending', 'ongoing', 'complete',
          'draft', 'new', 'not_started',
          'in_progress', 'active',
          'completed', 'done'
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC,
  deadline DATE,
  requirements TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IS NULL OR type IN ('scholarship', 'profile', 'actions')),
  content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gallery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.gallery_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'events'
  ) THEN
    CREATE VIEW public.events AS
      SELECT id, user_id, title, description, location, event_date, is_public, created_at, deleted_at
      FROM public.gallery_events;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.gallery_events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IS NULL OR type IN ('image', 'video', 'document')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.gallery_media ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE public.gallery_media ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.gallery_media ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.gallery_media ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.gallery_media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  resource_type TEXT,
  resource_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_events_user_id ON public.gallery_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_events_public ON public.gallery_events(is_public) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_gallery_media_event_id ON public.gallery_media(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_comments_resource ON public.comments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent ON public.parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child ON public.parent_child_links(child_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'events'
      AND c.relkind IN ('r', 'p')
  ) THEN
    ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'schools' AND policyname = 'schools_select_public') THEN
    CREATE POLICY "schools_select_public" ON public.schools FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'student_levels' AND policyname = 'student_levels_owner_all') THEN
    CREATE POLICY "student_levels_owner_all" ON public.student_levels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'achievements' AND policyname = 'achievements_owner_all') THEN
    CREATE POLICY "achievements_owner_all" ON public.achievements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_owner_select') THEN
    CREATE POLICY "projects_owner_select" ON public.projects FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = user_id OR auth.uid() = ANY(collaborators));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_owner_insert') THEN
    CREATE POLICY "projects_owner_insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = owner_id OR auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_owner_update') THEN
    CREATE POLICY "projects_owner_update" ON public.projects FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = user_id) WITH CHECK (auth.uid() = owner_id OR auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_owner_delete') THEN
    CREATE POLICY "projects_owner_delete" ON public.projects FOR DELETE USING (auth.uid() = owner_id OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scholarships' AND policyname = 'scholarships_select_public') THEN
    CREATE POLICY "scholarships_select_public" ON public.scholarships FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recommendations' AND policyname = 'recommendations_owner_all') THEN
    CREATE POLICY "recommendations_owner_all" ON public.recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_events' AND policyname = 'gallery_events_owner_or_public_select') THEN
    CREATE POLICY "gallery_events_owner_or_public_select" ON public.gallery_events FOR SELECT USING (is_public IS TRUE OR auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_events' AND policyname = 'gallery_events_owner_insert') THEN
    CREATE POLICY "gallery_events_owner_insert" ON public.gallery_events FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_events' AND policyname = 'gallery_events_owner_update') THEN
    CREATE POLICY "gallery_events_owner_update" ON public.gallery_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_events' AND policyname = 'gallery_events_owner_delete') THEN
    CREATE POLICY "gallery_events_owner_delete" ON public.gallery_events FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_media' AND policyname = 'gallery_media_owner_or_public_select') THEN
    CREATE POLICY "gallery_media_owner_or_public_select" ON public.gallery_media FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.gallery_events e
        WHERE e.id = gallery_media.event_id
          AND (e.is_public IS TRUE OR e.user_id = auth.uid())
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_media' AND policyname = 'gallery_media_owner_insert') THEN
    CREATE POLICY "gallery_media_owner_insert" ON public.gallery_media FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.gallery_events e
        WHERE e.id = gallery_media.event_id
          AND e.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_media' AND policyname = 'gallery_media_owner_update') THEN
    CREATE POLICY "gallery_media_owner_update" ON public.gallery_media FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.gallery_events e
        WHERE e.id = gallery_media.event_id
          AND e.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.gallery_events e
        WHERE e.id = gallery_media.event_id
          AND e.user_id = auth.uid()
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_media' AND policyname = 'gallery_media_owner_delete') THEN
    CREATE POLICY "gallery_media_owner_delete" ON public.gallery_media FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.gallery_events e
        WHERE e.id = gallery_media.event_id
          AND e.user_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_owner_all') THEN
    CREATE POLICY "notifications_owner_all" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_participant_select') THEN
    CREATE POLICY "messages_participant_select" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_sender_insert') THEN
    CREATE POLICY "messages_sender_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_participant_update') THEN
    CREATE POLICY "messages_participant_update" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id) WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_authenticated_select') THEN
    CREATE POLICY "comments_authenticated_select" ON public.comments FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_owner_insert') THEN
    CREATE POLICY "comments_owner_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_owner_update') THEN
    CREATE POLICY "comments_owner_update" ON public.comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'comments_owner_delete') THEN
    CREATE POLICY "comments_owner_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'parent_child_links' AND policyname = 'parent_child_links_participant_all') THEN
    CREATE POLICY "parent_child_links_participant_all" ON public.parent_child_links FOR ALL USING (auth.uid() = parent_id OR auth.uid() = child_id) WITH CHECK (auth.uid() = parent_id OR auth.uid() = child_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_select_public') THEN
    CREATE POLICY "settings_select_public" ON public.settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'settings_write_authenticated') THEN
    CREATE POLICY "settings_write_authenticated" ON public.settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
