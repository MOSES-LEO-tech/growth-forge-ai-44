# Scholarship sourcing kit

Purpose: produce a small, **verifiable** catalog. The platform can publish a scholarship only when its source is cited, so this kit is about evidence, not marketing copy.

Target for the pilot: **20–40 live entries** from 3–5 institutions you can actually reach. Two confirmed providers beat forty scraped rows.

---

## 1. Four channels, in order of trust

| # | Channel | Who does the work | What "done" looks like |
|---|---|---|---|
| 1 | **Provider submission** — the awarder sends you their call | Provider + you | Written terms + a named contact who will answer an email in 48 h |
| 2 | **Curated public call** — ministry, university, foundation, company publishes a cycle call | You | Source URL archived, key facts transcribed, amount copied not estimated |
| 3 | **School-internal award** — the school funds it | School + you | Named owner at the school who makes the decision |
| 4 | **Aggregator** — an existing portal offers a feed | You | Written permission or a ToS clause that allows republication |

Do not scrape a portal whose terms forbid it. Do not list an award "because it is well known" — if you cannot cite it, it stays in `draft`.

---

## 2. What to collect per scholarship

The CSV template (`catalog-template.csv`) mirrors the database. Fields that gate publishing:

| Field | Rule |
|---|---|
| `title` | The provider's own name for the award, not a paraphrase |
| `provider_name` | The legal awarding body |
| `provider_contact` | A real mailbox or phone that answers. No `example.com` |
| `category` | One of: `merit`, `stem`, `arts_sport`, `bursary`, `leadership`, `inclusion`, `school_internal`, `external` |
| `source_url` | Where you read the terms |
| `verified_at` | Date you last checked that page |
| `verified_by_email` | Your account, for accountability |
| `closes_at` | ISO timestamp with offset, e.g. `2027-02-28T23:59:00+03:00` |
| award | At least one of `award_min`, `award_max`, `award_type` |

Optional but strongly preferred: `description`, `application_url`, `decision_by`, `eligibility_rules` (levels, gender, region, subjects, activities, min_grade, need_band), `renewal_terms`, `steps`.

**Never invent an amount.** If the provider says "full tuition", put `award_type=tuition` and leave min/max empty. If they say "up to UGX 2,000,000", that is `award_max=2000000`, `currency=UGX`.

---

## 3. Verification pass (10–20 minutes per entry)

1. Open `source_url`. Confirm the page is the provider's own, not a repost.
2. Confirm four facts against it: **who may apply**, **what is awarded**, **closing date**, **how to apply**.
3. Record `verified_at` as today.
4. Put anything ambiguous into `description` rather than guessing an eligibility rule.
5. If the page is dead or undated, do not publish. Email the provider; leave it in `draft`.

Re-verify at each cycle. A listing not re-verified by its close date is archived automatically by the catalog, so a stale entry cannot sit there pretending to be open.

---

## 4. Outreach templates

### 4.1 First contact — provider (short)

> Subject: Listing your scholarship on Milestone (free)
>
> Hello [name],
>
> I run Milestone, a portfolio platform used by secondary schools in Uganda. We are building a verified scholarship directory so students can find awards they are actually eligible for, with the requirements spelled out.
>
> Could you send me the current call for [award name] — who can apply, what it covers, the closing date, and how students apply? I will publish it with a link to your page and your contact, and I will re-check it with you each cycle.
>
> Two questions: (1) may we list it, and (2) who should students contact if they get stuck?
>
> Regards,
> [name] · CWORKS LTD · cworks@gmail.com · +256 788 368 997

### 4.2 First contact — school-internal award

> Hello [head teacher / bursar],
>
> You already fund [award] internally. We can list it on your school's Milestone page so students see it alongside external awards, with your requirements in plain language.
>
> I need: who is eligible, what it covers, the closing date, who decides, and whether you want applications through the platform or in person.
>
> Nothing becomes visible until you approve the wording.

### 4.3 Follow-up (after 5 working days)

> Following up on [award]. If the terms have changed for this cycle, a two-line reply is enough — I will keep the listing in draft until I hear from you.

### 4.4 What not to say

- Do not promise students, volume, or rankings.
- Do not imply Milestone awards anything.
- Do not describe an unconfirmed award as "available now".

---

## 5. Red flags — stop and verify

- Amounts with no source page.
- "Apply through us" with no provider named.
- Deadlines in the past presented as open.
- A contact address that bounces.
- Terms copied from a third-party blog.
- Requests for student payment to "process" a scholarship. That is a scam pattern; report it, never list it.

---

## 6. Roles and cadence

| Who | Does |
|---|---|
| Sourcing lead (you) | Collects entries, fills the CSV, runs the validator, imports |
| Catalog admin (platform) | Publishes after verification, owns re-verification |
| Reviewer of record | Reads the pilot read-out and decides whether to widen |

Cadence: 30 minutes, twice a week, beats a single 8-hour push. Keep a running list of providers contacted and their status — that list is the real asset.

---

## 7. Before you import

Run the validator; it fails the file if a publishable row is missing evidence:

```bash
uv run python scripts/scholarships/validate_catalog.py docs/scholarships/catalog-template.csv
```

Fix every ERROR. WARN items are judgement calls (e.g. no amount stated). Only then import.
