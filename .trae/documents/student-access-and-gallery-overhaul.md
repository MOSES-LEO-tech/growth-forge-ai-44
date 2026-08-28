# Student Platform Access, Gallery & Account Overhaul

**Date:** 2026-08-17
**Mode:** Plan (approved decisions → execution)

## Summary

Fix the student-facing accessibility problems (Projects, Gallery, Profile are effectively unreachable), apply a cohesive UI consistency pass across the platform, generate custom avatars for all 7 Smart Buddy personas, overhaul the student gallery with folders + tags + multi-file upload, and finalize the `/profile` student account page for production. A `/goal` will be created via the `integrated_goal` MCP for the account finalization workstream.

---

## 1. Current State Analysis (grounded in code reads)

### Root cause of "inaccessible" pages
All target routes exist and are authorized under `RequireAuth` in [App.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/App.tsx) (`/projects`, `/projects/:id`, `/gallery/personal`, `/profile`). **No route-level break exists.** The pages are inaccessible because they cannot be discovered or returned to:

- The public [Navbar.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/Navbar.tsx) shows **no Projects / Gallery / Profile links** for signed-in students.
- [ProjectsWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/ProjectsWidget.tsx) line 183 — "View All Projects" button **expands the widget** instead of navigating to `/projects`.
- [GalleryWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/GalleryWidget.tsx) — has **no "View All"** link to `/gallery/personal` at all.
- [ProfileOverviewWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/ProfileOverviewWidget.tsx) — has **no "Manage profile"** link to `/profile`.
- [Projects.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Projects.tsx) and [StudentGallery.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/StudentGallery.tsx) render the **public Navbar** with no breadcrumb / back-to-dashboard affordance.
- [NotFound.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/NotFound.tsx) only links home.

### Gallery data layer (existing, sound)
[gallery.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/supabase/gallery.ts) already provides `getGalleryEvents`, `createEvent`, `deleteEvent`, `updateEvent`, `uploadMedia`, `getPublicEvents`, approval RPCs, and a schema-cache fallback (`gallery_events` → `events` → project-media synthesis). `StudentGallery` already has upload w/ preview, visibility filters, lightbox, edit/delete. It lacks **folder organization, tags, search, multi-file upload, and nav integration**.

### Profile page (production-blocking bugs)
[Profile.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Profile.tsx):
- `ProfileData.id: number` (wrong — uuid string).
- Line 65: `setLocation(data.bio || '')` — copy-paste bug.
- `phone`, `intendedCourse`, `address` states are never populated and never persisted — the `profiles` schema (in [types.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/integrations/supabase/types.ts)) has **no** phone/address/location/intended_course/graduation_year columns, so `updateProfile` silently drops them.
- No avatar upload (the `avatars` bucket + `uploadProfileAvatar` already exist in [storage.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/storage.ts) but are unused on the page).
- No back-to-dashboard nav; parent-link flow lacks email validation/confirmation.

### Smart Buddy personas
[smartBuddyPersonalities.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/smartBuddyPersonalities.ts) defines 7 personas (`default`, `study-ninja`, `chill-mentor`, `hype-squad`, `science-sage`, `creative-spark`, `life-coach`) with emoji-only avatars.

---

## 2. Proposed Changes

### Phase A — Navigation enhancement

| File | Change |
|------|--------|
| [Navbar.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/Navbar.tsx) | Add auth-aware links for signed-in users: **Projects** (`/projects`), **My Gallery** (`/gallery/personal`), **Smart Buddy** (`/buddy`), **Profile** (`/profile`), alongside existing Dashboard/My Apps/Guidance. Role-aware: students see the full set; parent/teacher/admin see role-relevant ones. Use `useAuth()` + `NavLink` with active state. |
| [ProjectsWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/ProjectsWidget.tsx) | Change "View All Projects" to a `Link` to `/projects` (keep expanded-widget behavior via a secondary control or make the button navigate). |
| [GalleryWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/GalleryWidget.tsx) | Add "View All" `Link` to `/gallery/personal` in expanded header. |
| [ProfileOverviewWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/ProfileOverviewWidget.tsx) | Add "Manage profile" `Link` to `/profile` in expanded view. |
| [Projects.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Projects.tsx) | Add breadcrumb `← Back to Dashboard` (`/dashboard`) above the hero. |
| [ProjectDetails.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/ProjectDetails.tsx) | Add breadcrumb back to `/projects` and `/dashboard`. |
| [StudentGallery.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/StudentGallery.tsx) | Add breadcrumb `← Back to Dashboard`. |
| [Profile.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Profile.tsx) | Add breadcrumb `← Back to Dashboard`. |
| [NotFound.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/NotFound.tsx) | Add "Back to Dashboard" (auth-aware) + keep Home link. |

New shared component: `src/components/Breadcrumb.tsx` (kebab-case file, named export `Breadcrumb`) — `Link` back-nav with `ChevronLeft` icon, `aria-label`.

### Phase B — UI/UX consistency pass (Skill: ui-ux-pro-max)

**Executor MUST invoke the `ui-ux-pro-max` Skill first** (user-mandated) to select a cohesive style direction, then apply it uniformly using existing design tokens (no new color system).

| File | Change |
|------|--------|
| [ExpandableWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/ExpandableWidget.tsx) | Unify collapsed/expanded chrome: consistent header row, icon chip, expand affordance, and dialog footer across all widgets that consume it. |
| All `src/components/widgets/*.tsx` | Standardize: page/kicker headers, card radii, button sizes, badge variants, empty states (icon + title + CTA), loading spinners. |
| [Projects.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Projects.tsx), [StudentGallery.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/StudentGallery.tsx), [Profile.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Profile.tsx) | Apply shared page-header pattern (`dashboard-hero` + kicker already used on Dashboard). |
| Global | Audit dark-mode/contrast (WCAG AA) on changed surfaces; ensure mobile-first behavior on new nav/breadcrumbs. |

Scope guard: **consistency pass, not full redesign** (per user decision). Do not touch unrelated marketing pages.

### Phase C — Smart Buddy persona avatars

- Add `avatarUrl: string` to `Personality` in [smartBuddyPersonalities.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/smartBuddyPersonalities.ts).
- Generate 7 square avatar images via the mandated text-to-image endpoint
  (`https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt={prompt}&image_size=square`, URL-encoded SDXL-style prompts — one per persona with a consistent art style, e.g. flat mascot illustrations).
- Download each to `public/personas/{id}.png`; reference `/personas/{id}.png` in `avatarUrl`.
- **Fallback:** if download is not feasible at runtime, set `avatarUrl` to the text_to_image URL directly and keep the existing emoji as `<AvatarFallback>`.
- Update [SmartBuddyWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/SmartBuddyWidget.tsx) and [SmartBuddy.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/SmartBuddy.tsx) to render `AvatarImage` (src=`avatarUrl`, fallback=emoji) in the header, persona picker, and chat message metadata.

### Phase D — Gallery page overhaul (the `/plan`)

**D1 — Migration** `supabase/migrations/gallery_folders_and_tags.sql` (create file, apply via `supabase_apply_migration`):
- `gallery_folders`: `id uuid pk default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `name text not null`, `created_at timestamptz default now()`. Index on `user_id`.
- RLS enabled; policies (owner-only): select/insert/update/delete where `user_id = auth.uid()`.
- Add `folder_id uuid null references gallery_folders(id) on delete set null` and `tags text[] not null default '{}'` to **both** `gallery_events` and `events` (guarded by `to_regclass`), so the existing dual-table fallback stays consistent. GIN index on `tags`.

**D2 — Types + lib** ([types.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/integrations/supabase/types.ts), [gallery.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/supabase/gallery.ts)):
- Add `gallery_folders` Row/Insert/Update + `folder_id`/`tags` on gallery event types.
- New exports: `getGalleryFolders(userId)`, `createGalleryFolder(userId, name)`, `renameGalleryFolder(id, name)`, `deleteGalleryFolder(id)`; extend `updateEvent` payload with `folder_id`, `tags`; add `uploadMultipleMedia(eventId, files[])` (sequential `uploadMedia`, batched insert).
- Reuse existing signed-URL/`resolveStorageMediaUrl` handling for folder-scoped queries.

**D3 — UI** ([StudentGallery.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/StudentGallery.tsx), [GalleryWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/GalleryWidget.tsx)):
- Folder sidebar (All / per-folder, with add/rename/delete dropdowns) + folder filter.
- Tag chips (add/remove on upload & edit; filter by tag).
- Search bar (title/description/tags).
- Multi-file upload dialog (select N files, folder picker, per-item auto-title from filename).
- Keep existing lightbox, edit, delete, visibility filters; ensure all flows update `folder_id`/`tags`.

### Phase E — Student account page finalization (the `/goal`)

**E0 — Goal creation (executor):** invoke `integrated_goal` MCP — `get_goal` first (create fails if one exists), then `create_goal` with objective: `"Finalize the student account (/profile) page for production: fix schema bugs, add avatar upload, back-to-dashboard nav, secure parent-link flow, WCAG + performance pass."` (No token budget unless requested.)

**E1 — [Profile.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Profile.tsx):**
- Fix `ProfileData.id` → `string`; remove non-schema fields (`phone`, `address`, `location`, `intendedCourse`; keep grade which maps to `grade_level`); populate all fields from `getProfile`.
- Add avatar upload: `uploadProfileAvatar` → update `avatar_url` via `updateProfile`, show preview + fallback initials.
- Add `← Back to Dashboard` breadcrumb; add error boundaries/empty state.
- Parent linking: validate email format, add success/error toasts (already partially there), disable submit while sending, add explanatory helper text.
- WCAG: label all inputs, `aria` for avatar button, contrast check, keyboard focus.
- **Do not create DB columns** (schema stays as-is; only edit real fields).

---

## 3. Assumptions & Decisions

- "Inaccessible" = navigation/discovery + chrome inconsistency, not a route/auth failure (verified statically; browser QA will confirm).
- Gallery organization = **folders + tags** via migration (user-confirmed).
- Account page target = **`/profile` page** (user-confirmed).
- UI scope = **cohesive consistency pass** using existing tokens (user-confirmed).
- Persona avatars: AI-generated images in `public/personas/` with emoji fallback.
- Avatar QA account `widget.qa+20260818@example.com` exists and can be reused for verification.
- Hand-maintained Supabase types (no `supabase gen types` available) — update [types.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/integrations/supabase/types.ts) manually.

## 4. Verification / QA Checklist

1. **Gates:** `npx tsc --noEmit` (exit 0) · `npm run lint` (0 errors) · `npm run build` (green).
2. **Migration:** `supabase_get_tables` confirms `gallery_folders` + new columns, RLS on, FKs correct.
3. **Browser QA (Playwright, student account):**
   - Navbar shows Projects / My Gallery / Profile for student; links active.
   - Dashboard widgets link to `/projects` and `/gallery/personal`; breadcrumbs return to dashboard from Projects, ProjectDetails, StudentGallery, Profile.
   - Gallery: create folder → upload 2 files → assign folder+tags → filter by folder & tag → search → edit → delete folder (files move to All).
   - Profile: avatar upload persists; save bio/grade persists; parent-link validation works.
   - Smart Buddy: all 7 personas render custom avatar images (fallback emoji if image fails).
4. **Cross-device/mobile:** nav + breadcrumbs usable at 375px; dark-mode contrast on changed surfaces.
5. **Log:** append all phases + MCP invocations to `.trae/agent-log.md`.
6. **Goal:** `get_goal`/`create_goal` result recorded; `update_goal` on completion.

## 5. Execution Order

Phase A (nav) → Phase D migration + lib (unblocks gallery UI) → Phase D UI → Phase C avatars → Phase B consistency pass → Phase E profile + goal. Gate check after each phase.
