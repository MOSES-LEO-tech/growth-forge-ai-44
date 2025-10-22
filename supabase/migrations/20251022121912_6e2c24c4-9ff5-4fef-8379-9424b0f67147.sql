-- Create scholarships table
CREATE TABLE public.scholarships (
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

-- Anyone can view scholarships
CREATE POLICY "Anyone can view scholarships"
ON public.scholarships
FOR SELECT
USING (true);

-- Admins can manage scholarships
CREATE POLICY "Admins can manage scholarships"
ON public.scholarships
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_scholarships_updated_at
BEFORE UPDATE ON public.scholarships
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create scholarship_applications table
CREATE TABLE public.scholarship_applications (
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

-- Users can view their own applications
CREATE POLICY "Users can view their own applications"
ON public.scholarship_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create their own applications"
ON public.scholarship_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own applications
CREATE POLICY "Users can update their own applications"
ON public.scholarship_applications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.scholarship_applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_scholarship_applications_updated_at
BEFORE UPDATE ON public.scholarship_applications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();