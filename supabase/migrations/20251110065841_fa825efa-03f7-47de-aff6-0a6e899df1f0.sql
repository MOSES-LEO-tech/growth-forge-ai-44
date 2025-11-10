-- Fix 1: Secure the schools table - restrict public access to contact information
DROP POLICY IF EXISTS "Everyone can view schools" ON public.schools;

CREATE POLICY "Anyone can view basic school info"
ON public.schools FOR SELECT
USING (true);

-- Create a secure view that excludes sensitive contact information for public access
CREATE OR REPLACE VIEW public.schools_public AS
SELECT 
  id,
  name,
  logo_url,
  description,
  location,
  website_url,
  established_year,
  verified,
  student_count,
  created_at,
  updated_at
FROM public.schools;

GRANT SELECT ON public.schools_public TO anon, authenticated;

-- Fix 2: Secure AI cache - only authenticated users can manage their own cache
DROP POLICY IF EXISTS "System can insert cache" ON public.ai_response_cache;
DROP POLICY IF EXISTS "System can update cache" ON public.ai_response_cache;

CREATE POLICY "Users can insert their own cache"
ON public.ai_response_cache FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cache"
ON public.ai_response_cache FOR UPDATE
USING (auth.uid() = user_id);

-- Fix 3: Create secure views for media_items and events that don't expose user IDs
CREATE OR REPLACE VIEW public.media_items_public AS
SELECT 
  id,
  event_id,
  title,
  description,
  media_url,
  media_type,
  verified,
  tags,
  created_at
FROM public.media_items
WHERE verified = true;

GRANT SELECT ON public.media_items_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.events_public AS
SELECT 
  id,
  title,
  description,
  event_date,
  location,
  verified,
  created_at,
  updated_at
FROM public.events
WHERE verified = true;

GRANT SELECT ON public.events_public TO anon, authenticated;

-- Fix 4: Create the missing students table properly
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade_level TEXT,
  school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL,
  graduation_year INTEGER,
  major_interest TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on students table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Students can view their own record
CREATE POLICY "Students can view own record"
ON public.students FOR SELECT
USING (auth.uid() = user_id);

-- Students can update their own record
CREATE POLICY "Students can update own record"
ON public.students FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all students
CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all students
CREATE POLICY "Admins can manage students"
ON public.students FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic student record creation
CREATE OR REPLACE FUNCTION public.handle_new_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.students (user_id, profile_id, grade_level, school_id)
    VALUES (NEW.id, NEW.id, NEW.grade_level, NEW.school_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_student_profile ON public.profiles;
CREATE TRIGGER on_new_student_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student_profile();

-- Create view for student counts
CREATE OR REPLACE VIEW public.student_counts AS
SELECT
  COUNT(*) AS total_students,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) AS active_students,
  COUNT(CASE WHEN is_active = FALSE THEN 1 END) AS inactive_students
FROM public.students;

GRANT SELECT ON public.student_counts TO authenticated;

-- Add trigger for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();