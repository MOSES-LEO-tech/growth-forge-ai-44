# School Admin Platform — Stakeholder Walkthrough Guide

**Date:** 2026-08-21
**Audience:** School administrators and operators running a guided demo with stakeholders
**Covers:** CMS (Pages / News / Events / Resources), Student roster + enrollment, CSV import/export, public school page
**Setup for the demo:** an approved school-admin account (or super-admin) + a school with a few approved student profiles. Seed data has 3 approved schools. If needed, create a school admin via signup + super-admin approval.

---

## How to use this guide

Each section lists: **what to click → what the stakeholder should see → acceptance criterion**. Run the tour in order; the CMS section is self-contained per content type. Mark each box when the behavior matches.

---

## Part A — CMS: Pages

1. **Navigate:** Dashboard → click the **CMS** quick-link card (or Navbar → **CMS**).
   - _See:_ Admin CMS page with tabs **Pages / News / Events / Resources** and a breadcrumb back to the dashboard.
   - ☐ Pages tab loads with a table (title, slug, status, author, updated) and a **New Page** button. Empty state shows a CTA if no pages exist.
2. **Create a page:** click **New Page**; enter title `About Us`, slug `about`, body text; save.
   - _See:_ Row appears with status **Draft**. Audit entry recorded (visible to operator in `admin_audit_logs`).
   - ☐ Draft rows are visible to school admins/teachers only — **not** on the public site yet.
3. **Submit for review:** row action **Submit for review**.
   - _See:_ Status becomes **Pending review** (amber badge).
   - ☐ A teacher (non-admin) attempting to publish directly is forced to Pending review — the review workflow protects the published state.
4. **Publish:** admin row action **Publish**.
   - _See:_ Status becomes **Published** (green badge), `published_at` recorded.
   - ☐ Verify **About** tab on the public page (`/schools/:id`) now shows this page content when the slug is `about`.
5. **Version history:** row action **Version history**.
   - _See:_ Dialog listing versions with author + timestamp; content snapshots are stored per save.
   - ☐ Edit the page (change a sentence, save), reopen version history → a new version appears.
6. **Restore:** select an older version → **Restore**.
   - _See:_ Row content reverts to the snapshot; status returns to **Draft** (must re-publish); new version recorded.
   - ☐ Restore is admin-only; rejected content keeps its `rejection_reason`.

## Part B — CMS: News, Events, Resources

1. **News tab → New News:** title + body + audience (Public / Students / Staff) + optional publish/expiry dates.
   - _See:_ Status Draft → Submit for review → Publish (same workflow as pages).
   - ☐ Published public news renders on the school page **News** tab; **students/staff-audience** news does **not** show to anonymous visitors.
   - ☐ Expired news (`expire_at` passed) disappears from the public page.
2. **Events tab → New Event:** title, description, location, event date, audience.
   - _See:_ Same draft→review→publish workflow; public events appear on the school page **Events** tab with date/location.
3. **Resources tab:** upload a file (stored in the school's `school-assets` bucket), category, tags.
   - _See:_ Published public resources list on the school page with download links.
   - ☐ Unpublished resources never appear publicly.

## Part C — Student roster & enrollment

1. **Navigate:** Dashboard → **Students** quick-link card (or Navbar → **Students**).
   - _See:_ `/admin/students` roster table: avatar, name, email, grade, class, status badge, and **Import CSV** / **Export CSV** buttons.
   - ☐ Only students of **your** school appear (school-scoped RLS).
2. **Search + filter:** type a name in search; filter by grade and by status.
   - _See:_ Table narrows; the card title shows the filtered count.
3. **Enrollment status:** row → **Change enrollment status** (Active / Withdrawn / Graduated / Pending; school year for new enrollments).
   - _See:_ Status badge updates; withdrawn/graduated rows get an exit timestamp; every change is in `admin_audit_logs`.
   - ☐ Open `/admin/students/:id` → **Enrollment** tab: full history table with dates.
4. **Edit profile:** row → **Edit profile** — grade, class, bio, subjects, clubs, interests.
   - _See:_ Only whitelisted fields editable; audit before/after recorded. Role/school/status cannot be changed here (guarded at DB).
   - ☐ **Activity** tab on the detail page lists recent projects + achievements for that student.
5. **Export CSV:** click **Export CSV**.
   - _See:_ A `roster.csv` downloads (opens cleanly in Excel — UTF-8 BOM included) with columns name, email, grade, class, status, enrolled_at.
6. **Import CSV (matched):** prepare a CSV with header `email,name,grade` (see sample below) and **Import CSV** → select file.
   - _See:_ Results dialog: matched rows update grade/class; unmatched rows listed separately.
7. **Import CSV (unmatched → invites):** for rows that don't match a profile, click **Download invite CSV** in the results dialog.
   - _See:_ An `invites.csv` downloads — each row has the invited email/name plus the school's **active join code**.
   - ☐ Constraint (documented): the app cannot create auth users server-side; invite CSVs close the loop through the existing join-code → connection-request flow.

**Sample import CSV:**
```
email,name,grade,class,school_year,status
jane.doe@example.com,Jane Doe,Grade 9,Section A,2026-2027,active
new.student@example.com,New Student,Grade 10,,2026-2027,pending
```

## Part D — Public school page (`/schools/:id`)

1. **Students tab:** open any approved school's public page → **Students**.
   - _See:_ Real roster (no more placeholder "Student 1..8"): name + grade with initials avatar.
   - ☐ **No email or contact info shown** — public exposure is name + grade only (FERPA).
2. **News / Events tabs:** show published, in-window, public-audience content.
3. **About tab:** prefers a published `about` CMS page; falls back to the school description.

## Part E — Cross-cutting checks

- ☐ Dark mode: toggle theme (light/dark) on CMS + Students pages — no broken contrast, badges readable.
- ☐ Mobile 375px: roster table scrolls horizontally without breaking layout; dialogs fit the viewport.
- ☐ Teacher account: can submit content for review and read the roster, but **cannot** publish, reject, or restore.
- ☐ Super admin: sees all of the above across schools.

---

## Acceptance criteria summary (for the operator)

| Feature | Criterion |
|---------|-----------|
| CMS workflow | Draft → Pending review → Published/Rejected; teachers cannot self-publish |
| Version history | Every save snapshots; admin can restore (→ new draft revision) |
| Public rendering | Published + in-window + public-audience content only; `about` page preferred |
| Roster | School-scoped, searchable, filterable, latest enrollment shown |
| Enrollment changes | Audited before/after; exit stamps on withdrawn/graduated |
| CSV export | Clean Excel-openable file with expected columns |
| CSV import | Matched rows enrich; unmatched surfaced + invite CSV with join code |
| FERPA | Public shows name + grade only; admin edits whitelisted + audited |
