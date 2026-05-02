-- Student profile preference fields for richer settings and recommendations.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subjects TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clubs TEXT[];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_age_reasonable'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_age_reasonable
      CHECK (age IS NULL OR (age >= 3 AND age <= 120));
  END IF;
END $$;
