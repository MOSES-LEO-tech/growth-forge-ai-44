-- New feature tables for schools, galleries, hall of fame, yearbooks,
-- SmartBuddy conversation history, and persisted AI recommendations
-- Safe to run multiple times (IF NOT EXISTS) and RLS included

-- ========== Enums (scoped) ==========
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'school_role') THEN
    CREATE TYPE public.school_role AS ENUM ('admin', 'teacher', 'student', 'parent');
  END IF;
END $$;

-- ========== School Memberships ==========
CREATE TABLE IF NOT EXISTS public.school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.school_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);

ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;

-- Users can see memberships they belong to; admins can see all
CREATE POLICY IF NOT EXISTS "Memberships: user can view own memberships"
  ON public.school_memberships FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can join themselves; admins can manage all
CREATE POLICY IF NOT EXISTS "Memberships: user can insert self"
  ON public.school_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users can update their own membership; admins can manage all
CREATE POLICY IF NOT EXISTS "Memberships: user can update own"
  ON public.school_memberships FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ========== School Galleries ==========
CREATE TABLE IF NOT EXISTS public.school_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Galleries: anyone can view"
  ON public.school_galleries FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Galleries: authenticated can create"
  ON public.school_galleries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY IF NOT EXISTS "Galleries: admins manage all"
  ON public.school_galleries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.school_gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.school_galleries(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL, -- image/png, video/mp4, etc
  caption TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Gallery items: anyone can view"
  ON public.school_gallery_items FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Gallery items: authenticated can insert"
  ON public.school_gallery_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY IF NOT EXISTS "Gallery items: admins manage all"
  ON public.school_gallery_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== Hall of Fame ==========
CREATE TABLE IF NOT EXISTS public.hall_of_fame_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  achievement_date DATE,
  media_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hall_of_fame_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "HOF: view approved or own"
  ON public.hall_of_fame_entries FOR SELECT
  USING (approved = true OR auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY IF NOT EXISTS "HOF: authenticated can propose"
  ON public.hall_of_fame_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY IF NOT EXISTS "HOF: student can update own until approved"
  ON public.hall_of_fame_entries FOR UPDATE TO authenticated
  USING ((auth.uid() = student_id AND approved = false) OR public.has_role(auth.uid(), 'admin'));

-- Auto update updated_at
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public._set_updated_at()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END; $$;
EXCEPTION WHEN others THEN NULL; END $$;

DROP TRIGGER IF EXISTS set_hof_updated_at ON public.hall_of_fame_entries;
CREATE TRIGGER set_hof_updated_at BEFORE UPDATE ON public.hall_of_fame_entries
FOR EACH ROW EXECUTE FUNCTION public._set_updated_at();

-- ========== Yearbooks ==========
CREATE TABLE IF NOT EXISTS public.yearbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  year INT NOT NULL,
  storage_path TEXT NOT NULL, -- path within 'yearbooks' bucket
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, year)
);

ALTER TABLE public.yearbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Yearbooks: everyone can view"
  ON public.yearbooks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Yearbooks: authenticated can insert"
  ON public.yearbooks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY IF NOT EXISTS "Yearbooks: admins manage all"
  ON public.yearbooks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== SmartBuddy Conversation History ==========
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personality TEXT NOT NULL DEFAULT 'default',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Chats: user can view own"
  ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Chats: user can manage own"
  ON public.chat_conversations FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_chat_conv_updated_at ON public.chat_conversations;
CREATE TRIGGER set_chat_conv_updated_at BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public._set_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Chat messages: user can view own conversation"
  ON public.chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY IF NOT EXISTS "Chat messages: user can insert into own conversation"
  ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

-- ========== Persisted AI Recommendations ==========
CREATE TABLE IF NOT EXISTS public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('project','skill','activity')),
  priority TEXT NOT NULL CHECK (priority IN ('high','medium','low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Recommendations: user can view own"
  ON public.user_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Recommendations: user can insert own"
  ON public.user_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Recommendations: admins can view all"
  ON public.user_recommendations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));


