# Role-Based Workspaces — Design

**Date:** 2026-08-22
**Status:** Approved (implemented)
**Skills used:** brainstorming, refero-design, supabase, supabase-postgres-best-practices

## Problem

The app's routes are effectively role-open: any signed-in user can open `/projects`,
`/gallery/personal`, `/buddy`, `/recommendations`, or `/my-applications`, and the nav
strip shows the same links to everyone. Onboarding is a generic five-slide carousel
that collects nothing. Settings is one role-agnostic modal. Dashboards are widget
stacks that do not reflect each role's job.

## Goal

True role-based workspaces: per-role hubs with enforced route access and matching
navigation; a guided, resumable onboarding wizard per role that collects real profile
data (including education system and optional school connection); one Settings hub
with role-filtered tabs; and distinct dashboard layouts for teacher, parent, admin,
and student.

## Decisions (user-confirmed)

1. Role workspaces: each role gets its own hub; routes enforce role access and
   redirect direct-URL violations to the role home.
2. Onboarding is guided and resumable: core fields required (full name), optional
   steps skippable, reopenable from Settings; a "Finish setup" banner shows until
   completion.
3. Teacher and parent dashboards get distinct layouts (work queue; child-first);
   admin keeps the sidebar workspace with polish; student home is refreshed.
4. Settings is one hub with role-filtered tabs (Profile, School, Notifications,
   Appearance, Security, Privacy).
5. School connection is included in onboarding (join code); admins join by code
   (new-school registration stays super-admin).
6. Education system is a curated select stored on `profiles`.

## Design

### Access matrix

- Public: marketing pages, `/schools`, `/scholarships`, `/gallery`, school galleries.
- Student: `/projects`, `/gallery/personal`, `/buddy`, `/recommendations`, `/my-applications`.
- Parent: `/parent`, `/parent/children/:id`, `/parent/messages`, `/parent/subscription`.
- Teacher: `/teacher`, `/content`.
- Admin/super_admin: `/admin/*`, `/content`, `/announcements`.
- All authenticated: `/dashboard`, `/profile`, `/settings`.

### Onboarding

`RoleOnboardingWizard` replaces the slideshow: role-specific steps (student: basics,
education, interests, school; parent: basics, link child by email, school; teacher:
basics, school, subjects; admin: basics, school). Saves via `updateProfile`, requests
school connection via the existing join-code RPC, links children via new
`link_parent_to_student_by_email` RPC, and marks completion on `profiles.onboarding_completed_at`.

### Settings hub

`/settings` with role-filtered tabs. Students see education system/grade/class;
teachers see subjects taught (never grade); parents get children + subscription
context; admins get the school widgets. Appearance reuses the existing theme system;
security is password change; privacy is visibility; notifications persist a
`notification_prefs` JSONB map.

### Dashboards

- Teacher: `/teacher` work queue (stats + approvals + students) with Content/Settings links.
- Parent: `/parent` child-first workspace with child switcher and per-child tabs.
- Student: refreshed home with quick-action buttons, keeping existing widgets.
- Admin: existing sidebar workspace retained.

## Data & API changes

- Migration `role_workspaces_onboarding.sql`: `profiles` gains `education_system`,
  `onboarding_completed_at`, `notification_prefs`; new RPC
  `link_parent_to_student_by_email` (app_private + public wrapper + grants).
- Types updated to match; education-system curated values:
  Cambridge (IGCSE), Cambridge (A-Levels), IB, National curriculum,
  Vocational/technical, Homeschool, Other.

## Test Plan

- Playwright `tests/role-access.spec.ts`: route-guard matrix, per-role nav strip,
  onboarding wizard save, settings role filtering (credential-gated skips).
- `tsc --noEmit` and `eslint` clean; production build succeeds; Vercel redeploy verified.

## Assumptions

- Super-admin dashboard unchanged; school registration stays super-admin-only.
- Personal gallery is student-only; school galleries remain public.
- Onboarding is non-blocking; full name is the only required field.
- The new migration must be applied to hosted Supabase (same process as the
  announcements migration) before new fields/RPC are live.
