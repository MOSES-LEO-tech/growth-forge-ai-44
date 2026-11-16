# Architecture

## Runtime topology

```
Browser (React SPA, PWA service worker)
  │  supabase-js (PostgREST + Realtime + Storage)
  ▼
Supabase project tobclczszdikmgvkvngf
  ├── Postgres 17 ── ~29 public tables, 113 RLS policies, ~41 public functions
  ├── Auth ───────── email/password only (100% of identities today)
  ├── Storage ────── 5 buckets (avatars, school-assets public; 3 private)
  └── Edge Functions (Deno)
        smartbuddy-chat        verify_jwt ✔  AI guidance, 7 personalities, usage logging
        generate-recommendations verify_jwt ✔
        match-scholarships     verify_jwt ✔
        public-data            verify_jwt ✘  whitelisted public reads (service role)

Vercel → static dist/ + SPA rewrite + PWA cache
```

There is **no application server**. Every read/write is a browser request to
PostgREST, guarded by RLS. That single fact drives most of the design decisions
below: authorization lives in SQL, and the browser is untrusted.

## Frontend layers

| Layer | Location | Responsibility |
|---|---|---|
| Routes & guards | `src/App.tsx`, `components/RequireAuth.tsx` | Lazy routes, role allow-lists, redirect to role home |
| Pages | `src/pages/**` | One route each; admin workspace under `pages/admin/` |
| Dashboards & widgets | `components/dashboards`, `components/widgets` | Role-specific composition; widgets fetch their own data |
| Contexts | `contexts/AuthContext`, `ThemeProvider`, `DashboardContext` | Session, profile bootstrap, theme, dashboard UI state |
| Hooks | `hooks/use*` | React Query wrappers; `useSchools`, `useRecommendations`, `useSmartBuddyChat`, … |
| Data layer | `lib/supabase/*` | 23 modules, one per domain. All Supabase access lives here |
| Pure helpers | `lib/projectStatus`, `lib/onboarding`, `lib/sanitize`, `lib/brand` | No I/O; unit-tested |

## Auth and roles

`AuthContext` loads the auth session, then the `profiles` row, with a 6 s timeout
and an insert→upsert fallback (the profile may not exist on first login).

Role hierarchy (`AuthContext.tsx`): `student(0) < parent(1) < teacher(2) <
admin(3) < super_admin(4)`. `RequireAuth` checks an explicit allow-list per
route group and redirects unauthorised roles to their own home via `roleHome()`.

`profiles.account_status` (`approved` / `pending`) gates school-scoped access:
students joining by code and teachers pending school-admin approval stay
`pending` until a school admin approves them.

## Database shape

| Domain | Tables |
|---|---|
| Identity | `profiles`, `parent_child_links` |
| Schools | `schools`, `school_join_codes`, `school_connection_requests`, `enrollments` |
| School content | `cms_pages`, `cms_news`, `cms_events`, `cms_resources`, `cms_content_versions` |
| Student work | `projects`, `project_files`, `project_folders`, `project_tasks`, `achievements`, `gallery_events`, `gallery_media`, `gallery_folders`, `comments` |
| Opportunities | `scholarships`, `scholarship_applications`, `recommendations` |
| Platform | `notifications`, `messages`, `settings`, `admin_audit_logs`, `smartbuddy_usage`, `llm_config` |

Mutating operations that must be atomic or role-sensitive run as RPCs
(`approve_student_project`, `cms_publish`, `announcements_publish`,
`super_admin_*`, …). Most are `SECURITY INVOKER` so RLS still applies; four are
`SECURITY DEFINER` (`handle_new_user`, `get_active_school_join_code`,
`notify_school_connection_approved`, `school_public_roster`).

`public-data` is the only unauthenticated Edge Function: it runs with the service
role but returns column-whitelisted, paginated public data (`schools`,
`scholarships`, `gallery_events`, platform stats). `school_public_roster()`
deliberately exposes only name + grade.

## AI path

`lib/supabase/recommendations.ts` and `scholarshipMatching.ts` call `functions.invoke`
with the user's JWT. `supabase/functions/_shared/llm.ts` reads provider/model from
`llm_config` (`chat`, `recommendations`, `scholarship_matching`), pulls the key
from `Deno.env`, and speaks the OpenAI-compatible chat API. Provider or model is a
**data change, not a deploy** — but a disabled or missing `llm_config` row makes
the feature return 500 by design.

Every completion writes a `smartbuddy_usage` row (tokens, latency, status,
provider) — this is the metering source a future billing layer would read.

## Storage

| Bucket | Public | Limit today | Purpose |
|---|---|---|---|
| `avatars` | yes | none set | Profile images |
| `school-assets` | yes | 10 MB | School logo/cover/hero media |
| `gallery-media` | no | none set | Event galleries |
| `project-media` | no | none set | Project images/video |
| `project-documents` | no | none set | Attachments |

Only `school-assets` carries a limit in the live project. The tighter limits and
MIME allow-lists (avatars 5 MB, gallery 25 MB, project media 50 MB, documents
25 MB) are defined in `supabase/scripts/phase1/03_security_hardening.sql` and take
effect when that script is run — do not assume they are active.

## Testing layers

- **Unit (Vitest)** — `tests/unit/**`, node environment, Supabase client mocked with
  a thenable stub. Asserts derived values, not query shape.
- **E2E (Playwright)** — `tests/*.spec.ts`, credential-gated, runs against a dev
  server on :8080. CI fails if every spec skips.

## Deliberate constraints

1. **One Supabase project for production and QA.** No staging project yet; the
   free plan's 2-project limit is consumed by an empty orphan awaiting deletion.
2. **Migrations are not yet reproducible.** Ten files were renamed to their real
   applied versions on 2026-11-10; four have never been applied. See
   `supabase/migrations/README.md`.
3. **No email channel.** Notifications and announcements are in-app only.
4. **No billing.** `parent.ts:getPlan()` returns a constant until entitlements exist.
5. **Free-plan pause risk.** An inactive project pauses and the app goes dark.
