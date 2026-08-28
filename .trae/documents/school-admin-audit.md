# School Admin Feature Audit

**Date:** 2026-08-21
**Method:** grill-me skill interrogation — every feature challenged on 4 axes:
1. **Functional** — does it work against real data / real RPCs, or is it a mock/shell?
2. **Adopted** — is it wired into a real workflow a school admin would use daily?
3. **Aligned** — does it serve a core school-administration need?
4. **Duplicative** — does another surface already do this (or will a new module)?

**Verdict scale:** Retain / Refine (keep core, fix gaps) / Retire (remove or rebuild).

---

## 1. Audit Matrix

| # | Feature | What it does | Functional? | Adoption signal | Alignment | Verdict | Action |
|---|---------|--------------|-------------|-----------------|-----------|---------|--------|
| 1 | **School registration/approval workflow** (`handle_new_user` → super-admin Approvals tab → `approve_school_application`) | Admin signs up with school details; super admin approves; school + admin unlock; join code auto-generated | ✅ Fully functional (verified RPCs + RLS + guard triggers) | Core gate — every school admin passes through it | High — this IS the platform's tenant onboarding | **Retain** | Polish: approval email notification, rejection reason display on admin side, onboarding checklist |
| 2 | **SchoolAccessWidget** (join code rotate/copy, connection approve/reject) | Manages school join code + pending teacher/student connection requests | ✅ Fully functional (real RPCs: `rotate_school_join_code`, `approve/reject_school_connection`) | Daily driver for the admin | High | **Retain** | Refine: bulk invite (multi-email), copy-to-share text, request count badge already present |
| 3 | **SchoolOverviewWidget** | School stats overview | ⚠️ Partially functional (reports metrics from `getSchoolMetrics`) | Dashboard hero widget | Medium-High | **Retain** | Refine: add roster/enrollment counts once student module lands |
| 4 | **UserManagementWidget** | Students/Teachers/Parents tabs via `getSchoolUsers`; search | ⚠️ **Real data but dead actions** — "Add User", Edit (UserCog), Remove (UserX) buttons have **no onClick handlers**; `UserRecord.id: number` casts over string UUIDs via `as any[]` | Read-only directory today | High — roster management is core admin work | **Refine (urgent)** | Wire Add/Edit/Remove to real workflows; **deep-link to the new `/admin/students` roster** (this program) so the student module becomes the functional home |
| 5 | **AcademicStructureWidget** (classes/subjects/years) | Shows "Class 10A/10B/9A", subjects, academic years | ❌ **FAKE DATA** — `setTimeout(500)` loads **hardcoded arrays** (lines 51–68); **no Supabase query at all**; "Add" button has no handler | Zero — displays fabricated data that misleads admins | High in principle, zero in practice | **Retire (rebuild)** | Remove from dashboard or rebuild on real schema. **Decision for this program:** retire the fake widget; the student module's `enrollments` (school_year, class_name) becomes the real academic structure source. A real Classes/Subjects model is **roadmap P2** |
| 6 | **PortfolioModerationWidget** + `AchievementControlWidget` | Approve/reject student projects, achievements, gallery events | ✅ Fully functional (real moderation pipeline RPCs + RLS) | Core differentiator — the only place teachers/admins curate student content | High | **Retain** | CMS publishing workflow **reuses the same approval pattern**; keep both |
| 7 | **AIGovernanceWidget** | Toggles AI features (SmartBuddy, recommendations), telemetry | ✅ Functional (writes `settings` JSONB via super-admin RPCs) | Platform differentiator | High | **Retain** | None |
| 8 | **AnalyticsWidget** | School analytics | ⚠️ Partially functional | Dashboard reporting | Medium | **Retain** | Refine: add content-moderation volume + CMS publish stats after Phase 2 |
| 9 | **SchoolSettingsWidget** | School profile settings (name, logo, cover, gallery) | ⚠️ Partially functional (writes `schools` fields; storage via `school-assets` policies verified) | Admin config | High | **Retain** | None critical |
| 10 | **Teacher dashboard** (`PendingApprovalsWidget`, `StudentDirectoryWidget`) | Teacher approves student content; views student list | ✅ Functional (`getStudentsBySchool`) | Teacher daily driver | High | **Retain** | Refine: point directory at the new roster query for consistency |
| 11 | **Super Admin dashboard** (onboard school, user mgmt, content moderation, AI governance, audit logs) | Platform-wide control | ✅ Functional (super-admin RPCs + `admin_audit_logs`) | Platform operator | High | **Retain** | Add read visibility into CMS content per school (roadmap P1) |
| 12 | **Public `/schools` + `/schools/:id`** | School directory + profile (About/Students/Gallery tabs) | ❌ **Students tab renders 8 fake placeholder students** (pravatar images, "Student 1..8") — lines 240–255 | Public-facing; fake data is a reputation risk | High | **Refine (urgent)** | Replace placeholders with **real roster** (Phase 3); add News/Events/Resources tabs from **CMS** (Phase 2) |
| 13 | `gallery_events` as de-facto school calendar | Student event archive (owner-scoped `user_id`, not school-scoped) | ✅ Functional for student portfolio events | Student portfolios | Medium | **Refine** | Introduce **school-scoped `cms_events`** for the official school calendar (Phase 2); keep `gallery_events` for student content |

---

## 2. Grill-me Interrogation Notes (key challenges + outcomes)

- **"Does AcademicStructureWidget fool anyone?"** Yes — it presents fabricated class rosters as if real. It is the single worst data-integrity risk in the admin workspace. → Retire/rebuild (row 5).
- **"Is UserManagementWidget a directory or a control panel?"** Today it's a read-only directory with dead buttons. Admins expect to manage users there. → The student module must absorb its edit/remove responsibility; deep-link from the widget (row 4).
- **"Can the platform credibly show a school website without CMS?"** No — the public profile only shows description + gallery; no news, no events, no resources. → CMS is the highest-leverage new capability (row 12/13).
- **"Are the fake public students acceptable?"** No — public-facing fabricated data erodes trust. → Real roster (row 12).
- **"Does the approval pipeline generalize?"** Yes — the moderation pattern on projects/gallery/achievements is exactly what CMS publishing needs (row 6).
- **"Anything truly redundant?"** No outright retire-because-redundant candidates; the only retire is AcademicStructureWidget (fake). `SchoolGalleryWidget` is **orphaned** (imported nowhere) — flag for removal or wiring (row 10 note).

---

## 3. Risks & Gaps (carry into roadmap)

| Risk/Gap | Severity | Resolution |
|----------|----------|------------|
| `AcademicStructureWidget` shows hardcoded data | **High (data integrity)** | Retire this program; real model in roadmap P2 |
| Public Students tab shows fake students | **High (public trust)** | Real roster in Phase 3 |
| `UserManagementWidget` dead buttons | Medium | Absorb into student module; deep-link |
| `RequireAuth` `allowedRoles` never used — no route-level RBAC | Medium | Enable for all new `/admin/*` routes this program |
| `src/integrations/supabase/types.ts` stale vs live schema | Medium | Hand-append convention; regenerate only if CLI becomes available |
| Orphaned `SchoolGalleryWidget` (no importer) | Low | Wire or remove |
| No school-scoped events/news/resources | High | CMS (Phase 2) |

---

## 4. Verdict Summary

- **Retain (6):** registration/approval workflow, SchoolAccessWidget, PortfolioModeration, AchievementControl, AIGovernance, Super Admin dashboard.
- **Refine (6):** SchoolOverview, UserManagement, Analytics, SchoolSettings, Teacher dashboard, public SchoolProfile + gallery_events (CMS/roster tie-ins).
- **Retire (1):** AcademicStructureWidget (fake data) — rebuilt conceptually by the enrollment module this program + roadmap P2 real model.
