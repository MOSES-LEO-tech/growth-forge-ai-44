# Scholarships system — design

Status: proposed, awaiting approval
Date: 2026-11-13
Scope: the whole scholarships surface (catalog, interview, matching, requirements, applications, review)
Supersedes: the read-only scholarships list currently at `/scholarships` and `/my-applications`

---

## 0. What exists today (starting point)

Two tables and a read-only UI:

- `public.scholarships` — `id, title, amount, deadline, requirements (text), school_id, created_at`. No description, provider, currency, eligibility, documents, or lifecycle state.
- `public.scholarship_applications` — `user_id, scholarship_id, status, applied_at, notes`, `UNIQUE (user_id, scholarship_id)`, status CHECK `bookmarked | applied | interview | awarded | rejected`.
- Reads go through the `public-data` edge function (unfiltered, paginated); writes are limited to the student's own row.
- **No code path in the app creates a scholarship.** RLS allows modify only for `role = 'admin'` (school admin); `super_admin` is excluded. Table is empty.
- "Apply Now" navigates away without recording anything. The "application" is a self-managed kanban card the student drags through five columns.

Consequence: the feature is a brochure with no catalog and no application. Everything below is built to fix that, reusing what is sound (the unique pair constraint, the private-by-default RLS posture, the tracker metaphor).

---

## 1. Scope and constraints

### 1.1 Target students

| Segment | Description | Design consequence |
|---|---|---|
| In-school, senior (S4–S6) | Ages 15–19, at a partner school, applying to university/college | Needs deadline discipline, transcript-style evidence, guardian consent only if <18 |
| In-school, junior (S1–S3) | Ages 12–15, exploratory | Interview must not assume exam results; "don't know" is a valid answer |
| Unaffiliated / applying to join | Not yet linked to a school | Cannot rely on school verification; profile marked "unverified" and matching explains why |
| Re-applicant | Applied before, declined or missed | Must see prior outcome and reasons without re-entering data |

Assumption: Uganda/East Africa secondary context, English UI, EAT (UTC+03:00), mobile-first, low-bandwidth. No payment flows.

### 1.2 Scholarship categories

Eight archetypes, each with different evidence demands (see §3 for the catalog of rules):

1. Merit / academic excellence
2. STEM and innovation
3. Arts and sport
4. Need-based bursary
5. Community leadership and service
6. Girls and inclusion (targeted)
7. School-internal award (school-funded)
8. External provider award (organisation-funded, application leaves the platform)

Category drives which interview questions matter, which documents are requested, and which eligibility filters apply.

### 1.3 Roles

| Role | Can do | Cannot do |
|---|---|---|
| Student | Interview, edit profile, view matches, upload own documents, submit, withdraw, track | See other students, see reviewer notes before decision, edit a submitted application |
| Parent/guardian | Co-sign (consent) for a minor's submission; view status | Read reviewer notes, upload on the student's behalf without consent |
| Teacher | Endorse a claim (optional evidence), view applications of their own students | Approve/reject, see financial-need answers |
| School admin | Verify a single school-held fact on request (that the student is enrolled, and their grade) | Decide applications, read documents, see financial answers |
| Platform admin (CWORKS) | Own the catalog, verify a scholarship's source, moderate abuse, chase overdue providers, audit, export | Decide applications on a provider's behalf |
| Provider (external) | Receive one submitted application by private review link, request more information, decide with a reason | Browse other applicants, keep the link after it expires, see anything the student did not submit |

### 1.4 Privacy and consent

- Minors (under 18 at submission) require a guardian acknowledgement before the application can be submitted; the acknowledgement is recorded (`consent_by`, `consent_at`, `consent_scope`).
- Financial-need answers are visible to reviewers **as a band** (e.g. "high need"), never as raw figures, unless the scholarship explicitly requires a household-income document — in which case only the platform admin and the designated school admin see the file, not teachers.
- Document access is via short-lived signed URLs (≤5 minutes), never public bucket URLs.
- Reviewer access to a document writes an audit row (`who, what, when, reason`). The existing `log_sensitive_read()` helper is reused.
- Retention: documents deleted 12 months after the cycle closes, or immediately on student request (soft-delete then purge).
- Student-visible rule: the student can always see every document attached to their own application and who viewed it.

### 1.5 Document handling

- Private bucket `scholarship-documents`, path `<student_id>/<application_id>/<requirement_key>/<uuid>.<ext>`.
- Accepted: PDF, JPEG, PNG, WEBP. Max 10 MB per file, max 3 files per requirement.
- Server-side checks: MIME sniff, extension match, size, and a page-count cap for PDFs (10).
- No OCR required in MVP; a text field accompanies each upload ("what this proves").
- Uploads survive submission (locked, not deletable) until the cycle closes.

### 1.6 Deadline behaviour

- All deadlines stored as `timestamptz`; displayed in EAT; "closes at 23:59 on <date>".
- States: `draft` → `published` → `open` → `closing_soon` (≤7 days) → `closed` (read-only) → `archived`.
- At close: submissions blocked with an explicit message, not a silent failure; in-progress drafts become `expired` and are read-only but re-usable as a template for the next cycle.
- No grace period in MVP (a documented, deliberate choice — see §15).
- Reminders at T-14, T-7, T-1, and on any missing required document; suppressed once submitted.

### 1.7 Success metrics

| Metric | Definition | Target (pilot) |
|---|---|---|
| Profile completion | Interviews finished ÷ interviews started | ≥ 65% |
| Match→guide | Scholarship guides opened ÷ distinct matches shown | ≥ 40% |
| Guide→document | At least one document uploaded ÷ guides opened | ≥ 55% |
| Completion rate | Submitted ÷ applications started | ≥ 45% |
| Time-to-apply | Median minutes, interview start → submit | ≤ 25 min across sessions |
| Match quality | Student marks a match "relevant" (or applies) ÷ matches shown | ≥ 60% |
| Reviewer turnaround | Median hours, submitted → decision | ≤ 72 h |
| Stuck applications | Submitted applications with no decision after 7 days | ≤ 5% |
| Drop-off point | Modal screen where sessions end | reported, no target in pilot |

Instrumentation: reuse `analytics_events` + `track_event()`; event names fixed in §12.

---

## 2. Approaches considered

**A. Rules as data, evaluated in Postgres (recommended).** Eligibility and scoring rules live in `scholarships.eligibility_rules` (JSONB) and are evaluated by `app_private.match_scholarships(user_id)` (SECURITY DEFINER, `security definer` + `search_path` pinned). The client renders results; a TypeScript mirror exists only for live previews in the admin editor.

- Pro: one implementation of truth; advisors cannot drift; RLS applies naturally; a school admin editing rules cannot change scoring code; testable in SQL; cheap on mobile (one RPC).
- Con: rule DSL needs versioning and a validator; SQL debugging is less pleasant than TS.

**B. Rules in TypeScript on the client.** Fastest to iterate, worst to trust: rules become visible only at runtime for the user, scoring changes require a deploy, and nothing stops a client from fabricating a match.

**C. Rules in an edge function.** Reasonable, but duplicates auth/RLS context, needs another deploy path, and adds latency for a purely deterministic calculation. Reserved for LLM-assisted *explanations* only, not for eligibility.

Recommendation: **A**, with the TS mirror limited to the admin preview and a shared test fixture file so both must agree.

---

## 3. Scholarship catalog

### 3.0 Where scholarships come from

The platform does not invent scholarships, and today it holds none: the table is empty and there is **no import, seed or partner feed anywhere in the codebase**. Every published entry must therefore arrive through one of four channels, in this order of trust:

| Channel | How it arrives | Who does the work | Requirements before publish |
|---|---|---|---|
| **1. Provider submission** | Provider sends the call (form or email) to CWORKS | Platform admin curates | Provider contact + written confirmation of the terms |
| **2. Curated public call** | A ministry, university, foundation or company publishes a call for the cycle | Platform admin reads and transcribes | `source_url`, `verified_at`, `verified_by`; amounts copied from the source, never estimated |
| **3. School-internal award** | The school funds it; the school is the provider | School supplies terms to CWORKS | Named contact at the school who owns the decision |
| **4. Aggregator** | An existing scholarship portal offers a feed or permission | Platform admin | Written permission / ToS check — no scraping |

Rules that make this defensible:

- `source_url`, `verified_at`, `verified_by` and `provider_contact` are **required to publish**. Missing any one keeps the entry in `draft`.
- Re-verification each cycle; an entry not re-verified by its close date moves to `archived` automatically.
- The listing states plainly that Milestone is not the awarding body, and links to the provider's own call.
- No copied amounts, no implied endorsement, attribution to the provider by name.
- Curation cost is real: roughly 10–20 minutes per scholarship per cycle. A credible pilot needs **20–40 live entries** from the 3–5 institutions CWORKS can actually reach, not a scrape of hundreds.

Consequence for the pilot: sourcing is the critical path, not code. Two or three confirmed providers beat forty unverified rows.

### 3.1 Catalog entry (data shape)

Each scholarship record carries:

```
identity     title, provider_name, category, description, logo?, application_mode (internal|external), application_url
money        award_min, award_max, currency, award_type (cash|tuition|stipend|mixed), renewal_terms
timing       opens_at, closes_at, decision_by, cycle (e.g. 2027-intake)
eligibility  { level[], gender?, region[], school_affiliation?, min_grade?, age_range?, need_band?, subjects_any[], activities_any[], citizenship? }
documents    requirement keys (see §3.3), each with applies_when
process      steps[] (plain language), review_sla_hours, quota_total?, quota_per_school?
lifecycle    status (draft|published|archived), version, created_by, updated_by
```

### 3.2 The eight archetypes (rules that differ)

| # | Type | Eligibility shape | Required docs (typical) | Award range | Renewal | Common rejection reasons |
|---|---|---|---|---|---|---|
| 1 | Merit / academic | level, min_grade, subjects_any | report card, school reference, personal statement | tuition + stipend, banded | annual, min GPA/grade | weak grades vs cohort, generic statement, missing reference |
| 2 | STEM / innovation | level, subjects_any (maths/science), project evidence | project description, teacher endorsement, report card | tuition or equipment grant | annual, continued project | project not the student's own, no evidence, unmet maths prerequisite |
| 3 | Arts / sport | level, activities_any, portfolio/audition | portfolio (3–10 files) or video, coach/teacher reference | training fees + equipment | per season | portfolio quality, no reference, deadline miss |
| 4 | Need-based bursary | level, need_band ≥ medium, region/school | household income statement, guardian ID/consent, report card | fees + boarding | annual, need re-check | income above threshold, incomplete guardian consent, inconsistent documents |
| 5 | Leadership / service | level, activities_any, essay | service log, two references, essay | stipend + mentorship | annual | unverifiable claims, no referee, essay off-topic |
| 6 | Girls / inclusion | level, gender, region, subjects_any | report card, guardian consent, motivation letter | tuition + mentorship | annual | eligibility mismatch, missing consent, low motivation evidence |
| 7 | School-internal | level, school_affiliation | report card only (school already holds it) | partial fees | termly | internal ranking, attendance, discipline record |
| 8 | External provider | level, region, citizenship | provider's own list; platform only tracks status | varies | provider's rules | (platform records the outcome; reasons optional) |

Award ranges are **configuration, not fact** — the pilot sets real numbers per scholarship and the UI never invents them.

### 3.3 Requirement definitions

Requirements are first-class rows, not prose, so the checklist, upload slots and reviewer side all read the same list:

```
key            e.g. "household_income"
label          "Proof of household income"
why            one sentence a 13-year-old understands
example        "A letter from your LC1, or a payslip; a photo is fine"
doc_type       pdf|image|either
required       bool
applies_when   { level: [...], need_band: [...], category: [...] }   -- evaluated per application
max_files      1..3
sensitivity    normal | financial | identity
```

Hidden logic: a requirement whose `applies_when` does not match the student's profile is **not shown at all** (not shown disabled). This is what "hide irrelevant requirements" means concretely.

---

## 4. The "grill-me" interview

### 4.1 Shape

- 5 sections, 14 core questions, 0–6 branch questions depending on answers.
- One question per screen on mobile; a section header shows progress ("Section 2 of 5 · about 3 minutes left").
- Every question: **Skip**, **Not sure**, **Edit** (from the review step). Skipped questions lower profile confidence rather than blocking.
- Answers auto-save per step (`interview_sessions.answers` JSONB) — closing the browser loses nothing.
- Tone: second person, no jargon, no "eligibility matrix". Confidence question is explicit: "How sure are you about what you want to study?" 1–5.

### 4.2 Question bank

| # | Section | Question | Type | Skip | Branches |
|---|---|---|---|---|---|
| 1 | You | What year are you in, and what do you expect to finish? | select + year | yes | junior → Q2a instead of Q3 |
| 2 | You | Which school do you attend? (search, or "not at a school yet") | lookup | yes | unaffiliated → flag profile `unverified` |
| 2a | You | Which subjects do you enjoy most right now? | multi (max 3) | yes | — |
| 3 | Strengths | Which subjects are you strongest in? | multi (max 3) | yes | none → ask Q3a |
| 3a | Strengths | Which subject feels easiest, even if marks are low? | single | yes | — |
| 4 | Strengths | Roughly where do your marks sit? (top 10% / above average / average / below average / not sure) | single band | yes | "not sure" → mark gap, no penalty |
| 5 | Strengths | Name one thing you made, built, won, or led. | free text + optional file | yes | blank → gap `no_evidence` |
| 6 | Interests | What do you want to study or do after school? | single (field list) + "not sure" | yes | not sure → Q6a explore mode |
| 6a | Interests | Which of these sounds most interesting? (6 taster cards) | single | yes | — |
| 7 | Interests | Which activities do you do outside class? | multi (sport, arts, coding, debate, volunteering, faith, farming, other) | yes | picks → may unlock category 3/5 |
| 8 | Goals | What would a scholarship change for you? | free text (max 240 chars) | yes | — |
| 9 | Constraints | How far can you travel to study? (same town / same region / anywhere in country / abroad) | single | yes | region filter |
| 10 | Constraints | Do you need boarding or a day place? | single | yes | — |
| 11 | Money | How much does cost affect your choice? (not at all / a little / a lot / it decides everything) | single → need_band | yes | — |
| 12 | Money | Has anyone in your household applied for a bursary before? | yes/no/not sure | yes | yes → skip Q12a |
| 12a | Money | (if no) A bursary usually needs proof of income. Can you get a letter from your LC1 or employer? | yes/maybe/no | yes | no → warn: bursaries will be marked "hard to complete" |
| 13 | Confidence | How confident are you about your plan for after school? | 1–5 scale | yes | 1–2 → explore bucket priority |
| 14 | Review | Here's what we understood. Change anything? | confirmation list | — | edits jump back to that question |

Deliberately excluded from the interview: religion, ethnicity, disability, exact household income, phone number, national ID. Those are either sensitive without need or collected as documents during application.

### 4.3 Adaptive rules

- Junior students never see Q3/Q4 about exam bands; they get interest-first questions.
- Unaffiliated students skip school lookup verification and get a banner: "We can't verify your school yet — some scholarships need a school reference."
- If Q11 = "it decides everything", bursaries are surfaced first and the guide pre-warns about income proof.
- If Q13 ≤ 2, matching adds an "explore" set and the summary says so, without implying the student is unprepared.

---

## 5. Capability and interest profile

### 5.1 Dimensions

| Dimension | Source | Range | Evidence |
|---|---|---|---|
| `academic_strength` | Q3, Q4, report card if uploaded | 0–100 | subject list, band, verified flag |
| `subject_fit` | Q3, Q6 | map subject → 0–100 | chosen subjects, stated goal |
| `activity_profile` | Q7, Q5 | tags + strength | named activity, optional file |
| `leadership` | Q5, Q7 | 0–100 | "led" language, service log |
| `need_band` | Q11, Q12a | low / medium / high | answer + document availability |
| `mobility` | Q9, Q10 | local / regional / national / international | travel + boarding answer |
| `confidence` | Q13 | 1–5 | self-report |
| `evidence_strength` | derived | 0–100 | count of claims with an attached artifact |

### 5.2 Scoring (deterministic, explainable)

```
academic_strength = band_score(Q4) * 0.7 + subject_count_bonus(Q3) * 0.2 + evidence_bonus * 0.1
subject_fit[subject] = 100 if in Q3 and Q6 aligned, 70 if in Q3 only, 55 if in Q6 only, else 0
need_band = {not at all: low, a little: low, a lot: high, decides everything: high}
confidence does not change any dimension; it changes how matches are presented
```

Unanswered → dimension `null`, never `0`. Null means "we don't know", which the matcher treats as *unknown*, not *poor* (this is the same rule the numeric contract already enforces elsewhere in the app).

### 5.3 Plain-language summary

Shown before matching, one editable block:

> "You're in S5 at Goodwill SSS, strongest in maths and physics. You've built a robotics project (we have the photo) and play football. You want to study engineering and can travel anywhere in Uganda. Cost matters a lot, and you're not sure yet whether you can get an income letter."

- Each sentence links back to the question that produced it.
- Gaps are stated as facts, not failures: "We don't have a report card yet — some scholarships will ask for one."
- Corrections update the session, recompute in the same request, and are logged as profile edits.

---

## 6. Matching

### 6.1 Hard eligibility (binary, must pass)

Evaluated in `app_private.match_scholarships`:

```
status = 'published'
AND closes_at > now()
AND (level IS NULL OR student.level = ANY(level))
AND (gender IS NULL OR student.gender = ANY(gender))
AND (region IS NULL OR student.region = ANY(region))
AND (school_affiliation IS NULL OR student.school_id = ANY(school_affiliation))
AND (min_grade IS NULL OR grade_rank(student.grade) >= min_grade)
AND (age_range IS NULL OR student.age BETWEEN age_range[1] AND age_range[2])
```

Unknown student attributes never fail a filter; they mark the match `needs_info` and list the missing answer.

### 6.2 Soft score (0–100)

| Component | Weight | Rule |
|---|---|---|
| Subject fit | 30 | max of `subject_fit` across the scholarship's `subjects_any` |
| Academic | 20 | `academic_strength` scaled; `min_grade` met adds 5 |
| Activity/leadership | 20 | category match on activity tags; leadership bonus for category 5 |
| Need alignment | 15 | `need_band` ≥ scholarship's `need_band` (bursaries) or neutral |
| Geography/mobility | 10 | within stated travel range |
| Evidence completeness | 5 | documents already on file for this scholarship's requirements |

### 6.3 Buckets

| Bucket | Rule | Presentation |
|---|---|---|
| **Safe** | score ≥ 75 and all hard rules pass with known attributes | "Strong match" + 2–3 reasons |
| **Stretch** | 55–74, or ≥75 but one requirement is unmet (e.g. grade band) | "Worth trying" + what would improve it |
| **Explore** | < 55, or confidence ≤ 2, or category the student hasn't considered | "Open a door" + one-line why |

Rules are data; thresholds live in one settings row so the pilot can tune them without a deploy.

### 6.4 Reasons and honesty

Every card shows the reasons that produced the score, in the student's words: "You're strong in maths (you picked it) · This needs a school reference (we don't have one yet) · Closes 12 Dec".

### 6.5 Fallback when nothing scores well

Never an empty screen. Order:

1. "Closest 3" — best scores even if low, with the specific blocker named.
2. "Fix one thing" — the single action that would unlock the most scholarships (usually: upload a report card, or answer Q4).
3. "Browse by category" — all published scholarships, filterable.
4. "Tell us what's missing" — free-text to the platform admin, creates a catalog-gap note.

---

## 7. Requirements guide (per scholarship)

Structure, in order, progressive disclosure:

```
1. Who can apply        plain-language rendering of eligibility_rules ("You need to be in S5 or S6")
2. What you get          award range + what it covers + renewal conditions
3. Step by step          3–6 steps, each with an estimated time
4. What you need         requirement checklist: label, why, example, upload slot
5. Deadline & timeline   opens/closes/decision, reminder schedule
6. Before you submit     auto-generated pre-flight: missing docs, guardian consent
7. After you submit      what happens, who reviews, when to expect a decision
8. Help                  "Stuck? Ask your school's scholarship contact" + FAQ per category
```

Checklist item states: `not_started → uploaded → needs_review → accepted | rejected(reason) | waived`. Rejection shows the reviewer's plain-language reason and a single "replace file" action; no dead ends.

Jargon is banned by a written list (`disbursement`, `matriculation`, `attestation`, `bona fide`) with approved replacements, enforced in the admin editor as a lint on requirement text.

---

## 8. Student workflow (end to end)

```
Landing /scholarships
  → [no profile] Start interview  ──────────────┐
  → [profile exists] Show matches                │
                                                 ▼
Interview (5 sections, autosave) → Profile summary (editable)
                                                 ▼
Matches: Safe / Stretch / Explore (+fallback) → open guide
                                                 ▼
Guide: checklist → upload / request docs → pre-flight
                                                 ▼
Submit (guardian consent if minor) → status tracker
                                                 ▼
Reminders (T-14/7/1, missing doc) → decision → next action
```

State machine (application): `draft → submitted → under_review → info_requested → approved | rejected → awarded | declined → withdrawn | expired`.

Every state has a defined owner, a student-visible explanation, and a next action. No state renders as a spinner.

Screens (student): `/scholarships` (matches), `/scholarships/interview`, `/scholarships/profile`, `/scholarships/:id` (guide), `/scholarships/:id/apply` (checklist + uploads), `/scholarships/:id/submitted`, `/my-applications` (tracker, replaces the kanban-only view).

---

## 9. Admin workflow

**Catalog (platform admin, plus school admin for their own school-scoped entries)**

- Create from archetype template (prefills requirements and steps).
- Edit fields with a live "student preview" of the eligibility text and checklist.
- Rule editor: structured form (no raw JSON), validated against the same DSL the matcher uses; save blocked until valid.
- Publish requires: ≥1 requirement, closes_at in future, award range set, at least one eligibility field. Unpublish keeps applications alive; delete is soft (`archived`) and blocked entirely if applications exist.
- Deadline rollover: "copy to next cycle" duplicates with new dates and `version+1`; old cycle archived.
- Every change writes `catalog_events` (who, field, before, after).

**Review — the provider decides, not the middleman**

The student applies to the provider. Milestone carries the pack and the record; it does not sit between them.

- **Provider review link (default).** On submit, the system mints a single-application link: scoped to that application, expiring in 14 days, revocable by the student, no account required. The provider sees the student's summary, the checklist state and the submitted documents, then approves, rejects (fixed reason list + free text) or requests more information. Every view is logged with time and IP hash; documents are watermarked with the provider's name and the date.
- **External pack (fallback).** If the provider won't use the link, the student gets a shareable pack (single PDF: profile summary, checklist, documents) and records the outcome themselves — the current tracker behaviour, kept because it is honest about what we can verify.
- **School involvement is narrow and on request.** A scholarship may declare `requires_enrolment_check`; the student then asks their school to confirm one fact — enrolled, and which grade. The school sees that request only, nothing else, and cannot read documents or decide.
- **Platform admin oversees, never decides.** Catalog and source verification, moderation, abuse handling, provider SLA nudges, reassignment of an abandoned review link, export for reporting.
- **Escalation is a nudge, not a takeover.** If a link expires without a decision, the platform admin contacts the provider; the application is marked `awaiting_provider`, and the student is told plainly.

Provider-side screens are deliberately not an app: the link opens a single read-only page with three actions.

**Admin screens**: `/admin/scholarships` (list + status + source-verified badge), `/admin/scholarships/new`, `/admin/scholarships/:id/edit`, `/admin/scholarships/:id/applications` (pipeline + stuck), `/admin/scholarships/applications/:id` (record, no decision buttons except "resend link" / "mark as decided elsewhere"), `/admin/scholarships/sources`, `/admin/scholarships/reports`.

**Audit**: catalog edits, source verification, document views (by provider link or admin), reminders sent, link reissues, exports.

---

## 10. Usability and accessibility

- **Mobile-first**: single-column, 44×44 px targets, sticky primary action, no horizontal scroll, uploads from camera or file picker.
- **Saved progress**: per-step autosave; resume banner ("You stopped at 'What you need' — 2 of 4 done").
- **Empty states**: every list states what it is, why it's empty, and the one action to take.
- **Error prevention**: deadline check before submit, duplicate-application guard (`UNIQUE` already exists), file type/size checked client *and* server, submit disabled with a reason list rather than a failed request.
- **Language**: target reading age 12–14; short sentences; no jargon list above; amounts always with currency.
- **Accessibility (WCAG 2.2 AA)**: labelled controls, visible focus, no colour-only status (icon + text), error text linked via `aria-describedby`, keyboard-operable uploads, reduced-motion respected, screen-reader announcements on step change.
- **Minimal repeated entry**: profile fields prefill application forms; school-held documents (report card) are requested once and reused across scholarships with the student's permission.
- **Low bandwidth**: text-first, images lazy and compressed, PDFs previewed as first-page thumbnails only.

---

## 11. Data model

Extend two tables, add five.

```sql
-- 1. scholarships (extend existing)
alter table public.scholarships
  add column provider_name      text,
  add column category           text not null default 'merit',   -- 8 archetypes
  add column description        text,
  add column award_min          numeric,
  add column award_max          numeric,
  add column currency           text not null default 'UGX',
  add column award_type         text,
  add column application_mode   text not null default 'internal', -- internal | external
  add column application_url    text,
  add column eligibility_rules  jsonb not null default '{}'::jsonb,
  add column steps              jsonb not null default '[]'::jsonb,
  add column renewal_terms      text,
  add column opens_at           timestamptz,
  add column decision_by        timestamptz,
  add column status             text not null default 'draft',    -- draft|published|archived
  add column version            integer not null default 1,
  add column created_by         uuid references public.profiles(id),
  add column updated_by         uuid references public.profiles(id);
-- deadline stays as the closing date; closes_at is derived (deadline 23:59 EAT)

-- 2. scholarship_requirements (new)  — see §3.3
-- 3. student_capability_profiles (new) — one row per student, dimensions + summary + gaps
-- 4. interview_sessions (new) — answers jsonb, status, version, completed_at
-- 5. application_documents (new) — application_id, requirement_key, storage_path, mime, size,
--                                  review_status, reviewer_note, reviewed_by, reviewed_at
-- 6. application_events (new) — immutable log: state transitions, decisions, doc views
-- 7. catalog_events (new) — scholarship field changes (who/before/after)

-- 8. scholarship_applications (extend)
alter table public.scholarship_applications
  add column requirement_status jsonb not null default '{}'::jsonb,
  add column submitted_at       timestamptz,
  add column decided_at         timestamptz,
  add column decided_by         uuid references public.profiles(id),
  add column decision_reason    text,
  add column consent_by         uuid references public.profiles(id),
  add column consent_at         timestamptz;
-- status CHECK extended with: draft, submitted, under_review, info_requested,
-- approved, awarded, declined, withdrawn, expired (existing five values retained for history)
```

### RLS summary

| Table | Student | Teacher | School admin | Platform admin |
|---|---|---|---|---|
| `scholarships` | SELECT published | SELECT published | SELECT own-school drafts; ALL own-school | ALL |
| `scholarship_requirements` | SELECT for visible scholarships | same | ALL own-school | ALL |
| `interview_sessions` | own | — | — | read (support) |
| `student_capability_profiles` | own | — | summary only, own students | read |
| `scholarship_applications` | own (no update after submit) | own students, read | own school, full review | all |
| `application_documents` | own | — | own school, sensitivity ≤ normal | all, access logged |
| `application_events` / `catalog_events` | own app events | — | own school | all |

Documents are never readable via a table SELECT that returns URLs; the client requests a signed URL from an RPC that logs the access.

---

## 12. Instrumentation

Event names (all via `track_event`, props sanitised by the existing helper):

```
scholarship_interview_started / _step_completed / _abandoned / _completed
scholarship_profile_viewed / _corrected { dimension }
scholarship_matches_viewed { safe, stretch, explore, fallback }
scholarship_match_feedback { scholarship_id, verdict: relevant|not_relevant }
scholarship_guide_opened
scholarship_requirement_uploaded / _rejected { requirement_key }
scholarship_application_submitted { completeness_pct }
scholarship_decision_received { decision, days_to_decision }
scholarship_reminder_sent { kind }
```

Dashboard (platform admin): funnel above, per-category completion, reviewer SLA, stuck applications, rejection-reason distribution.

---

## 13. Pilot, edge cases, MVP

### 13.1 Pilot

- 2 real scholarship types (recommend: one merit, one need-based bursary), 1 school, 8–12 students, 2 reviewers.
- Duration: one application cycle (or 3 weeks, whichever is shorter).
- Success = the §1.7 targets, plus: every student who submitted can explain what they still owe and when they'll hear back.

### 13.2 Edge cases and required behaviour

| Case | Behaviour |
|---|---|
| Missing required document at submit | Blocked with a list; each item links to its upload slot; "save and come back later" offered |
| Missed deadline mid-application | Auto-transition to `expired` at close; read-only view; "copy to next cycle" if one exists |
| Low-confidence profile (Q13 ≤ 2) | Explore bucket leads; no warning language about readiness |
| No strong matches | Four-step fallback (§6.5), never a blank page |
| Duplicate application | `UNIQUE(user_id, scholarship_id)` + friendly "you already applied" with link to tracker |
| Guardian refuses consent | Application stays `draft`, student told exactly what is blocked; can withdraw |
| Document rejected | Reason + replace action; checklist item returns to `needs_review` |
| Reviewer inactive > SLA | Dashboard flag + reassignment to platform admin |
| Student changes school mid-cycle | Application keeps its original school context, flagged for reviewer |
| Admin edits a published scholarship | Version bump; existing applications keep the version they applied under |
| Upload fails on 2G | Resumable retry + "saved to try later" queue; no data loss of answers |

### 13.3 MVP backlog (MoSCoW)

**Must (build to pilot)**
1. Schema migration + RLS matrix (§11) with tests
2. Catalog admin: create/edit/publish/archive with archetype templates + validation
3. Requirement editor with `applies_when`
4. Interview: 14 core questions, autosave, skip/not-sure, review screen
5. Capability profile + plain summary + corrections
6. Matching RPC: hard filters, weighted score, three buckets, reasons, fallback
7. Guide: eligibility in plain language, checklist, deadlines
8. Uploads: private bucket, signed URLs, per-requirement slots, server validation
9. Submit: pre-flight, guardian consent for minors, immutable snapshot
10. Status tracker replacing kanban-only view
11. Provider review: tokenised single-application link (14-day expiry, revocable, view-logged), approve / reject with reason / request more info; external-pack fallback with student-recorded outcome
12. School enrolment check on request only (one fact, nothing else)
13. Audit: document views, decisions, catalog and source changes
14. In-app reminders: T-14/7/1 + missing doc

**Should (fast follow)**
- CSV export, per-category metrics dashboard, reassignment, "copy to next cycle", match feedback, teacher endorsement, bulk request-docs

**Could (later)**
- LLM-written explanations of matches (rules stay deterministic), SMS/WhatsApp reminders, multi-language (Luganda/Swahili), provider self-service portal, PDF application pack export

**Won't (this design)**
- Payments, provider accounts, OCR/document verification, cross-border tax handling

### 13.4 Rollout

1. Schema + RLS + matching RPC in a branch; seed one synthetic scholarship; SQL tests.
2. Catalog admin behind a flag; author the two pilot scholarships.
3. Interview + profile; internal dogfood with 3 staff accounts.
4. Matching + guide; review with the school's scholarship contact.
5. Uploads + reviewer queue; pilot with 8–12 students.
6. Read-out against §1.7, then widen to Should-list.

---

## 14. Test plan

| Layer | What | Examples |
|---|---|---|
| Unit (TS) | profile dimension math, bucket classification, plain-language renderer, deadline state machine, requirement `applies_when` evaluation | null answers never score 0; unknown attribute → `needs_info` not fail |
| Unit (SQL) | `match_scholarships` determinism, eligibility edge cases, status transitions, consent gate | minor without consent cannot submit; closed scholarship rejects |
| Contract | RPC shapes, JSON schema for `eligibility_rules`, signed-URL RPC | invalid DSL rejected at save time, not at match time |
| Integration | RLS matrix (student/teacher/school admin/platform admin), document access logging | teacher cannot read financial documents; cross-school access denied |
| E2E (Playwright) | full journey on mobile viewport, resume after reload, upload fail/retry, deadline expiry, fallback with no matches | one script per bucket (safe/stretch/explore/fallback) |
| Accessibility | axe on every new screen, keyboard-only upload, screen-reader step announcements | zero critical violations |
| Content | jargon lint on requirement text, reading-age check | banned-word list enforced |
| Pilot UAT | the §13.2 edge cases executed with real students and reviewers | scripted, observed, timed |

Fixture rule: one JSON file of student scenarios (high achiever, low confidence, unaffiliated, high need, strong activity, missing evidence) shared by TS and SQL tests so the two rule implementations cannot diverge.

---

## 15. Decisions

**Settled with the owner**

1. **Publisher**: platform admin (CWORKS) only. School admins do not publish.
2. **Documents**: full private uploads with signed URLs in MVP.
3. **Decision-maker**: the **provider**, not the school or the platform. Milestone carries the pack; it does not stand between applicant and awarder. School involvement is one on-request enrolment fact; platform admin oversees without deciding.
4. **Deadlines**: hard close. No grace window.

**Still open**

5. **Sourcing for the pilot** — which channel CWORKS can actually reach first (§3.0). This is the critical path: code without two or three confirmed providers produces an empty catalog again.
6. **Award data** — real amounts from those providers, or "varies" until confirmed. Recommendation: only publish what a provider has stated in writing.
7. **`requires_enrolment_check`** — off by default. Turn on only for scholarships whose provider insists on school confirmation.
