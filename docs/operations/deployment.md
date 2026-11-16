# Deployment & operations

## Environments

| Environment | URL | Supabase project | Data |
|---|---|---|---|
| Local | http://localhost:8080 | `tobclczszdikmgvkvngf` | **Production data** (no staging exists) |
| Preview | `*-moses-leo-techs-projects.vercel.app` | same | same |
| Production | <https://growth-forge-ai-44.vercel.app> | same | production |

There is no staging project. Until one exists, treat local development as
touching production data: do not run destructive SQL locally, and do not point
experiments at the canonical project.

## Vercel project

| Field | Value |
|---|---|
| Project | `growth-forge-ai-44` (`prj_v06J2jgeJpTAYyMHVXDEoQcUgDOv`) |
| Team | `moses-leo-techs-projects` (`team_wWaVf68fIq5rfV7tN3BfbTdJ`) |
| Framework | Vite, Node 24.x |
| Build | `bun run build` → `dist/` |
| Rewrites | SPA fallback to `/index.html` (`vercel.json`) |
| Cache | `/assets/*` immutable 1 year; `/sw.js` `max-age=0, must-revalidate` |
| SSO protection | on for all deployments *except* custom domains — the public URL stays reachable |

The production alias `growth-forge-ai-44.vercel.app` points at the newest READY
production deployment. Deploys currently land via GitHub push **and** CLI; prefer
push so the deployment records its commit SHA.

## Environment variables

Set in **Vercel → Project → Settings → Environment Variables** (Production +
Preview):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://tobclczszdikmgvkvngf.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key from Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | legacy anon JWT (client accepts either) |

Present but **unused** — safe to delete (they were imported by a generic Supabase
integration and contain secrets for a non-Vite consumer):
`POSTGRES_*`, `NEXT_PUBLIC_*`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SECRET_KEY`.

Rule that keeps this safe: **only `VITE_`-prefixed values reach the browser.**
Never put a service-role key or JWT secret in a `VITE_` variable.

CI uses its own copies of the two public values as GitHub Actions secrets
(`VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`) plus `PLAYWRIGHT_*`
credentials. CI previously pointed at `xrnnsysvwbbulezhvszb`, a project that no
longer exists; that was corrected on 2026-11-10.

## Deploy procedure

1. `bun run lint && bun run test && bun run build` locally.
2. Push to `main`.
3. Vercel builds and aliases the new deployment to the production domain.
4. Smoke test: landing page renders, `/auth` sign-in works, one authenticated
   dashboard loads.

### Rollback

- **Frontend:** Vercel → Deployments → previous READY → *Promote to Production*
  (instant, no rebuild).
- **Database:** restore from `phase1_backup` (see the Phase 1 runbook) or a
  Supabase backup. Schema changes are forward-only — never edit an applied
  migration.

## Supabase operating notes

- Free-plan projects **pause after a period of inactivity**; when that happens the
  project's hostname stops resolving entirely, so auth and data both fail while
  the static site still returns 200. This happened prior to 2026-11-10 and was
  the root cause of a fully dark app.
- Mitigation: an external uptime check against
  `https://tobclczszdikmgvkvngf.supabase.co/auth/v1/health` (any 200/401 response means
  the project is awake) plus a weekly synthetic query. A paid plan removes the
  pause behaviour.
- Edge Function secrets (`OPENROUTER_API_KEY`, `LOVABLE_API_KEY`) live in
  Supabase → Edge Functions → Secrets, not in Vercel.

## PWA / caching

`vite-plugin-pwa` generates `sw.js` with `skipWaiting` + `clientsClaim`, so a new
deploy activates immediately. That also means a broken deploy reaches users
quickly — the immutable asset cache is what makes rollback safe, since old
hashed assets stay available.

## Known deployment gaps

1. Four migrations are unapplied in production (`supabase/migrations/README.md`),
   so CMS media, academic structure and announcements 500 in the live app.
2. No staging project (free-plan slot is held by an empty orphan awaiting deletion).
3. No error monitoring or uptime alerting is configured.
4. Production deployments are sometimes made from the CLI, which makes the
   deployed SHA harder to trace than a git-triggered build.
