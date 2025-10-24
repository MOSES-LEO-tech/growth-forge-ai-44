-- AI response cache table to store recent per-user AI outputs
-- TTL policy is enforced in application code (6 hours). This table keeps latest entries and allows quick lookups.

CREATE TABLE public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'scholarship_matches', 'recommendations'
  data JSONB NOT NULL, -- cached response payload (array/object)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Users can read their own cached entries
CREATE POLICY "Users can view their own AI cache"
ON public.ai_response_cache
FOR SELECT
USING (auth.uid() = user_id);

-- Indexes to optimize lookups and TTL checks
CREATE INDEX idx_ai_cache_user_type_created_at
ON public.ai_response_cache (user_id, type, created_at DESC);