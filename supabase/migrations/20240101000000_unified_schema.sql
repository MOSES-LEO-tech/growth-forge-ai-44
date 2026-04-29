-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  grade_level TEXT,
  gpa DECIMAL(3,2),
  interests TEXT[],
  extracurriculars TEXT[],
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','parent','teacher','admin','super_admin')),
  school_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schools
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from profiles to schools after schools exist
ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS profiles_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

-- Student levels (gamification)
CREATE TABLE IF NOT EXISTS student_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  date_earned DATE,
  verified BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  media_urls TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','ongoing','complete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Scholarships
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount DECIMAL(10,2),
  deadline DATE,
  requirements TEXT,
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('scholarship','profile','actions')),
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery Events (renamed to events)
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Gallery Media
CREATE TABLE IF NOT EXISTS public.gallery_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('image','video','document')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Trigger to auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO student_levels (user_id, points, level, badges)
  VALUES (NEW.id, 0, 1, ARRAY[]::text[])
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS)
-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view student profiles in their school' AND tablename = 'profiles') THEN
        CREATE POLICY "Teachers can view student profiles in their school" ON profiles FOR SELECT
          USING (EXISTS (
            SELECT 1 FROM profiles viewer
            WHERE viewer.id = auth.uid()
            AND viewer.role = 'teacher'
            AND viewer.school_id = profiles.school_id
          ));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
        CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
          USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own projects' AND tablename = 'projects') THEN
        CREATE POLICY "Users manage own projects" ON projects FOR ALL USING (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers view school student projects' AND tablename = 'projects') THEN
        CREATE POLICY "Teachers view school student projects" ON projects FOR SELECT
          USING (EXISTS (
            SELECT 1 FROM profiles teacher, profiles student
            WHERE teacher.id = auth.uid() AND teacher.role = 'teacher'
            AND student.id = projects.owner_id
            AND student.school_id = teacher.school_id
          ));
    END IF;
END $$;

-- Schools
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can view schools' AND tablename = 'schools') THEN
        CREATE POLICY "Anyone authenticated can view schools" ON schools FOR SELECT
          TO authenticated USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can modify schools' AND tablename = 'schools') THEN
        CREATE POLICY "Only admins can modify schools" ON schools FOR ALL
          USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Scholarships
ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone authenticated can view scholarships' AND tablename = 'scholarships') THEN
        CREATE POLICY "Anyone authenticated can view scholarships" ON scholarships FOR SELECT
          TO authenticated USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can modify scholarships' AND tablename = 'scholarships') THEN
        CREATE POLICY "Only admins can modify scholarships" ON scholarships FOR ALL
          USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own achievements' AND tablename = 'achievements') THEN
        CREATE POLICY "Users manage own achievements" ON achievements FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Student Levels
ALTER TABLE student_levels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own level' AND tablename = 'student_levels') THEN
        CREATE POLICY "Users view own level" ON student_levels FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Recommendations
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own recommendations' AND tablename = 'recommendations') THEN
        CREATE POLICY "Users view own recommendations" ON recommendations FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Gallery Events (now 'events')
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Users can manage own events
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own events' AND tablename = 'events') THEN
        CREATE POLICY "Users manage own events" ON public.events FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- Anyone can view public events (non-deleted)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view public events' AND tablename = 'events') THEN
        CREATE POLICY "Anyone can view public events" ON public.events FOR SELECT
          USING (is_public = TRUE AND deleted_at IS NULL);
    END IF;
END $$;

-- Gallery Media
ALTER TABLE public.gallery_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Event owner manages media' AND tablename = 'gallery_media') THEN
        CREATE POLICY "Event owner manages media" ON public.gallery_media FOR ALL
          USING (EXISTS (
            SELECT 1 FROM public.events WHERE id = gallery_media.event_id AND user_id = auth.uid()
          ));
    END IF;
END $$;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  resource_type TEXT,
  resource_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Parent-Child links
CREATE TABLE IF NOT EXISTS parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Parents can view own links' AND tablename = 'parent_child_links') THEN
        CREATE POLICY "Parents can view own links" ON parent_child_links FOR SELECT
          USING (auth.uid() = parent_id);
    END IF;
END $$;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own messages' AND tablename = 'messages') THEN
        CREATE POLICY "Users can view own messages" ON messages FOR SELECT
          USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages' AND tablename = 'messages') THEN
        CREATE POLICY "Users can send messages" ON messages FOR INSERT
          WITH CHECK (auth.uid() = sender_id);
    END IF;
END $$;

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view comments on accessible resources' AND tablename = 'comments') THEN
        CREATE POLICY "Anyone can view comments on accessible resources" ON comments FOR SELECT
          USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can post comments' AND tablename = 'comments') THEN
        CREATE POLICY "Users can post comments" ON comments FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view settings' AND tablename = 'settings') THEN
        CREATE POLICY "Anyone can view settings" ON settings FOR SELECT USING (TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can modify settings' AND tablename = 'settings') THEN
        CREATE POLICY "Only admins can modify settings" ON settings FOR ALL
          USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- Seed data
INSERT INTO schools (name, location, description) VALUES
  ('Greenfield International Academy', 'London, UK', 'A leading international school focused on holistic education'),
  ('Nairobi STEM High School', 'Nairobi, Kenya', 'East Africa''s premier STEM-focused secondary school'),
  ('Cape Town Arts Academy', 'Cape Town, South Africa', 'Nurturing creative talent across the arts');

INSERT INTO scholarships (title, amount, deadline, requirements) VALUES
  ('African Excellence Scholarship', 25000, '2025-06-30', 'Open to African students with GPA above 3.5'),
  ('STEM Women Initiative', 15000, '2025-05-15', 'For female students pursuing STEM careers'),
  ('Young Leaders Award', 10000, '2025-07-31', 'For students demonstrating outstanding leadership');
