# Supabase Edge Functions (AI)

This directory contains AI-backed Supabase Edge Functions:

- `match-scholarships`: Returns scholarship matches with detailed reasons.
- `generate-recommendations`: Returns structured recommendations (project/skill/activity) with priority.

## Environment Variables

Set the following variables for Edge Functions (use `supabase/.env` locally):

- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (used by functions; keep secret).
- `LOVABLE_API_KEY`: API key for the AI gateway.

Front-end client variables (in `.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Caching & Refresh Cadence

Both functions cache per-user responses in `public.ai_response_cache`.
- TTL: 6 hours. If a cached entry exists and is fresh, it is returned.
- To bypass the cache, send `{ "refresh": true }` in the request body.

Schema (created via migration):

- `id UUID PRIMARY KEY`
- `user_id UUID NOT NULL` (references `auth.users(id)`)
- `type TEXT NOT NULL` (e.g., `scholarship_matches`, `recommendations`)
- `data JSONB NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`

## Local Development & Testing

1) Install the Supabase CLI and sign in.

2) Create `supabase/.env` (or use the example):

```
SUPABASE_URL=... 
SUPABASE_SERVICE_ROLE_KEY=...
LOVABLE_API_KEY=...
```

3) Serve a function locally (uses `supabase/config.toml`):

- `supabase functions serve match-scholarships --env-file supabase/.env`
- `supabase functions serve generate-recommendations --env-file supabase/.env`

Local endpoints (default):
- `http://localhost:54321/functions/v1/match-scholarships`
- `http://localhost:54321/functions/v1/generate-recommendations`

4) Call with a user JWT (verify_jwt is enabled). Acquire a token by logging into the app and copying the JWT from localStorage.

Example `curl` (replace `<JWT>`):

```
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"refresh": true}' \
  http://localhost:54321/functions/v1/match-scholarships
```

```
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"refresh": false}' \
  http://localhost:54321/functions/v1/generate-recommendations
```

## Production Invocation

Front-end example (already used in the app):

- `supabase.functions.invoke('match-scholarships', { body: { refresh: false } })`
- `supabase.functions.invoke('generate-recommendations', { body: { refresh: false } })`

Note: Omitting `body` defaults to cache usage; set `refresh: true` to force a new AI call.