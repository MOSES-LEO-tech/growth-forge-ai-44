# Phase 1 — Security & Data Hygiene Runbook

Project: **Milestone** (`tobclczszdikmgvkvngf`, eu-central-1)
Prepared: 2026-11-10 · Execution: manual (dashboard SQL editor)
Owner: Moses (super_admin)

> **Why manual:** the connected Supabase MCP exposes `restore/pause/notebooks`,
> but no `apply_migration`/`execute_sql`, and notebook DDL is refused because the
> client cannot service Supabase's confirmation form. Every statement below must
> be run in **Dashboard → SQL Editor**. Nothing here can be applied by the agent.

## Fast path — four files, four runs

The scripts are pre-combined in `supabase/scripts/apply/` so each step is one
copy-paste. They are the same SQL as the per-step files below.

| Order | File | Destructive? |
|---|---|---|
| 1 | `apply/01_schema_pending.sql` — the 4 migrations that never reached production | no (additive, one transaction) |
| 2 | `apply/02_security_hardening.sql` | no (revokes + bucket caps) |
| 3 | `apply/03_backup.sql` | no (creates `phase1_backup`) |
| 4 | `apply/04_reset_data.sql` — keep **only** the super_admin | **YES** — rehearse with `rollback` first |

Steps 1–3 can run any time. Do **not** run 4 before 3.

After step 4, empty the five storage buckets in Dashboard → Storage (SQL only
deletes metadata, not the files).

`apply/04_reset_data.sql` supersedes the earlier demo-preserving purge
(`supabase/scripts/phase1/02_purge_qa.sql`); use one or the other, never both.

---

## 0. Order of operations

| # | Step | File / location | Reversible |
|---|---|---|---|
| 1 | Backup all affected rows | `supabase/scripts/phase1/01_backup.sql` | yes (read-only) |
| 2 | Rehearse the purge | `02_purge_qa.sql` with `commit;` → `rollback;` | yes |
| 3 | Commit the purge | `02_purge_qa.sql` as written | **no** — restore from step 1 |
| 4 | Security hardening | `03_security_hardening.sql` | yes |
| 5 | Demo admin credentials | Dashboard → Authentication → Users | yes |
| 6 | Leaked-password protection | Dashboard → Authentication → Providers → Email | yes |
| 7 | Verify | `04_verify.sql` | read-only |

Run **1 → 2 → 3 → 4 → 5 → 6 → 7** in that order. Do not run 3 before 1.

---

## 1. Backup (must run first)

Paste `01_backup.sql`. It creates schema `phase1_backup` and copies every table
the purge can touch. `create table if not exists` means re-running never
overwrites the original snapshot.

Expected: a final count table with `auth_users`, `profiles`, `schools`,
`enrollments`.

## 2. Rehearse

Paste `apply/04_reset_data.sql`, then **replace the final `commit;` with
`rollback;`** before running. Read the reported metrics and compare:

| Metric | Expected after reset |
|---|---|
| `profiles_remaining` | **1** |
| `super_admins` | **1** |
| `auth_users_remaining` | **1** |
| `schools` | **0** |
| `projects` | **0** |
| `achievements` | **0** |
| `gallery_events` | **0** |
| `cms_pages` | **0** |
| `scholarships` | **0** |
| `notifications` | **0** |
| `settings` | **4** (kept) |
| `llm_config` | **3** (kept) |

The rehearsal also prints any **real-domain logins** in the deletion set — review
that list before committing. If your numbers differ materially, stop and re-read §3.

## 3. Reset scope — super_admin only

`apply/04_reset_data.sql` deletes **every** identity, school and content row, and
keeps exactly one profile + auth user: the `super_admin`
(`mosesleo002@gmail.com`). It keeps `settings` and `llm_config`, which are platform
configuration rather than user content.

The script aborts unless there is exactly one super_admin profile **and** a
matching `auth.users` row, so a mis-scoped run cannot lock you out.

### Two real logins fall inside the deletion set

| Account | Role | Evidence |
|---|---|---|
| `marklot001@gmail.com` | student at Lighthouse STEM Academy | `last_sign_in_at` 2026-08-28 |
| `devis001@gmail.com` | teacher, no school | `last_sign_in_at` 2026-05-05 |

Neither is a QA fixture; both are on real domains. They are deleted because the
instruction is super-admin-only. The script prints this list during the rehearsal —
if either should survive, tell them first or edit the `_keep` selector to include
`p.id`, then re-rehearse.

`joshtop@gmail.com`, `josh001@gmail.com` and `job@gmail.com` are also removed
(you confirmed josh001/job are your own test signups).

### What the app looks like afterwards

One account, zero schools, zero portfolios, zero galleries, zero scholarships.
The public site still renders (marketing pages need no data), sign-in works, and
registration works — the first school you create becomes the first real row in the
database. Storage files must be emptied separately in the dashboard.

## 4. Security hardening

Paste `03_security_hardening.sql`. Closes the advisor findings:

- `settings` was selectable by **anon** (feature flags, contact email exposed).
- `llm_config` was selectable by every signed-in user.
- `notify_school_connection_approved()` was executable as an RPC by anon and
  authenticated — it is a trigger function and must not be an endpoint.
- `avatars`, `gallery-media`, `project-media`, `project-documents` had **no**
  size or MIME limits.

Post-check must return `should_be_false = false` for all three privilege rows.

## 5. Super admin credentials

After the reset, the super_admin is the only account left. In
**Authentication → Users**, set a fresh password for it (do not reuse any password
that appears in `supabase/scripts/qa/`), and enable MFA if you want it.

**Never** commit the password. The QA fixture files that still contain bcrypt
hashes live under `supabase/scripts/qa/` and are no longer applied automatically.

## 6. Leaked-password protection

Authentication → Providers → Email → enable **Prevent use of leaked passwords**
(HaveIBeenPwned check). Dashboard-only; not expressible in SQL.

## 7. Verify

The reset script ends with its own report — that is the primary check. Confirm by
pasting this afterwards:

```sql
select
  (select count(*) from public.profiles)                       as profiles,
  (select count(*) from public.profiles where role='super_admin') as super_admins,
  (select count(*) from auth.users)                            as auth_users,
  (select count(*) from public.schools)                        as schools,
  (select count(*) from public.projects)                       as projects,
  (select count(*) from public.scholarships)                   as scholarships,
  (select count(*) from public.settings)                       as settings,
  (select count(*) from public.llm_config)                     as llm_config;
```

Acceptance:

- [ ] `profiles = 1`, `super_admins = 1`, `auth_users = 1`
- [ ] `schools = 0`, `projects = 0`, `scholarships = 0`
- [ ] `settings = 4` and `llm_config = 3` (kept deliberately)
- [ ] the super_admin can still sign in
- [ ] all five storage buckets emptied in Dashboard → Storage
- [ ] `phase1_backup` schema exists (your undo path)

## Rollback

The purge cannot be undone from git. Restore from the step-1 snapshot:

```sql
begin;
-- children first, then parents (FK order)
insert into public.profiles        select * from phase1_backup.profiles        on conflict (id) do nothing;
insert into public.schools         select * from phase1_backup.schools         on conflict (id) do nothing;
insert into public.school_join_codes select * from phase1_backup.school_join_codes on conflict (id) do nothing;
insert into public.enrollments     select * from phase1_backup.enrollments     on conflict (id) do nothing;
insert into public.cms_pages       select * from phase1_backup.cms_pages       on conflict (id) do nothing;
insert into public.cms_news        select * from phase1_backup.cms_news        on conflict (id) do nothing;
insert into public.cms_events      select * from phase1_backup.cms_events      on conflict (id) do nothing;
insert into public.cms_resources   select * from phase1_backup.cms_resources   on conflict (id) do nothing;
insert into public.projects        select * from phase1_backup.projects        on conflict (id) do nothing;
insert into public.achievements    select * from phase1_backup.achievements    on conflict (id) do nothing;
insert into public.gallery_events  select * from phase1_backup.gallery_events  on conflict (id) do nothing;
commit;
```

`auth.users` rows cannot be restored by SQL insert (GoTrue manages its own
schema); restore those from **Dashboard → Authentication → Users → Add user** if
ever needed. This is the one genuinely irreversible part — which is why step 2
(rehearse) exists.

## Post-phase follow-ups (Phase 2)

1. Move `qa_*.sql` out of `supabase/migrations/` into `supabase/scripts/qa/` so
   `db push` never seeds production again.
2. Reconcile migration history (43 repo files vs 56 applied; timestamps rewritten
   by MCP). Squash to a baseline + forward migrations.
3. Add a staging project (free slot is freed once the empty orphan
   `yxlrwokhrwurwssgbslr` is deleted in the dashboard).
4. Apply the three unapplied migrations (`school_announcements`,
   `school_cms_media`, `school_admin_repairs`) — see Phase 0 notes.
