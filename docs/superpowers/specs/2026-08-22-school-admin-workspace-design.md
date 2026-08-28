# School Admin Workspace: Sidebar Redesign + Real CMS + Announcements — Design

**Date:** 2026-08-22
**Status:** Approved (implemented)
**Skills used:** brainstorming, refero-design, supabase, supabase-postgres-best-practices

## Problem

The school admin experience (`/dashboard` for the `admin` role) is a single-scroll
stack of collapsible widget cards with two buried links to CMS and Students. The CMS
(`/admin/cms`) works but is basic: plain-textareas, URL-only media, no preview, and no
teacher authoring path (teachers cannot actually insert content because `created_by`
is never stamped). The user's stated pain point is navigation and layout.

## Goal

One cohesive school admin workspace: persistent left sidebar with full-page sections,
a "real" CMS (rich text, inline image/file uploads, live preview, scheduling) with
teacher authoring + admin review, and in-app audience-wide Announcements that land in
the existing notification bell. Light, on-brand visual direction; school-scoped RLS
patterns preserved.

## Decisions (user-confirmed)

1. Design and build the dashboard + CMS together as one workspace.
2. Full editing stack for the CMS: rich text, inline uploads, preview, scheduling.
3. Navigation pain addressed with a persistent left sidebar; widget stack becomes full pages.
4. New capability: in-app Announcements, audience-wide (students / parents / staff).
5. Teachers author news, events, and resources and submit for admin review; pages stay admin-only.
6. In-app delivery only (no email); public-facing posts use News with audience `public`.
7. Inline uploads only (no media library in v1); light on-brand visual system retained.

## Design

### 1. Workspace shell & navigation

- New `SchoolAdminLayout`: existing `DashboardHeader` + persistent left sidebar
  (desktop) and a bottom "Sections" drawer (mobile). Sidebar sections: Overview,
  Content, Announcements, Students, Academic Structure, Moderation, Analytics, Settings.
- Routes: `/admin/overview`, `/admin/content`, `/admin/announcements`, `/admin/academic`,
  `/admin/moderation`, `/admin/analytics`, `/admin/settings`; `/admin/cms` redirects to
  `/admin/content`; `/dashboard` redirects admins to `/admin/overview`.
- Existing widgets render expanded inside their section pages; data queries and
  school-scoping are unchanged.
- Teachers get a staff authoring entry point at `/content` (CMS) via the nav strip.

### 2. CMS upgrade

- TipTap v2 rich text editor replaces plain textareas for pages, news bodies, and event
  descriptions; HTML is stored in the existing `content`/`body` columns and sanitized
  with DOMPurify wherever it renders publicly (school profile + preview).
- Inline uploads to the existing public `school-assets` bucket under
  `{schoolId}/cms/{images|files}/...` for page heroes and resource files.
- Live preview dialog renders sanitized content as it appears on the school profile.
- Scheduling: existing `publish_at`/`expire_at` surfaced with a "Scheduled" badge.
- Teachers: "My content" filter, no Pages tab, can create/edit/submit their own
  news/events/resources; admins publish/reject and manage pages.

### 3. Announcements

- New `school_announcements` table (school-scoped, audience `students|parents|staff`,
  status `draft|published`) with RLS mirroring CMS conventions.
- `announcements_publish` RPC (app_private SECURITY DEFINER + public wrapper) fans out
  one `notifications` row per recipient: approved students at the school; parents at
  the school plus parents linked via `parent_child_links` to enrolled students; approved
  teachers/admins at the school.
- Announcements page with composer, audience picker, draft/publish workflow; teachers
  draft, admins publish.

### 4. Supporting fixes

- `created_by` stamping triggers for CMS tables and announcements so teacher authoring
  passes RLS (guarded against migration ordering).
- `school-assets` bucket accepts document MIME types and allows teachers to upload.
- Pre-existing typecheck failures in `Dashboard.tsx`, `parent.ts`, `chatHistory.ts`, and
  `ProjectDetails.tsx` fixed so `tsc --noEmit` is clean.

## Test Plan

- Playwright spec `tests/school-admin.spec.ts`: sidebar navigation, mobile drawer, CMS
  teacher→admin workflow, and announcements publish (credential-gated skips).
- `tsc --noEmit` and `eslint` clean; production build succeeds; Vercel redeploy verified.

## Assumptions / Out of scope

- In-app delivery only; audience-wide targeting; inline uploads only; pages admin-only;
  TipTap v2 + DOMPurify; light on-brand visuals with existing theme support.
- The new migration (`supabase/migrations/school_announcements.sql`) must be applied to
  the hosted Supabase project (via `supabase db push` or the SQL editor) before
  announcements, teacher authoring, and document uploads work in production.
