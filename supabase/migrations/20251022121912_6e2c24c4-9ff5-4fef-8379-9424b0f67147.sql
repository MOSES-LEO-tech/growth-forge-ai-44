-- Create scholarships table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on scholarships
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Anyone can view scholarships
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view scholarships' AND tablename = 'scholarships') THEN
        CREATE POLICY "Anyone can view scholarships" ON public.scholarships FOR SELECT USING (true);
    END IF;

    -- Admins can manage scholarships
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage scholarships' AND tablename = 'scholarships') THEN
        CREATE POLICY "Admins can manage scholarships" ON public.scholarships FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Create trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scholarships_updated_at') THEN
        CREATE TRIGGER update_scholarships_updated_at BEFORE UPDATE ON public.scholarships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- Create scholarship_applications table
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scholarship_id UUID REFERENCES public.scholarships(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);

-- Enable RLS on scholarship_applications
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Users can view their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can view their own applications" ON public.scholarship_applications FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Users can create their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can create their own applications" ON public.scholarship_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can update their own applications" ON public.scholarship_applications FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Admins can view all applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Admins can view all applications" ON public.scholarship_applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Create trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_scholarship_applications_updated_at') THEN
        CREATE TRIGGER update_scholarship_applications_updated_at BEFORE UPDATE ON public.scholarship_applications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
