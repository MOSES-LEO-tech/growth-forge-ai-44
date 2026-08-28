# Smart Buddy Platform Refinement — Implementation Roadmap

**Date:** 2026-08-17 · **Scope:** 4 features (chat history, project overhaul, gamification removal, document organization) · **Status:** Approved plan — ready to execute phase-by-phase

---

## 1. Summary

This roadmap delivers four enhancements to the Growth Forge AI ("Milestone") platform:

| # | Feature | Phase | Size |
|---|---------|-------|------|
| 1 | **Local chat history** — encrypted IndexedDB persistence for SmartBuddy, offline access, export/import backup | P1 | S–M |
| 2 | **Project widget + management overhaul** — task checklists, real progress, edit/delete UX, redesigned widget & details | P3 | L |
| 3 | **Gamification removal** — strip points/levels/badges/XP UI + `student_levels` table; preserve academic achievements | P0 | M |
| 4 | **Academic document organization** — per-project file system (folders, tags, full-text search, preview) | P4 | L |

**Locked decisions (user Q&A):** chat history = **local-only** with encryption + export/import (no cloud sync); project tasks = **task checklist** depth (no kanban/subtasks); document preview = **native inline** for image/video/PDF, **download/open** for Office files, full-text search over metadata + text-based file content.

**Stack:** React 18 + Vite 5 + TypeScript strict · Supabase (Postgres, Storage, RLS, Edge Functions) · shadcn/ui · TanStack Query. One new runtime dependency: `idb` (tiny IndexedDB wrapper). No Edge Function changes required (chat is local-only; search is Postgres/RLS). Deploys via existing `npx supabase` CLI flow.

---

## 2. Current State Analysis (from codebase exploration)

### 2.1 Chat history — today there is none
- Both chat UIs are **volatile**: [SmartBuddyWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/SmartBuddyWidget.tsx) (line 68) and [SmartBuddy.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/SmartBuddy.tsx) (line 21) hold messages in `useState` only. The sole localStorage usage is `smartbuddy-personality`.
- Edge function [smartbuddy-chat/index.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/supabase/functions/smartbuddy-chat/index.ts) is stateless; it truncates `history` to last 8 and writes only telemetry to `smartbuddy_usage`.
- No offline/crypto deps in `package.json`; **Web Crypto (`crypto.subtle`) is natively available**. PWA workbox (in `vite.config.ts`) already caches static assets but no app data.
- Per-user keying: `useAuth()` exposes `user.id` (see [AuthContext.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/contexts/AuthContext.tsx)).

### 2.2 Project management — sparse, fake progress, no edit
- **Schema** (`projects` table): `owner_id, user_id, title, description, tags TEXT[], media_urls TEXT[], status enum('pending','ongoing','complete'), start_date, end_date, skills_tracked JSONB (unused), collaborators UUID[], verified, approval_status('pending','approved','rejected') + approval fields, deleted_at`.
- **Progress is fabricated**: [ProjectCard.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/ProjectCard.tsx) lines 31–33 hardcode `10/60/100` from status.
- **No tasks, milestones, or real progress model** (grep confirmed zero tables).
- **No edit or delete UX**: `updateProject` exists but is only used to attach media; `useDeleteProject` hook exists but is unwired; [ProjectDetailsModal.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/ProjectDetailsModal.tsx) is dead code.
- **Approval constraint**: trigger `projects_guard_approval_update` re-pends `approval_status` whenever content columns change. Any edit UI must surface "changes require re-approval."
- **Comments**: live polymorphic `comments` table (projects use `resource_type='project'`); `project_comments` is orphaned; star rating is mocked (`rating: 5`).
- **Status vocabulary mismatch**: student UI uses `ongoing`; parent widget expects `in_progress` (falls back to muted gray).
- Key files: [AddProjectModal.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/AddProjectModal.tsx), [ProjectsWidget.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/widgets/ProjectsWidget.tsx), [Projects.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/Projects.tsx), [ProjectDetails.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/pages/ProjectDetails.tsx), [projects.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/supabase/projects.ts). No navbar link to `/projects`.

### 2.3 Gamification — one table, five UI surfaces; academic achievements are separate
- **The only gamified table is `student_levels`** (`user_id, points, level, badges TEXT[]`), created by signup trigger and written only by the QA seed page. No leaderboard/streak/XP tables exist.
- **UI to remove:** `pages/Achievements.tsx` (route `/achievements`) — levels/points/badges; `GrowthAnalyticsWidget` — "XP & Levels" tab + level badge; `ChildOverviewWidget` (parent) — `{points} XP` badge + "XP Points" stat; `SchoolProfile.tsx` — mock "Hall of Fame" leaderboard tab; `StudentDirectoryWidget` (teacher) — "growth score" (`projects*50 + achievements*100`); `StudentQaSeed` — `student_levels` upsert; dead `award-achievement` invoke in `useScholarshipApplications.ts`; cosmetic "+50 XP" string.
- **PRESERVE (academic, not gamified):** `achievements` table + verification RPCs (`approve_student_achievement`, `reject_student_achievement`, `super_admin_update_achievement_verification`), `AchievementsWidget`, `AchievementControlWidget`, `AchievementsMonitoringWidget`, SuperAdmin moderation tab, teacher/school achievement counts, `achievement_submission` notifications, `achievements.ts` lib + `useAchievements` hook.

### 2.4 Documents — flat, untyped, no search
- Files live as **untyped paths in `projects.media_urls TEXT[]`** with fabricated names (`File N`); no per-file metadata, folders, tags, or removal UI.
- Storage bucket `project-media` (private, owner-RLS by first path folder) is ready. `ALLOWED_TYPES` in [storage.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/storage.ts): `jpeg/png/webp/mp4/pdf`, 10 MB — **no Office MIME types**.
- [MediaDisplay.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/MediaDisplay.tsx) renders images/videos inline, but PDFs open in a **new tab** (no inline viewer). No Word/Excel handling anywhere.
- Signed-URL pipeline exists: `resolveStorageMediaUrl` in [storageMedia.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/lib/supabase/storageMedia.ts). Reusable upload UX: [FileUpload.tsx](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/components/FileUpload.tsx).
- No full-text search backend; Postgres `tsvector`/`websearch_to_tsquery` is available (Supabase = Postgres).

---

## 3. Grill-me Challenge Table

Hard questions surfaced during requirement grilling, with resolutions that the plan commits to:

| # | Challenge | Resolution |
|---|-----------|------------|
| 1 | "Why local-only chat when users use multiple devices?" | Privacy-first. Encrypted local store + JSON export/import. Cloud sync explicitly **deferred** (requires new table + edge function + RLS). |
| 2 | "Is AES-GCM without a user passphrase real security?" | It's obfuscation-grade (key is a non-exportable random `CryptoKey` in IDB) — protects against casual disk/sync inspection, **not** a determined attacker. A passphrase-derived scheme is a documented future hardening step. Be honest in the UI copy ("stored privately on this device"). |
| 3 | "Why drop `student_levels` instead of leaving it dormant?" | It's pure dead weight: seeded by triggers on every signup, read nowhere after UI removal. Dropping removes trigger writes + QA confusion. `achievements` (academic) is fully separate and untouched. |
| 4 | "What is progress when a project has zero tasks?" | Fallback: derive from status (`pending→0`, `ongoing→50`, `complete→100`). Once ≥1 task exists, progress = `done / total`. |
| 5 | "Editing a project re-pends teacher approval — will users be confused?" | Edit form shows a notice: "Changes will be re-submitted for teacher approval." Non-negotiable (existing DB trigger enforces it). |
| 6 | "Word/Excel can't be previewed client-side reliably — is download acceptable?" | Yes. Inline preview for image/video/PDF; Office/other → metadata + "Open/Download" via signed URL. Full-text search covers names, tags, folders, and text-based file content (notes/markdown/CSV). |
| 7 | "Where does file text extraction happen for search?" | Client-side at upload for small text files (`<1 MB` of `.txt/.md/.csv`) → stored in `project_files.extracted_text` → Postgres `tsvector` index. PDFs are searched by name/tags only (pdf.js out of scope). |
| 8 | "Folders are metadata-only — will the storage bucket become a mess?" | Yes, intentionally: files stay flat in `project-media` under `{userId}/projects/{projectId}/files/{uuid}.{ext}`; the folder tree is a `folder` TEXT column with breadcrumb UI. Simpler RLS, no rename cascade. |
| 9 | "Why only add `idb` as a dependency?" | Raw IndexedDB is verbose and error-prone; `idb` (~1.5 kB) is the standard minimal wrapper. Everything else uses existing libs (Web Crypto, Postgres FTS, shadcn/ui). |

---

## 4. Prioritized Feature List & Phase Order

Phases are independently shippable; each ends with lint/type/build green.

- **P0 — Gamification removal** (M): smallest surface, unblocks the "academic productivity" refocus, de-risks later UI work.
- **P1 — Local chat history** (S–M): self-contained client work; ship before the widget redesign so history survives the P3 rework.
- **P2 — Project overhaul** (L): tasks + progress + edit/delete + widget redesign. Depends on P0 (removes XP surfaces the widget shares) and benefits from P1 being done.
- **P3 — Document organization** (L): file table, folders, tags, search, preview. Builds on the P2 project details layout.

**Recommended execution order:** P0 → P1 → P2 → P3. P3 is scheduled last because it touches the project details page P2 redesigns.

---

## 5. Technical Specifications

### 5.1 P0 — Gamification removal

**Migration `supabase/migrations/gamification_removal.sql`:**
- `DROP TABLE IF EXISTS public.student_levels CASCADE;` (drops indexes `idx_student_levels_user_id/points` + RLS policies + unique constraint).
- `CREATE OR REPLACE` each signup trigger function (`handle_new_user()` in `20260429000000_supabase_pwa_baseline.sql`, `20260321120000_auth_fix.sql`, `20260505170000_school_registration_approval.sql`) **without** the `student_levels` INSERT.
- No changes to `achievements`, its RPCs, or policies.

**Type/cleanup:**
- [types.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/integrations/supabase/types.ts): remove `StudentLevel` + `student_levels` Row/Insert/Relationships entries.
- [use-realtime.ts](file:///d:/Projects/Personal%20projects/growth-forge-ai-44/src/hooks/use-realtime.ts): remove `'student_levels'` from `TableName` union.

**Component changes (delete gamified parts, keep the rest):**
- **Delete** `src/pages/Achievements.tsx` + route/lazy import in `src/App.tsx` (`/achievements`).
- `GrowthAnalyticsWidget.tsx`: remove "XP & Levels" tab, level badge, `currentXp`/`nextLevelXp` progress; keep project/scholarship analytics. Remove `student_levels` fetch (line 56).
- `ChildOverviewWidget.tsx`: remove level/XP badge + "XP Points" stat card; keep achievements count + `getChildOverview` achievements data.
- `SchoolProfile.tsx`: remove "Hall of Fame" tab (mock leaderboard).
- `StudentDirectoryWidget.tsx`: remove "growth score" (`getGrowthScore` + mock `growthScore`); keep `achievements_count`.
- `StudentQaSeed.tsx`: remove `student_levels` upsert; keep achievement seeding (or remove page entirely — see Assumptions).
- `useScholarshipApplications.ts`: remove the dead `award-achievement` invoke.
- `parent.ts`: `getChildOverview` — drop `student_levels` read.
- **Preserve** all academic surfaces (Section 2.3 list).

### 5.2 P1 — Local chat history

**New dependency:** `idb` (^8).

**New module `src/lib/chatHistory.ts`:**
- DB `smartbuddy-chat` v1, store `histories` keyed by `userId`.
- Value shape: `{ userId, messages: { role:'user'|'assistant', content, at: string }[], updatedAt }`.
- **Encryption:** AES-GCM via Web Crypto. 256-bit random key persisted as non-exportable `CryptoKey` in IDB store `keys` (per-user). On load: if key missing → generate; decrypt payload; on write → encrypt then store. Data at rest in IDB is ciphertext.
- Cap: max **500 messages** per user (trim oldest, keep a `trimmed` flag).
- API: `loadChatHistory(userId)`, `appendMessage(userId, msg)`, `clearChatHistory(userId)`, `exportChatHistory(userId)` (JSON file download), `importChatHistory(userId, file)` (merge + re-encrypt).
- Never sends history content to the server (edge function only receives the last 8 for context, as today).

**Wiring (both UIs → shared behavior):**
- New hook `src/hooks/useSmartBuddyChat.ts`: initializes from `chatHistory` (greeting only if empty), appends user/assistant messages, persists after each append, exposes `messages, isLoading, input, setInput, sendMessage, exportHistory, importHistory, clearHistory`.
- Refactor `SmartBuddyWidget.tsx` and `SmartBuddy.tsx` to use the hook (removes duplicated send logic; conversation survives refresh/reload and is shared between widget & page).
- Expanded view (widget) + page: add "Export", "Import", "Clear history" actions in a small settings menu; note copy "Stored privately on this device."
- Handle **offline**: loading persists; sending while offline shows a toast "You're offline — your message was kept locally" and queues the message locally (send retried on next online attempt). Minimal: on failure (network), keep message in history and mark `pending`.

### 5.3 P2 — Project overhaul

**Migration `supabase/migrations/project_tasks_and_progress.sql`:**
```sql
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, position);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
-- Owner-only (mirror projects RLS via subquery)
CREATE POLICY project_tasks_owner_select ON public.project_tasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY project_tasks_owner_insert ON public.project_tasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY project_tasks_owner_update ON public.project_tasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY project_tasks_owner_delete ON public.project_tasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
```
- **Trigger:** on INSERT/UPDATE/DELETE of `project_tasks` → `projects.updated_at = now()` and, when content changes, re-pend approval (mirror `projects_guard_approval_update` behavior): `UPDATE projects SET approval_status='pending', verified=false, approval_status='pending' WHERE id = NEW.project_id` — implement in a SECURITY DEFINER trigger function guarded by the same bypass setting.

**`src/lib/supabase/projects.ts` + `src/lib/supabase/projectTasks.ts`:**
- `getProjects` → include `project_tasks(status)` via relationship select; expose `progress` computed (`done/total`, fallback `0/50/100` by status when empty).
- `createProjectTask`, `updateProjectTask`, `deleteProjectTask`, `reorderTasks` (position).
- `useDeleteProject` wired into UI (soft delete: `deleted_at = now()`).
- `updateProject` extended for edit form (already exists — expose a real edit path).

**UI:**
- `AddProjectModal.tsx` → add **edit mode** (`project?` prop): pre-filled fields (title, description, status, start/end dates, tags); on save calls `updateProject`; shows re-approval notice. Add **delete** (confirm dialog → soft delete) accessible from card/editor.
- `ProjectCard.tsx`: real progress bar from `progress`; add `...` menu (Edit / Delete); keep status badge.
- `ProjectsWidget.tsx`: collapsed summary shows active/completed counts + aggregate progress bar; expanded: search + tabs + cards; add "Edit/Delete" menu; keep "New Project".
- `ProjectDetails.tsx`: add **Tasks section** (add inline task, checkbox toggle done, edit title, delete, due date display, real progress bar); add **Edit project** button (opens modal in edit mode) and **Delete**; keep media + feedback sections.
- `ProjectsMonitoringWidget.tsx` (parent): align status vocabulary (`ongoing` accepted) + show task progress.
- `Navbar.tsx`: add "Projects" link → `/projects`.
- Delete `ProjectDetailsModal.tsx` (dead code).

### 5.4 P3 — Academic document organization

**Migration `supabase/migrations/project_files.sql`:**
```sql
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  folder TEXT NOT NULL DEFAULT 'root',
  tags TEXT[] NOT NULL DEFAULT '{}',
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_folder ON public.project_files(project_id, folder);
CREATE INDEX IF NOT EXISTS idx_project_files_fts ON public.project_files
  USING GIN (to_tsvector('english',
    name || ' ' || coalesce(folder,'') || ' ' || array_to_string(tags,' ') || ' ' || coalesce(extracted_text,'')));
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
-- Owner-scoped policies (same EXISTS pattern as project_tasks)
```
- **Backfill (migration step):** for each `projects.media_urls` entry, insert a `project_files` row (`name` from filename, `mime_type`/`folder 'root'`, `storage_path` = the path). Keeps legacy `media_urls` column intact for backward-compat rendering.
- **Trigger:** file INSERT/DELETE → re-pend project approval (same pattern as tasks).

**`src/lib/storage.ts`:** extend `ALLOWED_TYPES` with Office + text MIME types (`application/msword`, `...wordprocessingml.document`, `...spreadsheetml.sheet`, `...presentationml.presentation`, `application/vnd.ms-excel`, `text/plain`, `text/csv`, `text/markdown`); raise max to **25 MB**; add path helper `{userId}/projects/{projectId}/files/{uuid}.{ext}`.

**New `src/lib/supabase/projectFiles.ts`:** `listProjectFiles(projectId, folder?)`, `uploadProjectFileWithMeta(projectId, file, {folder, tags})` (uploads to `project-media`, reads `extracted_text` client-side for text files `<1 MB`, inserts row), `renameFile`, `moveFile(folder)`, `setFileTags`, `deleteProjectFile` (row + storage object), `searchProjectFiles(projectId, query)` (uses tsvector via `ilike` fallback).

**UI — new `src/components/widgets/ProjectFilesSection.tsx`** (embedded in `ProjectDetails.tsx`, plus compact view in `ProjectsWidget`):
- Breadcrumb folder nav (metadata-only tree: `Root / <folder>`).
- Upload dropzone (reuse `FileUpload` pattern) with folder/tags fields.
- File rows: type icon (image/video/pdf/word/excel/text/other), name, size, folder, tags (editable), modified; actions: Preview/Open, Download, Rename, Move, Tag, Delete.
- Search box: full-text over name/folder/tags/extracted_text.
- **Preview:** image/video via existing `MediaDisplay`; **PDF inline** via `<iframe src={signedUrl} className="h-full w-full" />` (fallback to open-in-new-tab); **Office/other** → "Open" (signed URL new tab) / "Download". All URLs via existing `resolveStorageMediaUrl` (1 h signed).

---

## 6. UI/UX Design Requirements

- **Design tokens / dark mode / WCAG:** reuse existing shadcn tokens; all new surfaces must pass contrast, keyboard navigation, visible focus rings, `aria-label` on icon buttons; mobile-first responsive (grid → single column on `sm`).
- **Projects widget:** collapsed = mini dashboard (active count, completed count, aggregate progress bar); expanded = search + status tabs + card grid with real progress bars and a `...` menu (Edit/Delete).
- **Project details:** stacked sections with clear hierarchy — Header (title/status/verified + Edit/Delete) → Progress bar → **Tasks** (checklist, add inline) → **Files** (breadcrumbs + search + list) → Media gallery → Feedback. Tabs acceptable on mobile.
- **Empty states:** no tasks → "Add your first task" CTA; no files → "Upload notes, PDFs, worksheets…"; no chat history → greeting prompt.
- **Loading/error:** skeleton for query-driven sections; toasts (sonner) for every mutation; destructive variants for delete.
- **Copy:** remove all XP/points/badge language; "Achievements" always means academic achievements.

---

## 7. Data Storage & Security Protocols

| Asset | Protocol |
|-------|----------|
| Chat history | Local IndexedDB only; AES-GCM (256-bit, non-exportable per-user CryptoKey); 500-msg cap with oldest-trim; JSON export/import; content **never** sent to server (only last-8 context to edge function); honest UI copy ("stored privately on this device"); documented future hardening = passphrase-derived key. |
| Project files | Private `project-media` bucket; owner-RLS on both bucket objects and `project_files` rows; signed URLs (1 h expiry); MIME whitelist + 25 MB cap; UUID file names (no user-controlled paths); folder tree is metadata-only (no path traversal surface). No AV scanning in Supabase Storage — documented limitation. |
| Tasks / projects | RLS owner-scoped (mirror existing `projects` policies); content edits re-pend approval via triggers; teacher/super-admin RPCs unchanged. |
| Secrets | None added. Existing `OPENROUTER_API_KEY`/`TAVILY_API_KEY` untouched. |

---

## 8. Migration Plan (existing user data)

| Feature | Migration | Data risk |
|---------|-----------|-----------|
| Chat | No legacy data (volatile today). New store starts empty; export available going forward. | None |
| Projects | Existing rows untouched; `project_tasks` starts empty → progress falls back to status-derived (0/50/100). | None |
| Gamification | `student_levels` dropped; points were dead/QA-seeded only. `achievements` untouched. | None (academic data preserved) |
| Files | One-time backfill: `projects.media_urls` → `project_files` rows (`folder 'root'`, mime inferred from extension). Legacy column kept for compat. | Low — verify backfill count == media_urls total |

**Rollback:** each migration is additive except `gamification_removal.sql` (destructive drop). P0 migration kept isolated so it can be reverted independently if needed; all others are safe to apply in any order.

---

## 9. User Testing Criteria

1. **Chat (offline):** open chat, send messages → DevTools offline → refresh → history still present and renders; personality switch keeps history; export JSON → import on fresh profile → identical thread; clear history removes store.
2. **Projects:** create project → add 3 tasks → check 1 done → progress = 33% (card + details + widget) → zero-task project shows status fallback; edit title/status → re-approval notice shown → teacher approves; delete → disappears (soft) + restores on admin.
3. **Files:** upload jpeg/png/pdf/mp4/docx/xlsx/csv/md/other; folder create + move; tags set/filter; search finds by name, tag, folder, and text content (csv/md); PDF previews inline; Office shows Open/Download; delete removes row + object; re-upload after delete works.
4. **Gamification:** `grep -ri "xp\|points\|badge\|level" src/` returns only academic-achievement context; parent/teacher/school dashboards show no points/leaderboard; student achievement claim → teacher approve → parent sees verified (full flow intact).
5. **Cross-platform:** Chrome/Edge/Firefox/Safari; mobile viewport (375px); dark + light theme; keyboard-only navigation of new sections.

---

## 10. QA Checklists

**Shared gates (every phase):** `npx tsc --noEmit` 0 errors · `npx eslint` 0 errors (pre-existing warnings OK) · `npm run build` green · migration applied via MCP `supabase_apply_migration` + `supabase_get_tables` verify · Playwright smoke pass.

- **P0:** no `student_levels` references in code or DB; trigger functions deploy clean; academic achievement flow regression-tested end-to-end.
- **P1:** IDB stores inspectable (Chrome DevTools → Application → IndexedDB); encrypted payload ≠ plaintext; 500-cap trim; export/import roundtrip; offline queue.
- **P2:** RLS matrix (owner/teacher/super_admin/parent) on `project_tasks`; trigger re-pends approval on task change; progress math (0-task fallback, mixed statuses); soft-delete filter respected everywhere.
- **P3:** RLS matrix on `project_files`; backfill count matches; tsvector index works (`EXPLAIN`); MIME whitelist rejects `application/x-msdownload`, `.exe`, oversized files; signed URLs expire; previews render in both themes.

---

## 11. Assumptions & Decisions

1. Chat history is **local-only** (no cloud sync) per user decision; export/import is the backup path.
2. Task management is **checklist-depth** (no kanban/subtasks) per user decision.
3. Office files use **download/open** (no client-side renderers) per user decision.
4. `StudentQaSeed.tsx` page is a QA fixture; decision: **remove it** (with the `/qa/student-seed` route) to eliminate gamification seed paths — or keep minus the `student_levels` upsert if the user wants the QA page for other purposes. Default = keep page, remove only the gamified upsert (lower blast radius).
5. Academic achievements (`achievements` table + all verification workflow) are **out of scope for removal** and must remain fully functional.
6. No Edge Function changes; all work is client + migrations + RLS.
7. New npm dependency: `idb` only.
8. Approval re-pending on edits is accepted and surfaced in UI copy.
9. Supabase Storage has no built-in virus scanning — uploaded files are not scanned (documented limitation; flagged in delivery notes).

---

## 12. Final Verification & Delivery

1. Run all shared gates.
2. Apply migrations in order: `gamification_removal.sql` → `project_tasks_and_progress.sql` → `project_files.sql`.
3. Playwright smoke per section 9 (key flows + RLS).
4. Update `.trae/agent-log.md` with outcomes.
5. Deliver summary with: what changed, assumptions (Section 11), blocked items, and remaining user actions (none expected beyond testing).
