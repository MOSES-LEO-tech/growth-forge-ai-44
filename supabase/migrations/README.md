# Migration history — current truth and how to fix it

**Status: the repo and the production database disagree.** This file records the
gap, the mapping applied on 2026-11-10, and the procedure that closes it.

## Where things stand

| | Count |
|---|---|
| Migrations applied to `tobclczszdikmgvkvngf` | **56** |
| Migration files in this directory | **44** |
| Repo files never applied | **4** (now timestamped `20261110…`) |
| Non-conforming filenames before 2026-11-10 | **10** (`school_cms.sql`, `ai_llm_config.sql`, …) |

Two causes:

1. **Renamed on apply.** Migrations pushed through the MCP were recorded under
   server-assigned timestamps and the *file basename*, so the repo's timestamp
   never matched the applied version. Several were also split on the server
   (`super_admin_security_audit_telemetry` became seven migrations).
2. **Seeds lived in `migrations/`.** `qa_*.sql` and `seed_launch_data.sql` ran as
   migrations against production, which is how QA accounts and demo schools
   ended up in the live database.

**Consequence:** `supabase db push` from this directory is unsafe — it would try to
re-apply migrations the database already ran, and it cannot order the 10 files
whose names were not timestamps.

## Renames applied on 2026-11-10

Repo file → actual applied version. Content was not modified; only the filename,
so the repo now states the same history the database holds.

| Old filename | New filename (= applied version) |
|---|---|
| `ai_llm_config.sql` | `20260817164744_ai_llm_config.sql` |
| `cms_admin_audit_fix.sql` | `20260821143516_cms_admin_audit_fix.sql` |
| `gallery_folders_and_tags.sql` | `20260818154144_gallery_folders_and_tags.sql` |
| `gamification_removal.sql` | `20260817183402_gamification_removal.sql` |
| `notification_center_and_profile_prefs.sql` | `20260817133601_notification_center_and_profile_prefs.sql` |
| `project_documents.sql` | `20260817185703_project_documents.sql` |
| `project_tasks_and_progress.sql` | `20260817185605_project_tasks_and_progress.sql` |
| `scholarship_applications_table.sql` | `20260817092410_scholarship_applications_table.sql` |
| `school_cms.sql` | `20260821135611_school_cms.sql` |
| `school_public_roster.sql` | `20260821144002_school_public_roster.sql` |
| `student_enrollment.sql` | `20260821143508_student_enrollment.sql` |

**Caveat:** the rename asserts version parity, not content parity. If a file was
edited after it was applied, the name now claims something the body does not
honour. Confirm with `supabase db diff` before trusting a push.

## Four migrations that never reached production

These are real code the app already ships against — see
`docs/operations/phase1-security-runbook.md` for the Phase 0 finding.

| File | Why it matters | If left unapplied |
|---|---|---|
| `20261110000000_role_workspaces_onboarding.sql` | adds `profiles.education_system`, `onboarding_completed_at`, `notification_prefs` | onboarding completion, education system and notification prefs fail — the columns do not exist |
| `20261110000100_school_cms_media.sql` | adds `school_gallery_media` + `schools.hero_video_url/tagline/founded_year` | school page editor and media gallery 500 |
| `20261110000200_school_admin_repairs.sql` | adds `academic_years/classes/subjects` + admin approval RPCs | academic structure page 500 |
| `20261110000300_school_announcements.sql` | adds `school_announcements` + publish RPC | announcements UI 500 |

They carry `20261110…` so they sort after the 56 applied versions and apply
next, in dependency order.

## Rule: seeds are not migrations

- `supabase/migrations/` — schema only. Must be reproducible and ordered.
- `supabase/scripts/qa/` — QA fixtures (`qa_seed`, `qa_repair*`, `qa_set_passwords`,
  `qa_admin_password`, `qa_fix_null_tokens`). Never auto-applied.
- `supabase/scripts/seeds/` — launch/demo data (`seed_launch_data.sql`).
- `supabase/scripts/phase1/` — the one-off production cleanup (backup, purge,
  hardening, verification).

Test data reaches a database only by an explicit, human-run command.

## Closing the gap (requires Supabase CLI + DB password + access token)

1. **Prove the drift is only naming:**
   `supabase db diff --linked` — expect no schema differences against the 56
   applied versions. Investigate anything it reports before step 2.
2. **Repair history** so the remote records the repo filenames:
   `supabase migration repair --status applied <version>` for each version in the
   mapping table (and `--status reverted` for any the repo no longer contains,
   e.g. the diagnostic migration `20260821201239`).
3. **Apply the four pending:**
   `supabase db push` — it should list exactly `20261110000000` →
   `20261110000300`.
4. **Verify:** `supabase migration list` shows repo and remote in lockstep;
   then run `supabase/scripts/phase1/04_verify.sql` for the data checks.
5. **Only then** add CI: `supabase db lint` + a dry-run `db push --dry-run` on PRs.

Until steps 1–4 run, treat this directory as documentation of intent, **not** as a
deployable migration chain.
