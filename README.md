# Milestone

A student portfolio platform for schools, students, parents and teachers: document
achievements and projects, run school galleries and CMS content, collect
scholarship opportunities, and keep a verified growth record in one place.

Live: <https://growth-forge-ai-44.vercel.app>

> Early-stage and mid-migration. Read [Status and known gaps](#status-and-known-gaps)
> before treating any feature as production-ready.

## Stack

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript 5.8, Vite 5, Tailwind 3, shadcn/Radix (~48 primitives), TanStack Query, React Router 6, Recharts, Tiptap |
| Backend | Supabase only — Postgres 17, Auth (email), Storage, 4 Deno Edge Functions. **No custom API server.** |
| Auth model | Client-side session + Postgres RLS. `RequireAuth` gates routes; RLS is the real boundary. |
| AI | OpenRouter / Lovable-compatible endpoints, routed at runtime by the `llm_config` table |
| Tests | Vitest for the data layer; Playwright for E2E |
| Deploy | Vercel static SPA + PWA service worker |

## Quick start

```bash
bun install                      # or: npm install
cp .env.example .env             # then fill in the two VITE_ values
bun run dev                      # http://localhost:8080
```

Port **8080** is set in `vite.config.ts` (not Vite's default 5173).

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on :8080 |
| `bun run build` | Production build into `dist/` (includes PWA service worker) |
| `bun run preview` | Serve the built output |
| `bun run lint` | ESLint (0 errors expected; 12 known `react-refresh` warnings) |
| `bun run test` | Vitest unit tests for `src/lib/**` |
| `bun run test:e2e` | Playwright E2E — most specs self-skip without credentials |
| `bun run email -- --help` | Send product/campaign email via Resend or SendGrid ([details](scripts/email/README.md)) |

## Environment

Values live in `.env` for local work and in the Vercel project for deploys.
Both VITE_ values are **public by design** — they ship inside the client bundle.

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | local, Vercel, CI | `https://tobclczszdikmgvkvngf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | local, Vercel, CI | Legacy JWT anon key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | local, Vercel, CI | Modern publishable key; the client accepts either |
| `OPENROUTER_API_KEY` / `LOVABLE_API_KEY` | Supabase Edge Function secrets | **Never** in a `VITE_` variable |

Test-account credentials for Playwright (`PLAYWRIGHT_STUDENT_EMAIL`, etc.) are
GitHub Actions secrets, never repo files.

## Project structure

```
src/
  App.tsx                 routes + role guards
  pages/                  one file per route (admin/* = school admin workspace)
  components/             shared UI, dashboards/, widgets/, admin/, ui/ (shadcn)
  contexts/               Auth, Theme, Dashboard
  hooks/                  React Query wrappers over lib/supabase
  lib/supabase/           the entire data layer (23 modules, one per domain)
  lib/                    pure helpers (projectStatus, onboarding, sanitize, brand)
  integrations/supabase/  client + generated Database types
supabase/
  migrations/             schema history — see migrations/README.md before pushing
  functions/              4 Edge Functions + _shared/llm.ts
  scripts/                qa/ seeds/ phase1/ — never auto-applied
tests/                    Playwright E2E; tests/unit = Vitest
docs/                     ARCHITECTURE.md, operations/, superpowers specs
```

## Testing

- **Unit** — `bun run test`. Covers the data layer with a stubbed Supabase client.
- **E2E** — `bun run test:e2e`. Requires `PLAYWRIGHT_*` credentials; without them
  specs skip themselves, and CI then fails the run deliberately
  (`scripts/ci/assert-playwright-not-all-skipped.mjs`) instead of reporting green.

## Database

Canonical project: **`tobclczszdikmgvkvngf`** (eu-central-1, org *MOSES-LEO-tech's Org*).

- Schema history in `supabase/migrations/` **does not yet match** the 56 applied
  migrations. Read `supabase/migrations/README.md` first — four migrations have
  never been applied to production.
- Seeds and QA fixtures live in `supabase/scripts/`, never in `migrations/`.
- Free-plan projects **pause after inactivity**, which takes the whole app down
  (auth and data both stop resolving). See `docs/operations/deployment.md`.

## Roles

`student` < `parent` < `teacher` < `admin` (school) < `super_admin`

Each role has its own workspace (`/dashboard`, `/teacher`, `/parent`,
`/admin/overview`) and route allow-lists in `App.tsx`.

## Status and known gaps

| Area | State |
|---|---|
| School CMS, announcements, academics, school media | UI shipped; **tables missing in production** (4 unapplied migrations) |
| Billing / subscriptions | Not implemented — plan is a hardcoded `basic` |
| Email delivery | Deliberately none; notifications are in-app only |
| Parent analytics, project ratings | Removed rather than faked (they were invented numbers) |
| Branding | App is "Milestone"; repo, Vercel project and git remote still say `growth-forge-ai-44` |

Operational runbooks: `docs/operations/phase1-security-runbook.md`,
`docs/operations/deployment.md`. Architecture: `docs/ARCHITECTURE.md`.

## License

MIT — see [LICENSE](LICENSE).
