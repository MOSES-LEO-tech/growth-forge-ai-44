# AI Features — OpenRouter Free Integration Plan

**Date:** 2026-08-17
**Status:** Implemented — migration applied, code refactored, frontend wired. **Pending:** user to set secrets + deploy functions (commands in §4.8/§4.9).

---

## 1. Summary

Migrate the three core AI features — **SmartBuddy chat**, **Recommendations/Guidance** (with live internet search), and **Scholarship matching** — from their current hardcoded providers (Lovable AI Gateway + Anthropic) to **OpenRouter free-tier models** (`:free` suffix, no credit card). Introduce a runtime **`llm_config` table** so provider/model can be swapped without redeploying Edge Functions, plus a shared LLM client and a Tavily-backed web-search helper. Wire the already-deployed but **orphaned** `match-scholarships` Edge Function to the Scholarships "Find Matches" button. Keep existing usage telemetry working.

## 2. Current State Analysis

| Feature | UI | Edge Function | Provider today | Status |
|---|---|---|---|---|
| SmartBuddy chat | `src/pages/SmartBuddy.tsx`, `src/components/widgets/SmartBuddyWidget.tsx` | `smartbuddy-chat` | Lovable gateway / `google/gemini-2.5-flash` (`LOVABLE_API_KEY`) | Works; logs to `smartbuddy_usage` |
| Recommendations/Guidance | `src/pages/Recommendations.tsx`, `src/hooks/useRecommendations.ts`, `src/components/widgets/RecommendationsWidget.tsx` | `generate-recommendations` | Anthropic / `claude-3-5-haiku` (`ANTHROPIC_API_KEY`) | Works; no web search |
| Scholarship "Find Matches" | `src/components/widgets/ScholarshipsWidget.tsx` | `public-data` (SQL listing — **no AI**) | — | Button just lists rows |
| Scholarship AI matching | *(no caller)* | `match-scholarships` | Lovable gateway + function calling | **Deployed but orphaned** |

Key facts from exploration:
- All AI traffic is browser → Supabase Edge Function → provider (never direct from browser). Keys are server-side only (`Deno.env.get`).
- **No LLM config exists** — provider/model is hardcoded per function.
- `smartbuddy_usage` table (migration `20260505190000_super_admin_security_audit_telemetry.sql`) already tracks per-call usage/cost; only `smartbuddy-chat` writes to it today.
- OpenRouter free models (verified 2026-08): ~16 free models, OpenAI-compatible at `https://openrouter.ai/api/v1`, tool calling supported, rate limits ≈ **20 req/min / 50–200 req/day**, `:free` suffix, free requests billed at $0 (usage telemetry still returned).
- Anthropic / Lovable paths remain as fallbacks via config — no keys removed.

## 3. Decisions (confirmed with user)

1. **Scope:** Core 3 features — SmartBuddy chat, Recommendations, Scholarship matching. (Parent guidance fix deferred.)
2. **Web search:** **Tavily free tier** (1,000 credits/month) for recommendations.
3. **Routing:** **Runtime `llm_config` table** — no redeploy needed to swap providers/models.
4. Keys: **TAVILY_API_KEY provided by user**; **OPENROUTER_API_KEY must be created by the user** at https://openrouter.ai/settings/keys (not yet provided).

## 4. Proposed Changes

### 4.1 New migration — `supabase/migrations/ai_llm_config.sql`

Create and seed the config table (read via service role by functions; super_admin-only via UI/RLS):

```sql
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
CREATE POLICY llm_config_admin_all ON public.llm_config
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.llm_config (key, provider, model, web_search_enabled) VALUES
  ('chat',                'openrouter', 'openrouter/free',                       false),
  ('recommendations',     'openrouter', 'nvidia/nemotron-3-ultra-550b-a55b:free', true),
  ('scholarship_matching','openrouter', 'openai/gpt-oss-20b:free',                false)
ON CONFLICT (key) DO NOTHING;
```

Model rationale (grill-me pass):
- **chat → `openrouter/free`** — auto-router picks the best available free model; resilient to individual models disappearing.
- **recommendations → `nvidia/nemotron-3-ultra-550b-a55b:free`** — strong reasoning/JSON reliability for structured output (1M context).
- **scholarship_matching → `openai/gpt-oss-20b:free`** — reliable function/tool calling.

> `public.has_role` helper already exists in migration `20260505190000_super_admin_security_audit_telemetry.sql` (verified pattern used by `smartbuddy_usage`).

### 4.2 New shared module — `supabase/functions/_shared/llm.ts`

Single Deno helper replacing all per-function provider fetch logic:

- `getLlmConfig(key: string, supabase): Promise<LlmConfig>` — `SELECT` from `llm_config`; if missing/disabled, throw a 500 with a clear message. (Functions are short-lived; no cache needed.)
- `chatCompletion(config, messages, opts?)`:
  - Base URL by provider: `openrouter` → `https://openrouter.ai/api/v1`, `lovable` → `https://ai.gateway.lovable.dev/v1`.
  - Key from `Deno.env.get('<PROVIDER>_API_KEY')` (`OPENROUTER_API_KEY`, `LOVABLE_API_KEY`); 500 if absent.
  - OpenAI-compatible body `{ model, messages, stream: false }`; optional `tools` + `tool_choice` (for scholarship matching).
  - OpenRouter headers: `HTTP-Referer` + `X-Title` (required by OpenRouter policy).
  - Parse `choices[0].message.content` (with delta/`output_text`/`candidates` fallbacks, mirroring existing code) + `usage` tokens.
  - Error mapping: 401/403 → auth error; 402 → payment required; 429 → friendly "AI is busy — try again shortly" (free-tier limit); else 502. Returns a typed result `{ content, promptTokens, completionTokens, provider, model }`.
- Anthropic is **not** adapted (feature moving away from it); the config can still select `lovable` as fallback today.

### 4.3 New shared module — `supabase/functions/_shared/websearch.ts`

- `webSearch(query: string, maxResults = 5)` → `POST https://api.tavily.com/search` with `api_key: Deno.env.get('TAVILY_API_KEY')`, `search_depth: 'basic'`. Returns `{ results: [{ title, url, content }] }`.
- **Graceful degrade:** missing key or API failure → log + return `{ results: [] }` (recommendations still work, just without live web data). No key ever hardcoded.

### 4.4 Modify `supabase/functions/smartbuddy-chat/index.ts`

- Replace the hardcoded Lovable fetch with `chatCompletion(await getLlmConfig('chat', supabase), messages)`.
- Keep: JWT auth check, 7 personality prompts, 8-message history normalization, 4000-char clamp, and **`smartbuddy_usage` logging** (update `provider`/`model` fields from the config result; `total_cost_usd = 0` for `:free` models).
- Response contract unchanged: `{ text }`.

### 4.5 Modify `supabase/functions/generate-recommendations/index.ts`

- Read config `'recommendations'`; route through `chatCompletion`.
- If `web_search_enabled`: call `webSearch(<top interests/clubs> + " scholarships grants 2026")`, inject top results (trimmed ~3,000 chars total) into the prompt under a "Current web findings" section, and add a rule: scholarship matches must reference web results where relevant.
- Keep: profile-context prompt building, strict JSON instruction, ```json fence stripping + `JSON.parse`, and `{ success, data }` output contract (`profile_completeness`, `missing_profile_fields`, `scholarship_matches`, `action_items`).
- Log to `smartbuddy_usage` (status success/error, provider/model, cost 0) so all AI surfaces share one telemetry table.
- No change to persistence behavior (currently does not write `recommendations` rows — leave as-is).

### 4.6 Modify `supabase/functions/match-scholarships/index.ts`

- Read config `'scholarship_matching'`; route through `chatCompletion` with the existing `rank_scholarships` tool + `tool_choice`.
- Keep output `{ matches }` and the deadline-filtered scholarship context. Log to `smartbuddy_usage`.

### 4.7 Frontend — wire "Find Matches" (Scholarships widget)

- New `src/lib/supabase/scholarshipMatching.ts`:
  - `getScholarshipMatches(userId)` → `supabase.functions.invoke('match-scholarships', { body: { userId } })` → `{ matches }` (matches already enriched with scholarship rows by the function).
- Modify `src/components/widgets/ScholarshipsWidget.tsx`:
  - "Find Matches" now calls `getScholarshipMatches`; render ranked results (high/medium/low badge + reason), with loading state and error toast (incl. 429-friendly message).
  - Keep the existing plain browse list as a fallback/tab ("Browse all").
- No changes to `src/pages/Scholarships.tsx`.

### 4.8 Secrets / env (no secrets in source files)

- Remote (user or CLI, after this plan is approved): `supabase secrets set OPENROUTER_API_KEY=<user-provided> TAVILY_API_KEY=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`
- Local dev: add both keys to `.env` (gitignored — verified only Supabase keys live there today).
- **No API key will ever be written to a tracked file, `llm_config`, or any function source.**

### 4.9 Deploy

- Apply migration via `integrated_web-dev` → `supabase_apply_migration`.
- Deploy the three modified functions: `supabase functions deploy smartbuddy-chat generate-recommendations match-scholarships` (requires Supabase CLI + login; if the CLI is unavailable in this environment, provide the commands for the user to run).

## 5. Grill-Me Output — Other AI Locations & Providers

### Other AI locations worth adding (prioritized, each was grilled for real value vs. effort)

| Priority | Surface | Effort | Why it earned a place |
|---|---|---|---|
| **P1** | **Profile bio/pitch generator** (in Profile Settings) | Small | One prompt from existing profile data; instantly raises portfolio polish; zero new infra (reuses `llm.ts`) |
| **P1** | **Project mentor feedback** (AddProjectModal / ProjectDetails) | Medium | High student value; text-only LLM call; reuse chat config |
| **P2** | **Study plan / weekly roadmap generator** | Medium | Personalized from profile + deadlines |
| **P2** | **Scholarship essay outline helper** | Medium | High value; needs copy/guardrails (no full-essay autopilot) |
| **P3** | **Teacher grading feedback** | Large | Sensitive + high-stakes; defer until moderation review |
| **P3** | **Admin AI Governance (real telemetry)** | Medium | Wire AIGovernanceWidget to `smartbuddy_usage` + `llm_config` (currently mock) |

### Other providers considered (grilled)

| Provider | Verdict |
|---|---|
| **Google Gemini API (official free tier)** | **Best alternative** — real free tier with higher RPM than OpenRouter free; add later as a `provider='gemini'` option in `llm_config` if free-model 429s bite |
| **Groq free tier** | Excellent latency for chatbot; add as config option if chat speed matters |
| **Cloudflare Workers AI** | Defer — free but model selection + platform lock-in not worth it now |
| **DeepSeek API** | Cheap, not free; note for the day paid usage is needed |
| **Keep Lovable + Anthropic** | Retained as config-swappable fallbacks (no keys removed) |

**Recommendation:** OpenRouter free stays the unified default (as requested). The `llm_config` table makes swapping to Gemini/Groq a data change, not a code change.

## 6. Assumptions

- User will create an **OpenRouter API key** (https://openrouter.ai/settings/keys) — no key provided yet; chat/recommendations will show a friendly "AI unavailable" until it is set.
- Free-tier rate limits (≈20 RPM / 50–200 RPD) are acceptable for dev/demo traffic; 429s surface as friendly errors.
- `match-scholarships` is already deployed with `verify_jwt=true` (confirmed via exploration).
- Tavily key provided by the user is a dev key and may be rotated later.

## 7. Verification

1. `npx tsc --noEmit` + `npm run lint` (frontend widget + lib changes).
2. Migration applied via `supabase_apply_migration` (MCP) → confirm `llm_config` seeded via `supabase_get_tables`.
3. `npm run build`.
4. With secrets set + functions deployed, runtime test (Playwright against `localhost:8081`):
   - SmartBuddy widget sends a message → gets an OpenRouter free reply (chat config).
   - Recommendations page "Generate" → JSON output incl. web-search-influenced scholarship matches.
   - Scholarships "Find Matches" → ranked matches with badges/reasons.
5. Confirm `smartbuddy_usage` rows record `provider='openrouter'`, `model=<free model>`, cost $0.
6. If the OpenRouter key isn't available at test time: verify graceful error UI, then re-test once the user supplies the key.

## 8. Out of Scope (this pass)

- `parent-ai-guidance` Edge Function (missing) + Parent AI Guidance widget.
- AI Governance widget real telemetry.
- New AI surfaces (P1–P3 above) — separate plans after this lands.
