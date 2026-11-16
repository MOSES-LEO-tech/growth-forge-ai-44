-- Create scholarship_applications table (matches frontend usage)
-- Status values align with useScholarshipApplications.ts: bookmarked, applied, interview, awarded, rejected
CREATE TABLE IF NOT EXISTS public.scholarship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'bookmarked'
    CHECK (status IN ('bookmarked', 'applied', 'interview', 'awarded', 'rejected')),
  applied_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, scholarship_id)
);

-- Enable RLS
ALTER TABLE public.scholarship_applications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Users can view their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own scholarship applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can view their own scholarship applications"
          ON public.scholarship_applications FOR SELECT
          USING (auth.uid() = user_id);
    END IF;

    -- Users can create their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own scholarship applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can create their own scholarship applications"
          ON public.scholarship_applications FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own scholarship applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can update their own scholarship applications"
          ON public.scholarship_applications FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can delete their own applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own scholarship applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Users can delete their own scholarship applications"
          ON public.scholarship_applications FOR DELETE
          USING (auth.uid() = user_id);
    END IF;

    -- Admins and super admins can view all applications
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all scholarship applications' AND tablename = 'scholarship_applications') THEN
        CREATE POLICY "Admins can view all scholarship applications"
          ON public.scholarship_applications FOR SELECT
          USING (
            EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.role IN ('admin', 'super_admin')
            )
          );
    END IF;
END $$;

-- Indexes for common query paths
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_user_id ON public.scholarship_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_scholarship_id ON public.scholarship_applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_status ON public.scholarship_applications(status);
