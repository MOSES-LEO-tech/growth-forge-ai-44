-- Create students table to track total student accounts
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  grade_level TEXT,
  school_name TEXT,
  graduation_year INTEGER,
  major_interest TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Students policies
CREATE POLICY "Students can view their own record"
  ON public.students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update their own record"
  ON public.students FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all student records"
  ON public.students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create a function to automatically insert into students table when a new student profile is created
CREATE OR REPLACE FUNCTION public.handle_new_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.students (id, profile_id, grade_level)
    VALUES (NEW.id, NEW.id, NEW.grade_level);
  END IF;
  RETURN NEW;
END;
$$;

-- Create a trigger to call the function after a new profile is inserted
CREATE TRIGGER on_new_student_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student_profile();

-- Create a view to easily count total students
CREATE OR REPLACE VIEW public.student_counts AS
SELECT
  count(*) AS total_students,
  count(CASE WHEN is_active = TRUE THEN 1 END) AS active_students,
  count(CASE WHEN is_active = FALSE THEN 1 END) AS inactive_students
FROM public.students;

-- Grant access to the view
GRANT SELECT ON public.student_counts TO authenticated;
GRANT SELECT ON public.student_counts TO service_role;