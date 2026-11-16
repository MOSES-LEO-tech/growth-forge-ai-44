# Plan — per-role onboarding, bidirectional linking, honest numbers

Date: 2026-11-10 · Status: **proposal, awaiting approval** · Scope: Milestone

Grounded in the current repo, not an idealised version. Every "today" claim cites
a file. Two findings reshape the whole plan and are stated first because they
invalidate a naive reading of the request.

## 0. Starting conditions (verified)

| Fact | Evidence | Consequence |
|---|---|---|
| Onboarding exists **twice**: `SignupOnboarding` (3 generic steps, role branch only in step 3) and `RoleOnboardingWizard` (per-role step sets, post-login) | `src/components/SignupOnboarding.tsx:182`; `src/components/RoleOnboardingWizard.tsx:47-67` | Two sources of truth for the same profile fields; they already differ |
| The columns both paths write **do not exist in production** | `education_system`, `onboarding_completed_at`, `notification_prefs` only in `supabase/migrations/20261110000000_role_workspaces_onboarding.sql:8-10`, which is unapplied | `completeOnboarding()` writes a non-existent column; onboarding cannot succeed today |
| Parent→student linking calls an RPC that **does not exist in production** | `link_parent_to_student_by_email` defined only in the same unapplied migration (`:13`, `:51`); called from `src/lib/onboarding.ts:54-60` | Parent linking always throws; the error is swallowed as "best effort" (`onboarding.ts:103-105`) |
| Parent links have **no state, no consent, no initiator** | `parent_child_links(id, parent_id, child_id, created_at, UNIQUE(parent_id,child_id))` — `20260501010000_dashboard_schema_repair.sql:278-284` | A parent can bind a child by typing an email; the child has no say and no notification |
| School links **are** stateful | `school_connection_requests(status, decided_by, decided_at, rejection_reason)`; `school_join_codes(is_active, expires_at)` | School side is the model to copy, not the one to rebuild |

### Assumptions

1. The four unapplied migrations will be applied before any linking work (workstream W0).
2. One account = one role. Multi-role people (a teacher who is also a parent) get a second account or a future role-switch; not in this scope.
3. Schools are created by Milestone support / super_admin today; self-registration stays out of scope.
4. Email is the only auth provider; no phone/SMS verification exists, so consent proofs are in-app, not SMS.
5. Uganda is the primary market; minors are the main student population.

### Unknowns (need answers before W4)

| # | Unknown | Why it blocks |
|---|---|---|
| U1 | Legal age of majority to assume consent (18?) and whether a guardian must approve a **student-initiated** parent link | Determines whether student consent is required at all |
| U2 | Can a parent see a child's data **before** the child accepts? | Sets the default state machine direction |
| U3 | Should a school admin be able to see a student who is merely **pending** connection? | Drives RLS, not just UI |
| U4 | Do students ever enrol themselves into a school, or only via a code issued by staff? | Decides whether a school→student invitation flow is needed at all |

### Decisions taken (2026-11-10)

| # | Question | Decision |
|---|---|---|
| D1 | How a parent↔child link becomes active | Student accepts; **if the student is a minor, the guardian link auto-activates** (guardian-of-record wins) |
| D2 | Can schools see a pending student? | Yes — **name + grade only** while `pending` |
| D3 | How students join a school | **Codes only.** Staff issue a code; students enter it. No admin-initiated invites, no roster-import links |
| D4 | First workstream | W2 (numeric contract) — no database dependency |

Consequences: U4 is closed (no school→student invitation flow). The roster CSV
import stays an **account/roster** tool for a school's already-enrolled students,
not a link-invitation mechanism — it cannot create pending links (D3).

## 1. User types, entry points, requirements

| Role | Entry point today | Required data | Verification | Approval | Can link to |
|---|---|---|---|---|---|
| **Student** | `/auth` → Sign up (role picker) → inline details | full name, email, password, education system, grade, class (opt), interests (opt) | email confirmation (Supabase) | none | school (by code, needs admin approval); parent (accept/decline) |
| **Parent / guardian** | same picker, `parent` | full name, email, password, child's email (opt) | email confirmation | none | child (needs child or school consent); school (read-only, via child's enrolment) |
| **Teacher** | same picker, `teacher` | full name, email, password, school join code, subjects (opt) | email confirmation | **school admin approves** the connection | school (code + approval); students (indirectly, through school) |
| **School admin** | same picker, `admin` | full name, email, password, school name, location, country, description | email confirmation | **super_admin approves the school application** | own school; its students/teachers (roster) |
| **Super admin** | seeded manually | — | — | — | everything (audit-logged) |

## 2. Canonical model

### Entities

| Entity | Table | Identity | Cardinality |
|---|---|---|---|
| Account | `auth.users` + `public.profiles` | `profiles.id = auth.users.id` | 1:1 |
| School | `schools` | `schools.id` | 1:N students, teachers |
| Enrolment | `enrollments` | `(school_id, student_id)` | student may have many over time; **one active** |
| School link request | `school_connection_requests` | `id` | many per user over time; **one open** |
| Join code | `school_join_codes` | `id`, unique `code` | many per school, one active |
| Guardian link | **`parent_student_links`** (new, replaces `parent_child_links`) | `id` | many parents per child; many children per parent |

### Link states (one enum, both domains)

`invited → pending → active`, plus terminal `declined | expired | revoked`.

| State | Meaning | Who can move it |
|---|---|---|
| `invited` | created by the higher-trust side, not yet seen | system on create |
| `pending` | awaiting the other party's decision | the non-initiating side accepts/declines |
| `active` | link grants permissions | either side revokes |
| `declined` | refused; immutable, re-invitable after 24 h | — |
| `expired` | invite TTL passed (default 14 days) | system |
| `revoked` | was active, ended; history retained | either side, or admin |

### Rules

1. **One active link per (child, parent) pair**; partial unique index on `(child_id, parent_id) WHERE state='active'`.
2. **Duplicate prevention**: `UNIQUE (parent_id, child_id, state)` is wrong (blocks history). Use a partial unique index for `active`, and a check that a new `pending` is rejected while another `pending` exists for the same pair.
3. **Source of truth**: the link row is authoritative; `profiles.school_id` is a **cached** convenience column, written only by a trigger on the link table, never by clients.
4. **Direction symmetry**: every link is readable from both sides (`parent → child` and `child → parent` are the same row; the UI queries by the caller's side).
5. **Audit**: every state transition writes `admin_audit_logs` (or a new `link_events`), including actor, from-state, to-state, reason.

## 3. Per-role onboarding flows

Shared shell: `/auth` → role selected once → **one wizard component** driven by a
role config (replaces both existing paths). Steps are skippable only where marked.

### 3.1 Student

| # | Step | Fields | Validation | Notes |
|---|---|---|---|---|
| 1 | Identity | full name, email, password | email format, password ≥ 8 + strength met, name ≥ 2 | creates account |
| 2 | Schooling | education system, grade | both required | education system from `EDUCATION_SYSTEMS` |
| 3 | Class & interests | class name, interests (opt) | free text, comma-split | skippable |
| 4 | Join a school (opt) | join code | 4+ chars; invalid code is a **soft** failure | creates `school_connection_requests(state=pending)` |
| 5 | First success | dashboard with empty-state checklist | — | `onboarding_completed_at` set |

Failure/recovery: invalid code → stay on step, show "code not recognised or expired", allow skip, allow retry later from Settings. Account creation never blocked by step 4.

### 3.2 Parent / guardian

| # | Step | Fields | Validation | Notes |
|---|---|---|---|---|
| 1 | Identity | name, email, password | as above | |
| 2 | Child link | child's email **or** child's join-code | must resolve to a student | creates `parent_student_links(state=pending)`, **never active** |
| 3 | Consent notice | explicit checkbox: "I am this child's parent/guardian" | required | recorded with timestamp + IP |
| 4 | First success | parent workspace showing the pending link + what will unlock | — | |

### 3.3 Teacher

| # | Step | Fields | Validation | Notes |
|---|---|---|---|---|
| 1 | Identity | name, email, password | as above | |
| 2 | School | join code | required; invalid is a **hard** failure | creates pending request |
| 3 | Subjects | subjects (opt) | free text | |
| 4 | Await approval | — | — | account is `account_status=pending`; workspace shows "waiting for <school> admin" |

### 3.4 School admin

| # | Step | Fields | Validation | Notes |
|---|---|---|---|---|
| 1 | Identity | name, email, password | as above | |
| 2 | School details | name, location, country, description | name ≥ 2 | creates `schools(approval_status=pending)` |
| 3 | Await approval | — | — | workspace locked to a status screen until super_admin approves |
| 4 | First success | school workspace with join code + empty roster | — | code generated on approval (`ensure_active_school_code`) |

### 3.5 Super admin

No onboarding. Seeded, audit-logged; dedicated section in the plan's W11.

**Acceptance (all roles):** each role reaches a distinct first screen; no role can
reach another role's first screen; `onboarding_completed_at` is set exactly once;
abandoning midway resumes at the same step.

**Analytics events:** `onboarding_started{role}`, `onboarding_step_viewed{role,step}`,
`onboarding_step_completed{role,step}`, `onboarding_abandoned{role,step}`,
`onboarding_completed{role,seconds_to_complete}`.

## 4. Linking flows, both directions

### 4.1 Student ↔ school

| Direction | Initiation | Method | Approval | States |
|---|---|---|---|---|
| Student → school | student enters join code | `school_join_codes.code` | **school admin** | pending → active / declined; code expiry → expired |
| Staff → school | teacher enters code | same | school admin | pending → active |

**Codes only (D3).** There is no admin-initiated student invite and no
roster-import link creation. A school cannot pull a student in; the student (or
their guardian) must present the code.

Re-linking after revocation: blocked for 24 h; requires a fresh code.

### 4.2 Parent ↔ student (the broken one)

Replaces instant RPC binding.

| Direction | Initiation | Method | Consent | States |
|---|---|---|---|---|
| Parent → student | parent enters child email | lookup by email | **student accepts**; if the student is below the consent age, the link **auto-activates** under guardian-of-record (D1) | pending → active |
| Student → parent | student invites parent email | invite token | parent accepts | invited → pending → active |
| Parent → school | none direct | derived from the child's active enrolment | — | read-only |

Guardian consent (D1): a parent's checkbox is an assertion, not proof. The rule that
resolves it is *minority*, stored on the student's profile as a guardian-of-record
link plus date of birth. Above the consent age the student's acceptance is required;
below it, the guardian's assertion activates the link and the student sees a notice
("your guardian connected their account") rather than an approval prompt.

### 4.3 Roster import / join codes

- Admin exports/imports CSV: `name,email,grade,class` (exists in the school admin
  workspace). Import creates **invited** links, not accounts.
- Join code: rotate (`rotate_school_join_code`), expiry, one active per school.
- Revocation: code rotation kills outstanding pending requests only on expiry.

### 4.4 Link lifecycle rules

| Rule | Value |
|---|---|
| Invite TTL | 14 days → `expired` |
| Re-invite cooldown after decline | 24 h |
| Max open requests per user | 3 |
| Revocation effect | permissions drop immediately; history retained |
| Re-linking | new row; old row keeps `revoked` |

## 5. Permissions and visibility by state

| Relationship | State | Student sees | Parent sees | School sees |
|---|---|---|---|---|
| student↔school | none | — | — | nothing |
| | pending | "request sent" | — | request in queue (name + grade only, per U3) |
| | active | school content, announcements | child's school name only | portfolio per school policy |
| | declined | reason + retry | — | reason recorded |
| | revoked | no school content | — | archive row |
| parent↔child | pending | "parent requests access" | "waiting for <child>" | — |
| | active | parent visible in profile | child's projects/achievements | — |
| | declined | hidden | "declined" only, no data | — |
| | revoked | removed | no access, history retained | — |

Minor-account rules: a student under the consent age has a **guardian-of-record**
field; revocation by the guardian overrides student preference. All transitions are
audit-logged; super_admin reads are logged as `sensitive_read`.

## 6. Edge cases and recovery

| Case | User sees | System does | Admin can |
|---|---|---|---|
| Wrong school code | "Code not recognised or expired" + retry/skip | no request created | rotate code, inspect |
| Duplicate account (same email, different role) | "An account with this email exists" | blocks creation | merge manually (W11) |
| Existing active link | "Already connected" | no-op | revoke |
| Expired invite | "Invite expired — ask for a new one" | state=expired | re-invite |
| Name mismatch on roster import | "Matches 1 student with a similar name — confirm" | requires explicit confirm | force-match |
| Parent links multiple students | list of children, each its own state | allowed | inspect |
| Student changes school | old link revoked on approval of new one | one active enrolment enforced | transfer |
| Revoked consent (guardian) | "Access removed by guardian" | immediate revoke + audit | view audit |
| Disputed guardianship | "This link is under review" | state frozen, support queue | arbitrate, override with reason |
| Incomplete onboarding | resume banner; route guard keeps them in flow | `onboarding_completed_at` null | reset flag |

## 7. Numeric wiring audit

| # | Location | Displayed as | Source today | Real? | Defect |
|---|---|---|---|---|---|
| 1 | `schools.ts:33` `totalParents: 0` | school stats tile | constant | **No** | invented zero shown as measured |
| 2 | `schools.ts:36` `aiUsageCount: 0` | school stats | constant | **No** | same |
| 3 | `Schools.tsx:132-135` `{school.student_count && …}` | "N Students" | `public-data` count | Yes, but | **`0 &&` renders a literal 0** |
| 4 | `SchoolProfile.tsx:235` `{stats?.total_students \|\| 0}` | big stat | RPC count | Yes, but | loading/error collapse to **0** |
| 5 | `parent.ts:69-72` counts | child overview | real queries | Yes | no loading contract, `\|\| 0` |
| 6 | `parent.ts:121-122` `files_count`, `my_comments_count` | project card | nested count | Yes | same |
| 7 | `teacher.ts` (rewritten) analytics | teacher tiles | real aggregates | **Yes (fixed)** | none after fix |
| 8 | `GrowthAnalyticsWidget` `aiUsage` | 30-day bars | `smartbuddy_usage` | **Yes (fixed)** | none after fix |
| 9 | `ProjectDetails` rating stars | 5 gold stars | invented | **Removed** | gone |
| 10 | join-code expiry | "expires in N days" | `expires_at` | Yes | needs null handling (`expires_at` nullable) |
| 11 | pending-approvals counts (`PendingApprovalsWidget`) | badge counts | `school_connection_requests` | Yes | `\|\| 0` on error |

Rule to enforce: **a number on screen is either a real measurement with a known
state, or an em dash.** Never a plausible default.

## 8. Technical contract for numbers

```ts
// src/lib/numeric.ts
export type NumericValue =
  | { state: 'loading' }
  | { state: 'ready'; value: number }
  | { state: 'empty' }        // known to be "no data", distinct from 0
  | { state: 'error'; error: string }
  | { state: 'unavailable' }; // feature not measured at all

export const ready = (value: number | null | undefined): NumericValue =>
  value == null || Number.isNaN(value) ? { state: 'empty' } : { state: 'ready', value };

export function formatNumber(
  v: NumericValue,
  opts: { locale?: string; unit?: 'count' | 'percent' | 'bytes' | 'money'; fallback?: string } = {}
): string {
  if (v.state !== 'ready') return opts.fallback ?? '—';
  const n = v.value;
  if (!Number.isFinite(n)) return '—';
  // zero renders as 0; negative values are preserved where the domain allows them
  return new Intl.NumberFormat(opts.locale ?? 'en-UG', { maximumFractionDigits: 1 }).format(n);
}
```

Enforcement:
- **API boundary**: every `lib/supabase/*` mapper returns `NumericValue`, never a bare number, for anything that can be absent.
- **Ban `|| 0` / `?? 0` in render paths** via an ESLint `no-restricted-syntax` rule scoped to `src/pages/**` and `src/components/**`.
- **Zero is not absence**: `ready(0)` renders "0"; `empty` renders "No data yet"; `error` renders "Couldn't load".
- **Units/locale**: one formatter, `Intl.NumberFormat`, locale from `profiles.timezone`/settings; percentages formatted with `style:'percent'` after division, never pre-multiplied strings.
- **Tests**: property-based test asserting the formatter never returns a digit for `loading|empty|error|unavailable`, and returns `"0"` for `ready(0)`.

## 9. Sequenced implementation

| W | Workstream | Depends on | Artifacts | Definition of done |
|---|---|---|---|---|
| **W0** | Apply schema | — | `scripts/apply/01_schema_pending.sql` | 4 migrations applied; `education_system`, `onboarding_completed_at` exist; `link_parent_to_student_by_email` exists |
| **W1** | Model + states | W0 | **DONE (SQL authored)**: `supabase/migrations/20261110110000_link_states.sql` — `link_state` enum, `parent_student_links`, `link_events`, transition trigger, expiry sweep, guarded legacy backfill | state machine rejects illegal transitions in SQL; audit row per transition; apply with `db push` |
| **W2** | Numeric contract | — (parallel) | **DONE**: `src/lib/numeric.ts`, `tests/unit/numeric.test.ts` (13 tests), ESLint `no-restricted-syntax` warn rule in `eslint.config.js` | formatter tests green; rule fires on **36** existing `\|\| 0` / `?? 0` render sites — flip to `error` in W9 |
| **W3** | Account creation + role assignment | W0 | **DONE (client half)**: DB guard already existed (`app_private.guard_profile_sensitive_update`, migration 20260505170000 — verified); added `src/lib/profileFields.ts` allow-list + `sanitizeProfileUpdate()`, wired into `updateProfile`, 11 tests | privileged fields (role, school_id, account_status, approved_*) cannot be written by an owner; duplicate email enforced by Supabase Auth |
| **W4** | Per-role onboarding | W1, W3 | **PARTIAL**: `src/lib/onboardingFlows.ts` (flows, `validateStep`, `canSkip`, 15 tests) and `RoleOnboardingWizard` now reads `onboardingSteps(role)` — its local `STEP_SETS` is deleted. **REMAINING**: `SignupOnboarding` still collects role fields inline | config + validation + wizard pass; `SignupOnboarding` must consume the same config (needs live-auth verification) before W4 is complete |
| **W5** | Link APIs | W1 | **DONE (SQL authored)**: `20261110120000_parent_link_rpcs.sql` — `request_parent_link`, `invite_parent_link`, `accept_parent_link`, `decline_parent_link`, `revoke_parent_link`, `my_parent_links`, legacy `link_parent_to_student_by_email` re-pointed to consent flow | both directions callable; duplicate/cooldown handled; only the non-initiator can accept |
| **W6** | Consent + invitations | W5 | **DONE**: consent columns landed in W1 (`consent_source`, `guardian_asserted_at`); 24h cooldown enforced in `request_parent_link` (W5); `src/lib/linkPresentation.ts` (status/expiry/cooldown/actionability, 14 tests, TDD); `20261110130000_link_expiry_cron.sql` schedules the sweep hourly when pg_cron exists | every state reachable and rendered; expiry runs unattended or raises a no-op notice |
| **W7** | Permissions + audit | W1, W5 | **SQL authored**: `20261110140000_link_permissions_audit.sql` — `school_pending_students()` exposes only name+grade+request date for pending connections (D2), `log_sensitive_read()` writes append-only audit rows, anon execute revoked. `parent_student_links` read policy already landed in W1 | authored, not executed — the §5 matrix still needs an RLS test run against a real database |
| **W8** | UI screens | W4, W5 | **PARTIAL**: `src/lib/linkActions.ts` (10 tests), `src/lib/supabase/links.ts` (RPC wrappers + row mapping), `src/components/links/ParentLinkPanel.tsx` (loading / error / empty / list states, accept·cancel·revoke·reinvite), `types.ts` extended with the 7 new RPCs. **NOT MOUNTED** into ParentWorkspace or the student dashboard | panel compiles, lints and its logic is tested; it is not yet reachable by a user |
| **W9** | Numeric display rollout | W2 | **DONE**: 36 sites resolved — display fields via `formatNullable`, `SuperAdminDashboard` stat cards via `ready()`/`fmt()`, 4 geometry/sort sites annotated with reasons; ESLint rule flipped to **error** | lint 0 errors / 12 pre-existing warnings; rule passes on the whole repo |
| **W10** | Backfill + migration | W1, W5 | **SQL authored**: legacy copy happened in W1; `20261110150000_link_backfill_reconcile.sql` removes self-links, revokes role-mismatched pairs, revokes duplicate actives (keeps earliest), exposes `legacy_links_needing_reconfirmation` (service-role only) and `link_backfill_report()` | re-runnable; report returns counts for the six reconciliation buckets |
| **W11** | Analytics + admin tooling | W4, W5 | **PARTIAL**: `20261110160000_analytics_support.sql` — `analytics_events` + `track_event()` (PII + 2 KB guards), `support_find_account()`, `support_reset_onboarding()` (both super_admin, audited); `src/lib/analytics.ts` (sanitiser + `track()` + event-name constants, 8 tests). **NOT BUILT**: the support console UI | telemetry writes are safe and tested; support still works via SQL/RPC, not a screen |

Critical path: W0 → W1 → W5 → W6/W7 → W8 → W9. W2 can ship independently and should
ship first because it is the cheapest visible win.

## 10. Acceptance tests and launch criteria

### Unit
- `formatNumber`: never a digit for non-ready states; `ready(0)` → "0"; negatives preserved.
- state-machine reducer: every legal transition allowed, every illegal one rejected.

### API contract
- Each link RPC: happy path, duplicate attempt, wrong-role attempt, expired invite, self-link.
- Onboarding persistence: partial completion is resumable; `onboarding_completed_at` set once.

### Integration (RLS)
- Table-driven test over §5 matrix: for each (relationship, state, viewer role) assert
  visible/denied. Pending parent sees **nothing**; active sees the child's portfolio;
  revoked sees nothing but history row exists.

### End-to-end (Playwright)
1. Student signup → own dashboard → join school → pending → admin approves → active.
2. Parent signup → request child → student accepts → active; then student declines case.
3. Teacher signup → code → admin approves → teacher workspace.
4. Admin signup → school pending → super_admin approves → workspace + join code.
5. Both link directions resolve from each side's UI.
6. Revocation drops access on the next request (no stale cache).

### Launch criteria (all must hold)
- [ ] W0 applied; the four features that disappeared come back with real data.
- [ ] Each of the 5 roles has a **distinct** onboarding flow and first screen.
- [ ] Every link is visible and actionable from both sides.
- [ ] Permissions match relationship state in automated tests, not just by inspection.
- [ ] No `NaN`, `undefined`, `null`, `""`, mock, placeholder or hardcoded number
      renders in a numeric slot — enforced by lint + E2E.
- [ ] `ready(0)` still renders `0` (zero is data, not absence).
