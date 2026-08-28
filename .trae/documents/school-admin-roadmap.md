# School Admin Platform — Prioritized Feature Roadmap

**Date:** 2026-08-21
**Source:** Research-backed (WebSearch) + mapped 1:1 to the Phase 0 grill-me audit (`school-admin-audit.md`).
**Format:** problem → proposed feature → data-model sketch → effort tier (S/M/L) → priority (P0/P1/P2). No time estimates, per project policy.

---

## 0. Research Basis

| Source class | Evidence captured |
|--------------|-------------------|
| **PowerSchool SIS** (market-leading K-12) | Core modules: enrollment/registration, scheduling, grading, attendance (incl. Quick-Fill bulk entry), health records, discipline reports, transcripts, parent/student portals, import/export automation, mobile app. Compliance: FERPA, HIPAA, COPPA, ISO 27001. MyPowerHub = parent/student communication portal. |
| **Infinite Campus** | Enrollment, academic progress tracking, school-family communication. |
| **Skyward** | SIS for smaller districts: registration, grading, family portals. |
| **Edlio-style school website CMS** | News/announcements, filterable event calendars (with Google/Outlook export), targeted news feeds by year group/audience, resource downloads, pages, staff directory, mass communication, forms, WCAG 2.1 accessibility. |
| **Gartner SIS reviews** | Common admin pain: enrollment data accuracy, parent communication, reporting/analytics, integration burden. |

**Platform gap mapping (from audit):** the current admin workspace has *no* content/news/events surface (audit rows 12–13), *no* enrollment model (rows 4–5), a **fake** academic structure widget (row 5), and **fake public students** (row 12). This roadmap closes those gaps in priority order.

---

## P0 — THIS PROGRAM (in plan; executors follow `school-admin-platform-enhancement.md`)

### 1. School CMS — pages, news, events, resource library
- **Problem (audit 12–13):** public `/schools/:id` shows only description + gallery; no news, no official calendar, no downloads. `gallery_events` is owner-scoped to student portfolios, not school-scoped. Edlio research confirms news/announcements + filterable calendar + resources are the core of a school website.
- **Feature:** school-scoped CMS with 4 content types (pages/news/events/resources), role-based publishing (school admin can publish; teachers submit → `pending_review`), full version history, approval workflow (draft → pending_review → published/rejected), published content renders publicly on `/schools/:id`.
- **Data model sketch:** `cms_content_status` enum; `cms_pages` (slug unique per school), `cms_news` (audience, featured, publish_at/expire_at), `cms_events` (event_date/end_date, location, audience), `cms_resources` (file_url, category, tags); `cms_content_versions` (JSONB snapshot per save); RLS + `cms_review_workflow` + `cms_version_trigger`; RPCs `cms_submit_for_review` / `cms_publish` / `cms_reject` / `cms_list_versions` / `cms_restore_version`. Full DDL in plan §6.1.
- **Effort:** L.
- **Rationale:** highest-leverage new capability; reuses the proven `approval_status` moderation pipeline (audit row 6) and becomes the foundation for P1 communication.

### 2. Student roster + enrollment tracking
- **Problem (audit 4, 12):** `UserManagementWidget` is a read-only directory with dead buttons; the public Students tab shows **8 fake students** (reputation risk). No enrollment status/history anywhere.
- **Feature:** `/admin/students` roster (search/filter/table), student detail page (profile + enrollment + activity), enrollment lifecycle (`pending → active → withdrawn/graduated`) per school year, and the public Students tab replaced with the **real roster** (name + grade only).
- **Data model sketch:** `enrollment_status` enum; `enrollments` (school_id, student_id, grade_level, class_name, school_year, status, enrolled_at, exited_at; `unique(school_id, student_id, school_year)`); RPC `admin_update_student_profile` (whitelisted non-guarded fields + audit log). Full DDL in plan §7.1.
- **Effort:** M.
- **Rationale:** roster management is the #1 admin daily driver (Gartner); kills the fake-data risk on the public surface; absorbs `UserManagementWidget`'s dead actions.

### 3. Data import/export (CSV)
- **Problem (research):** PowerSchool/Infinite Campus lead with import/export automation; admins live in spreadsheets and need bulk operations. Platform has zero bulk data movement today.
- **Feature:** CSV export of roster (name/email/grade/class/status/enrolled_at); CSV import that enriches **existing profiles by email** and batch-creates enrollments; unmatched rows → downloadable invite-join-code CSV (closes the loop via the existing `school_connection_requests` flow).
- **Data model sketch:** none new — consumes `profiles` + `enrollments` via `admin_update_student_profile`; invite CSV reuses `school_join_codes`.
- **Effort:** M.
- **Rationale:** low-cost, high-perceived-value admin capability; **constraint (documented):** auth users cannot be created server-side without platform-admin access, so import enriches existing students and invites handle the rest.

---

## P1 — NEXT PROGRAMS (recommended)

### 4. Parent communication portal (broadcasts)
- **Problem (research):** MyPowerHub/Infinite Campus parent-family communication is a top-ranked SIS feature; parents currently have no school-originated channel (per-user `notifications` has no school audience targeting).
- **Feature:** school-scoped broadcast composer in the CMS: pick audience (`public/students/staff` → extend to `parents`), schedule `publish_at`, auto-notify audience via existing `notifications` + email. Reply/opt-out preferences.
- **Data model sketch:** extend `cms_news` audience check + add `parent`; new `broadcast_deliveries` (news_id, recipient_id, delivered_at); RLS: parents read only what targets them.
- **Effort:** M–L.
- **Rationale:** builds directly on the P0 CMS; closes the largest communication gap in the platform.

### 5. Automated attendance
- **Problem (research):** attendance (esp. PowerSchool Quick-Fill) is a core SIS module; nothing exists.
- **Feature:** daily attendance register per class/enrollment with Quick-Fill bulk entry, per-term attendance reports, parent notification on unexplained absence (ties to #4).
- **Data model sketch:** `attendance` (enrollment_id, date, status enum, taken_by, note; `unique(enrollment_id, date)`); teacher RLS; admin reports via SQL view.
- **Effort:** M–L.
- **Rationale:** legal/truancy reporting requirement in most jurisdictions; high adoption once teachers onboard.

### 6. Grade book integration
- **Problem (research):** grading is a top-3 SIS module; none exists.
- **Feature:** grade book per class: assignment/assessment records, weighted categories, term averages, grade submission → student view.
- **Data model sketch:** `class_groups` (first step toward real Classes model), `assignments`, `submission_scores`; admin read + teacher write RLS.
- **Effort:** L.
- **Rationale:** unlocks transcript generation (P2) and the academic record backbone.

### 7. Approval-aware publishing dashboards
- **Problem (audit 8):** `AnalyticsWidget` is partial; no content-moderation or CMS publish metrics.
- **Feature:** per-school content health dashboard: drafts aging, pending-review queue, publish velocity, per-author volume; super-admin cross-school view.
- **Data model sketch:** read-only SQL over `cms_*` + `cms_content_versions`; reuse `admin_audit_logs` aggregates.
- **Effort:** S–M.
- **Rationale:** gives admins visibility into the new CMS lifecycle; cheap, analytics-pattern reuse.

---

## P2 — BACKLOG

### 8. Real Classes/Subjects model (rebuild AcademicStructureWidget)
- **Problem (audit 5):** the current widget shows **hardcoded fake data**; it was retired. Plan: `enrollments.class_name` is the interim source.
- **Feature:** `classes` + `subjects` tables, teacher assignments, class rosters derived from enrollments; dashboard widget rebuilt on real queries.
- **Data model sketch:** `classes` (school_id, name, grade_level, teacher_id, room, year), `subjects` (school_id, name, code), join table `class_subjects`.
- **Effort:** M–L.
- **Rationale:** prerequisite for grade books (#6) and schedules (#11); must precede those.

### 9. Academic records + transcript generation
- **Problem (research):** transcripts are a flagship PowerSchool module; platform has zero academic record.
- **Feature:** per-student academic record (term grades per subject), GPA computation, printable/PDF transcript generation.
- **Data model sketch:** `academic_records` (enrollment_id, subject, term, score/grade, credits); transcript = SQL aggregation + client-side PDF.
- **Effort:** L.
- **Rationale:** depends on #6 and #8; high value for graduation/transfer workflows.

### 10. Discipline tracking
- **Problem (research):** PowerSchool discipline reports are standard; none exists.
- **Feature:** incident log (student, type, severity, resolution), parent notification, admin discipline summary reports.
- **Data model sketch:** `discipline_events` (student_id, type, severity, description, resolution, resolved_by, date); audit + parent notification via #4.
- **Effort:** M.
- **Rationale:** compliance + safety reporting; sensitive data (see FERPA matrix).

### 11. Health records
- **Problem (research):** PowerSchool health module + HIPAA awareness; none exists.
- **Feature:** student health profile (allergies, conditions, emergency contacts, immunization record) with strict admin/health-staff-only RLS and audit logging.
- **Data model sketch:** `health_records` (student_id, kind, detail, sensitive jsonb, updated_by); **most restrictive RLS in the platform**.
- **Effort:** M.
- **Rationale:** highest-privacy surface; only justified after least-privilege patterns are proven in P0–P1.

### 12. Staff scheduling
- **Problem (research):** Frontline-style staff scheduling is common in district admin; none exists.
- **Feature:** school calendar of duties/classes per staff member, conflict detection, substitute management.
- **Data model sketch:** `staff_assignments` (profile_id, class_id/event_id, day/time slots); ties to #8.
- **Effort:** L.
- **Rationale:** requires Classes model first; mid-tier priority vs compliance features above.

### 13. SIS interoperability
- **Problem (research):** import/export automation is a PowerSchool differentiator; schools need to move data between systems.
- **Feature:** standardized CSV/XLSX templates for roster/attendance/grades; documented mapping to common SIS formats; scheduled sync hooks (roadmap).
- **Data model sketch:** import-job ledger table; format mappings as config.
- **Effort:** L.
- **Rationale:** extends P0 import/export into a productized integration surface; last because it formalizes what the CSV flow already does.

---

## FERPA / Privacy — Who-Can-See-What Matrix

**Principle:** least-privilege access + full auditability. Full FERPA/GLBA compliance is an operator/legal responsibility; the app implements the access-control half.

| Data class | Public | Students (same school) | Parents (of student) | Teachers (school) | School admin | Super admin |
|------------|--------|------------------------|----------------------|-------------------|--------------|-------------|
| Name + grade (roster) | ✅ (P0) | ✅ | ✅ (own child) | ✅ | ✅ | ✅ |
| Email, contact info | ❌ | ❌ | ✅ (own child) | ✅ | ✅ | ✅ |
| Enrollment status/year | ❌ | ❌ | ✅ (own child) | ✅ | ✅ | ✅ |
| Academic records/transcripts | ❌ | ✅ (own) | ✅ (own child) | ✅ (own class) | ✅ | ✅ |
| Discipline records | ❌ | ❌ | ✅ (own child) | ✅ (involved only) | ✅ | ✅ |
| Health records | ❌ | ❌ | ✅ (own child) | ❌ | ✅ (admin) | ✅ |
| CMS published content (audience-filtered) | ✅ (public items) | ✅ (their audience) | ✅ (their audience) | ✅ | ✅ | ✅ (read) |
| CMS drafts / pending | ❌ | ❌ | ❌ | ✅ (own) | ✅ | ✅ (read) |
| Audit logs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**Implementation notes carried from the audit:**
- Public roster exposure = name + grade only (no email/DOB/contacts). Enforced in the database, not just the UI: anonymous visitors read the roster exclusively through the SECURITY DEFINER `public.school_public_roster(school_id)` function, which returns only `(student_id, full_name, grade_level)` for approved students of approved schools. There is no anonymous SELECT policy on `profiles` or `enrollments`.
- Every `admin_update_student_profile` and enrollment/CMS write lands in `admin_audit_logs` (before/after JSONB).
- New tables ship with RLS ON + school-scoped policies; teachers are read-only or own-row writers; only school admins bypass the review workflow.
- Route-level RBAC: all new `/admin/*` routes use `<RequireAuth allowedRoles={['admin','super_admin']}>` (fixes the audit finding that `allowedRoles` is unused).

---

## Roadmap Summary Table

| # | Capability | Priority | Effort | Builds on |
|---|-----------|----------|--------|-----------|
| 1 | School CMS (pages/news/events/resources) | P0 | L | moderation pipeline |
| 2 | Student roster + enrollment | P0 | M | profiles + school RLS |
| 3 | CSV import/export | P0 | M | #2 |
| 4 | Parent communication portal | P1 | M–L | #1 |
| 5 | Automated attendance | P1 | M–L | #2 |
| 6 | Grade book integration | P1 | L | #8 |
| 7 | Approval-aware dashboards | P1 | S–M | #1 |
| 8 | Classes/Subjects model (rebuild fake widget) | P2 | M–L | #2 |
| 9 | Academic records + transcripts | P2 | L | #6, #8 |
| 10 | Discipline tracking | P2 | M | #2, #4 |
| 11 | Health records | P2 | M | #2 |
| 12 | Staff scheduling | P2 | L | #8 |
| 13 | SIS interoperability | P2 | L | #3 |
