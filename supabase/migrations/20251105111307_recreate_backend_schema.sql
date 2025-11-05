-- Modify the schools table to match the new schema
ALTER TABLE public.schools
ADD COLUMN user_count INT DEFAULT 0,
ADD COLUMN hall_of_fame JSONB,
ADD COLUMN yearbooks JSONB,
ADD COLUMN gallery JSONB,
DROP COLUMN contact_email,
DROP COLUMN contact_phone,
DROP COLUMN website_url,
DROP COLUMN established_year,
DROP COLUMN verified;

-- Modify the ai_response_cache table
ALTER TABLE public.ai_response_cache
RENAME COLUMN cache_key TO query;

ALTER TABLE public.ai_response_cache
RENAME COLUMN response_data TO response;

ALTER TABLE public.ai_response_cache
DROP COLUMN expires_at;

-- Add the yearbooks storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('yearbooks', 'yearbooks', true)
ON CONFLICT (id) DO NOTHING;