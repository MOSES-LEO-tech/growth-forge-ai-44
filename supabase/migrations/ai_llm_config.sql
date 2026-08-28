-- llm_config: runtime AI provider/model routing for Edge Functions
-- Read via service role (bypasses RLS). super_admin only via UI/RLS.
-- Swapping providers/models is a data change, not a code change.

CREATE TABLE IF NOT EXISTS public.llm_config (
  key TEXT PRIMARY KEY,            -- 'chat' | 'recommendations' | 'scholarship_matching'
  provider TEXT NOT NULL,          -- 'openrouter' | 'lovable' | 'anthropic'
  model TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  web_search_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.llm_config ENABLE ROW LEVEL SECURITY;

-- super_admin read/write only (functions use service role, bypass RLS)
DROP POLICY IF EXISTS llm_config_admin_all ON public.llm_config;
CREATE POLICY llm_config_admin_all ON public.llm_config
  FOR ALL USING (app_private.current_user_is_super_admin());

INSERT INTO public.llm_config (key, provider, model, web_search_enabled) VALUES
  ('chat',                'openrouter', 'openrouter/free',                        false),
  ('recommendations',     'openrouter', 'nvidia/nemotron-3-ultra-550b-a55b:free', true),
  ('scholarship_matching','openrouter', 'openai/gpt-oss-20b:free',                false)
ON CONFLICT (key) DO NOTHING;
