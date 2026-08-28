# School Admin Platform Enhancement — Audit, Roadmap, CMS & Student Module

**Date:** 2026-08-21
**Status:** Approved for planning (full program, phased)
**Scope decisions (user-confirmed):**
1. Full program in one plan: audit → roadmap → CMS → student module → design/testing.
2. CMS content is **public + internal**: published content renders on the school's public pages (`/schools/:id`); draft/private content stays admin-only.
3. Student management module = **profiles + enrollment only** (+ import/export). Academic records, discipline, health records, transcripts are **deferred** (recorded in roadmap as P2 backlog).

---

## 1. Summary

Transform the existing school-admin workspace into a production-grade school administration platform by (0) auditing current features with the **grill-me** skill, (1) producing a research-backed prioritized roadmap, (2) building a school-scoped **CMS** (pages, news, event calendar, resource library) with role-based publishing, version history and approval workflow — rendering published content on public school pages — and (3) building a **student management module** (roster + enrollment tracking + CSV import/export) under `/admin`. UI work is grounded with the **refero-design** skill (research-first) and verified with per-phase gates (tsc/lint/build + Playwright QA).

The work reuses existing patterns already proven in this codebase: the `approval_status` moderation pipeline, `app_private` SECURITY DEFINER helpers + public SECURITY INVOKER wrappers, `admin_audit_logs`, school-scoped RLS, and the hand-maintained types.ts convention.

---

## 2. Current State Analysis (from exploration)

### What already exists
- **Roles & auth:** `UserRole = student|parent|teacher|admin|super_admin`; hierarchy via `AuthContext.hasPermission`; `RequireAuth` supports `allowedRoles` prop (exact-match) but **App.tsx never uses it** — no route-level RBAC today.
- **School workflow:** signup → `handle_new_user` (admin creates pending `schools` row) → super admin approves → school admin manages join codes + connection requests. RPCs: `approve_school_application`, `approve_school_connection`, `rotate_school_join_code`, `request_school_connection`, `disconnect_my_school`.
- **Guard triggers** on `profiles`/`schools` block direct UPDATE of `role`, `school_id`, `account_status`, `approval_status`, `approved_by/at`, `rejection_reason`, `admin_id`. Non-sensitive fields (`grade_level`, `class_name`, `bio`, `subjects[]`, `clubs[]`) are **not guarded**.
- **SchoolAdminDashboard** (`src/components/dashboards/SchoolAdminDashboard.tsx`): 9 widgets — SchoolAccess, SchoolOverview, UserManagement, AcademicStructure, PortfolioModeration, AchievementControl, AIGovernance, Analytics, SchoolSettings. Widget grid pattern: `dashboard-grid auto-rows-[minmax(190px,auto)]`, `md:col-span-2 xl:col-span-2`, `defaultExpanded={activeWidget==='x'}` with `?widget=` deep links.
- **Moderation pipeline** (`20260505193000_student_content_approval_routing.sql`): `approval_status` + `approved_by/at` + `rejection_reason` + triggers + approve/reject RPCs on `projects`, `gallery_events`, `achievements`. Reusable for CMS publishing.
- **Audit trail:** `admin_audit_logs` (before/after JSONB) + `app_private.log_admin_action()`.
- **Event calendar primitive:** `gallery_events` (event_date, location, is_public, tags, folders, approval) — but **owner-scoped to `user_id`**, not school-scoped.
- **Document library pattern:** `project_files`/`project_folders` + private `project-documents` bucket (folder hierarchy, tags, file metadata) — per-project; generalizable to school resource library.
- **Roster primitive:** students are `profiles` with `role='student'` + `school_id` + `grade_level` + `class_name`. Existing queries: `getStudentsBySchool` (`teacher.ts`), `getSchoolUsers`/`getSchoolMetrics` (`schools.ts`).
- **Media:** `school-assets` public bucket, school-admin storage policies, `current_user_can_manage_school_asset()` helper.
- **Public pages:** `/schools`, `/schools/:id` (`SchoolProfile.tsx`) — tabs About / Students / Gallery. **The Students tab renders 8 fake placeholder students** (pravatar images, "Student 1..8") — a genuine gap.

### What's missing
- No news/announcements table (per-user `notifications` has no school audience targeting).
- No school resource library (only per-project `project_files`).
- No school-scoped CMS events (only owner-scoped `gallery_events`).
- No `enrollments` table (no enrollment status/history; no classes/terms).
- No academic records, discipline, health, transcripts (deferred per scope decision).
- No `/admin` routes; `allowedRoles` unused; no Navbar admin links.
- `src/integrations/supabase/types.ts` is stale vs. live schema (already known); hand-append convention.

### Conventions to follow (must-match)
- Migration per feature in `supabase/migrations/*.sql`, applied via `integrated_web-dev` `supabase_apply_migration`, verified via `supabase_get_tables`.
- Privileged ops: `app_private` SECURITY DEFINER + public SECURITY INVOKER wrapper (see existing RPCs).
- Types: hand-append `Row`/`Insert`/`Update` interfaces to `types.ts` (do **not** regenerate; no CLI access).
- Lib layer: `src/lib/supabase/<domain>.ts` returning plain data / throwing errors; `supabase as any` where generated types lag (see `gallery.ts` pattern).
- UI: shadcn/ui components, Tailwind tokens (`bg-background`, `text-muted-foreground`), `container mx-auto px-4 pt-24 pb-8` under the fixed Navbar, lazy-loaded routes.
- Gates per phase: `npx tsc -p tsconfig.app.json --noEmit` (real check; root `tsc` is a no-op — solution file), `npm run lint`, `npm run build`, Playwright QA. Pre-existing out-of-scope tsc errors in `chatHistory.ts`, `parent.ts`, `Dashboard.tsx`, `ProjectDetails.tsx` remain (do not fix).

---

## 3. Program Structure

| Phase | Deliverable | Skill/Tools | Output |
|-------|-------------|-------------|--------|
| 0 | Feature audit | **grill-me** | `.trae/documents/school-admin-audit.md` (retain/refine/retire matrix) |
| 1 | Prioritized roadmap | WebSearch research | `.trae/documents/school-admin-roadmap.md` (P0/P1/P2 backlog) |
| 2 | CMS (pages, news, events, resources) | **refero-design** for UI | Schema + `/admin/cms` + public rendering on `/schools/:id` |
| 3 | Student module (profiles + enrollment + import/export) | **refero-design** for UI | Schema + `/admin/students` + real roster on public Students tab |
| 4 | Design review + testing | refero-design + Playwright | Mockup docs, walkthrough guide, QA verification |

Each phase ends with its own gate run + agent-log append. Do not start a phase until the previous one's gates pass.

---

## 4. Phase 0 — Feature Audit (grill-me)

**Process:** Invoke the **grill-me** skill to drive the audit interrogation, then produce the audit document. For every existing admin feature, answer four questions (is it functional? is it used/adoptable? is it aligned with real admin needs? does it duplicate anything?) and classify **Retain / Refine / Retire** with rationale.

**Feature inventory to audit** (pre-loaded, executor refines with grill-me):
1. School registration/approval workflow (`handle_new_user`, super-admin Approvals tab) — initial: **Retain** (core), refine: onboarding polish.
2. `SchoolAccessWidget` (join codes, connection approvals) — initial: **Retain**; refine: bulk invite + join-code QR.
3. `SchoolOverviewWidget` — **Retain**.
4. `UserManagementWidget` — **Retain**; refine: deep-link to new `/admin/students` roster.
5. `AcademicStructureWidget` — **Audit carefully**: likely **Retain/Refine** (grade/class editing); may be partially retired if duplicative with the student module.
6. `PortfolioModerationWidget` + `AchievementControlWidget` — **Retain** (core moderation; CMS reuses the same pattern).
7. `AIGovernanceWidget` — **Retain** (unique differentiator).
8. `AnalyticsWidget` — **Retain**; refine: add roster/enrollment counts.
9. `SchoolSettingsWidget` — **Retain**.
10. Teacher dashboard (`PendingApprovalsWidget`, `StudentDirectoryWidget`) — **Retain**; refine: unify directory with new student module.
11. Super Admin dashboard — **Retain**.
12. Public `/schools` + `/schools/:id` — **Retain**; refine: replace placeholder Students tab, add News/Events tabs (ties to CMS).
13. `gallery_events` as de-facto calendar — **Refine**: introduce school-scoped `cms_events`; keep `gallery_events` for student portfolios.

**Output:** `.trae/documents/school-admin-audit.md` — matrix table (Feature | What it does | Health | Adoption signal | Alignment | Verdict | Action), plus a short "risks" section (e.g., stale types.ts, unused `allowedRoles`, placeholder public Students tab, RLS gaps for profile updates by school admin).

---

## 5. Phase 1 — Prioritized Roadmap (research-backed)

**Process:**
1. WebSearch (2–4 queries) on K-12/higher-ed admin platform best practices (PowerSchool, Infinite Campus, Schoology, Blackbaud, Frontline) for: CMS/news/parent-communication, enrollment/student records, FERPA data handling, attendance, gradebooks, staff scheduling.
2. Synthesize into the roadmap doc, mapped 1:1 to audit findings.

**Roadmap structure (`.trae/documents/school-admin-roadmap.md`):**
- **P0 (this program):** CMS (pages/news/events/resources) + student roster & enrollment + import/export.
- **P1 (next programs, recommended):** parent communication portal (school-scoped broadcasts via `cms_news` audience targeting + notifications), automated attendance, grade book integration, approval-aware publishing dashboards.
- **P2 (backlog):** academic records + transcript generation, discipline tracking, health records, staff scheduling, SIS interoperability.
- Each item: problem → proposed feature → data model sketch → effort tier → priority rationale. No time estimates (per project policy); use effort tiers (S/M/L) and priority (P0/P1/P2).

---

## 6. Phase 2 — CMS (school-scoped, public + internal)

### 6.1 Migration: `supabase/migrations/school_cms.sql`
Tables (all with `school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE`):

```sql
-- Reuse ContentApprovalStatus-style enum: draft | pending_review | published | rejected
create type cms_content_status as enum ('draft', 'pending_review', 'published', 'rejected');

create table cms_pages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  slug text not null,                -- unique per school
  title text not null,
  content text not null default '',  -- markdown/rich text body
  hero_image_url text,
  status cms_content_status not null default 'draft',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  published_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, slug)
);

create table cms_news (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'public' check (audience in ('public','students','staff')),
  status cms_content_status not null default 'draft',
  featured boolean not null default false,
  publish_at timestamptz,
  expire_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  published_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cms_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  description text,
  location text,
  event_date timestamptz not null,
  end_date timestamptz,
  audience text not null default 'public' check (audience in ('public','students','staff')),
  status cms_content_status not null default 'draft',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  published_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cms_resources (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  title text not null,
  description text,
  category text,
  file_url text not null,
  file_type text,
  file_size bigint,
  tags text[] not null default '{}',
  status cms_content_status not null default 'draft',
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  published_by uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Version history: full JSONB snapshot per save/publish
create table cms_content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('cms_pages','cms_news','cms_events','cms_resources')),
  entity_id uuid not null,
  version int not null,
  content jsonb not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);
create index cms_content_versions_lookup on cms_content_versions (entity_type, entity_id, version desc);
create index cms_pages_school on cms_pages (school_id, status);
create index cms_news_school on cms_news (school_id, status, publish_at desc);
create index cms_events_school on cms_events (school_id, status, event_date);
create index cms_resources_school on cms_resources (school_id, status);
```

**RLS (owner = school admin, writer = teachers at the school, reader = everyone for published):**
- `cms_*` SELECT: `status='published'` (public) OR `current_user_is_school_admin(school_id)` OR `current_user_is_teacher_for_school(school_id)`.
- INSERT/UPDATE/DELETE: school admin (full) or teacher (own rows: `created_by = auth.uid()`), plus guard that non-admin cannot set `status='published'` directly (see trigger below).
- Reuse `app_private.current_user_is_school_admin` / `current_user_is_teacher_for_school` from `20260505170000`.

**Trigger `cms_review_workflow`:** on UPDATE, if a non-school-admin attempts to set `status='published'`, force `status='pending_review'`. School admins bypass (check `current_user_is_school_admin(school_id)`).

**Version trigger `cms_version_trigger`:** on INSERT or UPDATE, snapshot the new row into `cms_content_versions` (entity_type from table, version = max+1 per entity). Records content + `created_by`.

**RPCs (pattern: `app_private.cms_*` SECURITY DEFINER + `public cms_*` SECURITY INVOKER wrappers):**
- `cms_submit_for_review(entity_type, entity_id)` — author/teacher moves draft → pending_review.
- `cms_publish(entity_type, entity_id)` — school admin: pending_review/draft → published (sets `published_at`, `published_by`); writes `admin_audit_logs`.
- `cms_reject(entity_type, entity_id, reason)` — school admin: → rejected (sets `rejection_reason`); audit log.
- `cms_list_versions(entity_type, entity_id)` — returns `cms_content_versions`.
- `cms_restore_version(entity_type, entity_id, version)` — school admin; restores a snapshot onto the row (as a new revision, status → draft) + audit log.
- Grant public wrappers to `authenticated`.

### 6.2 Types (`src/integrations/supabase/types.ts`)
Hand-append `CmsContentStatus`, `CmsPage`/`CmsNews`/`CmsEvent`/`CmsResource`/`CmsContentVersion` Row/Insert/Update + Database interface entries, matching the exact generated style (see `GalleryEvent`).

### 6.3 Lib: `src/lib/supabase/cms.ts`
- `getCmsPages(schoolId, { status? })`, `getCmsNews`, `getCmsEvents`, `getCmsResources` (React-friendly, status filter).
- `createCmsPage/updateCmsPage` + same for news/events/resources (every save = a version snapshot via trigger).
- `submitForReview`, `publishCms`, `rejectCms`, `listVersions`, `restoreVersion`.
- `getPublishedSchoolContent(schoolId)` — one call for the public page (published pages + news + events + resources), audience filtering.
- Public read helper reuses the `isSchemaError`/dual-table fallback pattern from `gallery.ts` where helpful.

### 6.4 Frontend — admin CMS page: `src/pages/admin/AdminCms.tsx`
- Route `/admin/cms` (lazy, inside `<RequireAuth allowedRoles={['admin','super_admin']}>`).
- Layout: `container mx-auto px-4 pt-24 pb-8`; header (title + "School CMS") + Breadcrumb to `/dashboard`.
- Tabs (shadcn Tabs): **Pages / News / Events / Resources**.
  - List views with status badges (draft/pending/published/rejected), author, updated-at, filter by status.
  - Editor dialog (shadcn Dialog + Form): title/slug/body (textarea, markdown-aware), hero image upload (reuse `school-assets` upload from `schools.ts`), audience select, publish date.
  - Actions per row: Edit / Submit for review / Publish (admin) / Reject (admin, with reason) / **Version history** (dialog listing versions + Restore button, admin).
- Resources tab: file upload (multi-part to `school-assets` via existing storage helper), category select, tags input (reuse `parseTags` pattern from `StudentGallery.tsx`).
- New admin nav: add "CMS" link in Navbar for admin/super_admin; add a quick-link card in `SchoolAdminDashboard` (`?widget=` deep link is unnecessary; direct `/admin/cms` link).

### 6.5 Public rendering: `src/pages/SchoolProfile.tsx`
- Add tabs **News** and **Events** (published, `publish_at <= now`, not expired, audience public) rendered from `getPublishedSchoolContent`.
- Add a **Resources** section (published public resources list).
- Wire the **About** tab to prefer a published `cms_pages` entry with slug `about` when it exists (fallback to `school.description`).
- Keep existing Gallery/Students tabs; Students tab gets real data in Phase 3.
- Note: `SchoolProfile.tsx` currently uses raw `slate-*` colors (not design tokens) — do a token pass on the touched sections only (`bg-background`, `text-muted-foreground`) for dark-mode consistency.

---

## 7. Phase 3 — Student Management Module (profiles + enrollment)

### 7.1 Migration: `supabase/migrations/student_enrollment.sql`

```sql
create type enrollment_status as enum ('active', 'withdrawn', 'graduated', 'pending');

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  grade_level text,
  class_name text,
  school_year text,
  status enrollment_status not null default 'pending',
  enrolled_at timestamptz not null default now(),
  exited_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id, school_year)
);
create index enrollments_school_status on enrollments (school_id, status);
create index enrollments_student on enrollments (student_id);
```

**RLS:** school admin full CRUD on own school's enrollments; teacher SELECT only (read own school). Reuse existing helpers. No direct `school_id` tampering (guarded by admin check in policies).

**RPC `app_private.admin_update_student_profile(p_student_id, fields jsonb)` + public wrapper `admin_update_student_profile`:** validates caller is school admin of the student's school (or super admin), applies ONLY non-guarded fields (`grade_level`, `class_name`, `bio`, `subjects[]`, `clubs[]`, `interests[]` — whitelist, rejecting anything else), writes `admin_audit_logs`. This is required because profile RLS/guard triggers restrict direct cross-user updates; SECURITY DEFINER with an explicit whitelist is the safe path.

**Enrollment helpers** can be plain RLS-driven CRUD in the lib (no RPC) since `enrollments` is a new table with admin policies. Keep `student_id`→profile validated server-side by FK.

### 7.2 Types (`types.ts`)
Hand-append `EnrollmentStatus`, `Enrollment` Row/Insert/Update.

### 7.3 Lib: `src/lib/supabase/students.ts`
- `getStudentRoster(schoolId, { search, grade, status })` — profiles (role='student', school_id, not pending-rejected) + their latest enrollment (single query, group in JS like `getTaskStatsForProjects`).
- `getStudentDetail(studentId)` — profile + enrollments + recent activity (reuse `getChildOverview`-style aggregation but for admin).
- `updateStudentProfile(studentId, fields)` → invokes `admin_update_student_profile`.
- Enrollment CRUD: `createEnrollment`, `updateEnrollment`, `listEnrollments(studentId)`.
- **CSV export:** `exportRosterCsv(schoolId)` — client-side CSV string → Blob download (mirror `downloadChatExport`). Columns: name, email, grade, class, status, enrolled_at.
- **CSV import:** `parseRosterCsv(text)` — hand-rolled parser (quotes/commas), validate headers, match rows to existing profiles **by email**, then batch-update grade/class via `admin_update_student_profile` per matched row and `upsert` enrollments. Rows with no matching profile are returned as `unmatched` — the UI lists them and offers a generated **invite-join-code CSV** (school join code per row) for the admin to send. **Constraint (documented):** we cannot create auth users server-side without admin access, so import only enriches existing students; invites close the loop via the existing `school_connection_requests` flow.

### 7.4 Frontend: `src/pages/admin/AdminStudents.tsx`
- Route `/admin/students` (lazy, admin/super_admin) + `/admin/students/:id` detail.
- Roster page: search box, grade filter, status filter, table (shadcn Table) with avatar/name/email/grade/class/status, row actions (View / Edit profile / Change enrollment status), **Import CSV** and **Export CSV** buttons, unmatched-import results dialog, empty state.
- Student detail page: header (avatar, name, email, school), tabs **Overview** (profile fields, editable via `updateStudentProfile`) / **Enrollment** (list + add/change status, school_year) / **Activity** (projects + achievements summary).
- Breadcrumb to `/dashboard`; Navbar "Students" link for admin/super_admin; quick-link card in `SchoolAdminDashboard`.
- **Public Students tab fix** (`SchoolProfile.tsx`): replace the 8 placeholder cards with the real roster from `getStudentRoster` (name + grade, avatar or initials). Public privacy: show only name + grade (no email). FERPA note below.

### 7.5 FERPA / privacy compliance (in-scope, minimal)
- Public roster exposure limited to name + grade (no email, no DOB, no contacts).
- Admin access restricted to school admin / teachers of that school via RLS; every `admin_update_student_profile` and enrollment write is recorded in `admin_audit_logs`.
- Document a short FERPA notes section in the roadmap doc (who-can-see-what matrix) and reference it in the agent-log. Full FERPA/GLBA compliance is an operator/legal responsibility; the app implements least-privilege access + auditability.

---

## 8. Phase 4 — refero-design mockups + user testing

- **Design mockups:** before Phase 2/3 UI build, invoke **refero-design** (research-first) for the CMS admin UI and student roster UI: gather 2–3 reference screens each (admin content dashboards; student information systems), record a decision ledger (layout, density, status-badge treatment, table patterns) in `.trae/documents/admin-ui-design.md`, then implement against those locks. Also produce a **mockup document** (screens described + annotated) for the operator to review with stakeholders.
- **User testing:** real stakeholder sessions can't run inside this environment — deliver instead:
  1. A **stakeholder walkthrough guide** (`.trae/documents/school-admin-walkthrough.md`): a scripted tour of each new feature with expected behaviors + acceptance criteria, for the operator to run with school admin stakeholders.
  2. Automated **Playwright QA** against the app (admin account) covering: CMS create→submit→publish→version history→restore; public rendering of published content on `/schools/:id`; roster list/search/filter; enrollment status change; CSV import (matched + unmatched) and export.
  3. Update `.trae/agent-log.md` with the full session summary + MCP invocation table.

---

## 9. Assumptions & Decisions

1. **Full program, phased** — one plan, sequential execution with gates (user-confirmed).
2. **CMS public + internal** — published content renders on public school pages; draft/private admin-only (user-confirmed).
3. **Student module = profiles + enrollment only** — academics/discipline/health/transcripts deferred to roadmap P2 (user-confirmed).
4. **Import cannot create auth users** — CSV import enriches existing profiles by email; unmatched rows produce invite-join-code CSVs (existing connection-request flow closes the loop).
5. **No time estimates** in the roadmap — effort tiers (S/M/L) + priorities (P0/P1/P2) only.
6. **types.ts stays hand-maintained** — no `supabase gen types` (no CLI access in this environment; established convention).
7. **Pre-existing tsc errors** (`chatHistory.ts`, `parent.ts`, `Dashboard.tsx`, `ProjectDetails.tsx`) are out of scope and will not be fixed in this program.
8. **Super admin** gets read/approval powers across schools via existing super-admin RPCs; full school-level management is school-admin scoped. No new platform-level UI except where the existing `SuperAdminDashboard` already covers it.
9. **QA accounts:** verify with an existing/created school-admin account (seed data has 3 approved schools; create a fresh admin if needed via signup + super-admin approval, as done in prior sessions).
10. **Fake placeholder students** on the public `/schools/:id` Students tab are replaced with the real roster (Phase 3) — this is a visible quality win.
11. **Skill usage per user request:** grill-me (Phase 0 audit), refero-design (Phase 2/3 UI + Phase 4 mockups). Both are manual-trigger skills — the executor invokes them at the phase starts, not before.

---

## 10. Verification & Gates (per phase)

1. Migration applied via `integrated_web-dev supabase_apply_migration`; tables verified via `supabase_get_tables` (RLS on, FKs correct).
2. `npx tsc -p tsconfig.app.json --noEmit` → only pre-existing out-of-scope errors remain (exit 2 acceptable); **zero new errors**.
3. `npm run lint` → 0 errors (11 pre-existing react-refresh warnings OK).
4. `npm run build` → exit 0.
5. Playwright QA (per feature, admin account) — scenarios listed in Phase 4 §2; mobile 375px overflow check on new pages; dark-mode spot check.
6. Append each phase to `.trae/agent-log.md` (task table + MCP invocation table + verification bullets).
7. On full completion: `integrated_goal update_goal {"status":"complete"}` and final report to user.

---

## 11. Execution Order (summary for executor)

A. Phase 0 audit (grill-me) → `school-admin-audit.md`
B. Phase 1 roadmap (WebSearch) → `school-admin-roadmap.md`
C. Phase 2 CMS: migration+apply → types → lib → AdminCms page → SchoolProfile public rendering → gates
D. Phase 3 students: migration+apply → types → lib → AdminStudents pages → SchoolProfile Students fix → CSV import/export → gates
E. Phase 4: refero-design mockups doc → walkthrough guide → full Playwright QA sweep → agent-log → goal complete → final report
