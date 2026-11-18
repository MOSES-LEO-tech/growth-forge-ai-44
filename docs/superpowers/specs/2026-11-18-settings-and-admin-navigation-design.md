# Settings and admin navigation — design

Date: 2026-11-18
Status: awaiting approval
Scope: two changes, shipped in this order

## Intent

Two navigation problems, one cause: every feature that arrived added another
button to a bar, and nothing ever consolidated them.

1. Settings has three entry points on a signed-in screen (a gear with appearance
   controls, a "Settings" item in the avatar menu, and an admin "Settings" tab),
   and `/settings` is linked from exactly one place in the app.
2. The school admin row grew to eight sections plus a public-page link. Three of
   those pages are a single widget each (Academic 20 lines, Analytics 20 lines,
   Moderation 24 lines), so the row is wider than the work behind it.

The goal is fewer doors into the same rooms — not fewer capabilities.

## Goals

- One settings entry point per user, owning both appearance and account settings.
- A five-item admin row where each item is a real destination, not a wrapper.
- Existing URLs keep working through redirects; nothing 404s.
- Deep links survive: a settings section or admin tab is addressable by URL.

## Non-goals

- Redesigning what any settings or admin page *does*. Content stays.
- Changing permissions, RLS or which roles can reach which page.
- Touching the student/parent/teacher workspace tabs (already done).

## Anti-goals

- A nav that hides capability behind a "More" menu nobody opens.
- Deleting the old page components before the redirects are proven.
- Merging pages by iframe-style embedding of unrelated screens.

## Current state (evidence)

| Surface | Today |
|---|---|
| `SettingsDropdown` (gear) | Light/dark/system + five colour themes, inside the top bar |
| Avatar menu | A second "Settings" item linking to `/settings` — the only link to that page |
| `/settings` | Six tabs: profile, school, notifications, appearance, security, privacy |
| School admin nav | Overview, Content, Announcements, Academic, Moderation, Analytics, Scholarships, Settings + "View public page" |
| Admin page weight | Content 1491 lines, Overview 174, Announcements 400, Settings 91, and three ~20-line widget wrappers |

## Decisions taken by the owner (2026-11-18)

1. One gear owns both appearance and account settings, with sections inside.
2. The admin row becomes five items: Overview (analytics + approvals), Content
   (pages + announcements), Students (academic + moderation), Scholarships,
   Settings.
3. Settings ships first, on its own; the admin row is a separate change.

## Phase 1 — one settings entry

**The gear.** Its menu keeps the one-click appearance controls (mode and colour
theme) because those are worth a single click, then adds a divider and four
destinations:

- Account settings → `/settings?tab=profile`
- Notifications → `/settings?tab=notifications`
- Security → `/settings?tab=security`
- Privacy → `/settings?tab=privacy`

**The avatar menu** loses its duplicate "Settings" item. The avatar keeps what it
is for: identity, profile, sign out.

**The Settings page** takes its tab from `?tab=` (same pattern as the parent
workspace), so a gear link lands on the right section, a refresh keeps it, and a
link can be shared. Unknown values fall back to `profile`.

**Approaches considered**

- *A. One menu, sections inside* — chosen. Keeps appearance one click away and
  gives the account page a real home without a second door.
- *B. Gear for appearance only, avatar menu renamed to "Account settings"* —
  reasonable, but leaves two learned positions for one concept.
- *C. Gear links to a single Settings page* — simplest, but costs a page load for
  a light/dark toggle, which is the most-used control on the surface.

**Done when:** the gear is the only settings affordance in the top bar;
`/settings?tab=security` opens the security tab; no page links to a duplicate
settings entry.

## Phase 2 — five-item admin row

| New item | Absorbs | Content |
|---|---|---|
| Overview | Analytics, portfolio approvals | Existing overview + analytics tiles + the approval queue |
| Content | Announcements | CMS as `/admin/content`, announcements as `?tab=announcements` |
| Students | Academic, achievement moderation | Academic structure + achievement approvals |
| Scholarships | — | Unchanged |
| Settings | — | Unchanged (school badge, gallery, access, AI governance) |

**Redirects** (permanent, keep the old names working):

- `/admin/announcements` → `/admin/content?tab=announcements`
- `/admin/academic` → `/admin/students`
- `/admin/moderation` → `/admin/students`
- `/admin/analytics` → `/admin/overview`
- Existing legacy aliases (`/content`, `/announcements`, `/admin/cms`,
  `/admin/students/:id`) keep pointing at their new homes.

**Approaches considered**

- *A. Tabs inside the surviving pages* — chosen. The absorbed pages are already
  single widgets, so a tab is a two-line composition, and the row stops
  advertising doors that lead to one card.
- *B. New merged page components* — more code for the same result, and it
  duplicates the CMS's 1491 lines of state.
- *C. Nav grouping only, no content change* — the row shrinks but each item
  still opens a near-empty page; it hides the problem rather than fixing it.

**Done when:** the admin row shows five items; every removed URL lands on its new
home; the approval queue and analytics are reachable without the old pages; and
the moderation and academic widgets still load their data under the merged tabs.

## Builder's latitude (my calls, stated so they can be overruled)

- Tab state lives in the URL rather than component state, matching the parent
  workspace we shipped today.
- Absorbed page files stay in the repo until the redirects are verified live,
  then are removed in a follow-up commit.
- The school-admin row keeps "View public page" as a trailing action, not a nav
  item; it is not a section.

## Risks

- `AdminContent` is the largest page in the app; adding a tab must not remount the
  CMS editor on every switch (keep the editor mounted, switch panels only).
- Redirecting `/admin/moderation` to a tab changes a bookmark some staff may use;
  the redirect covers it, but the tab must exist before the redirect ships.
- Any nav change touches every role surface, so this ships as its own commit with
  the gate suite green.

## Test plan

- Unit: tab resolution from a query string (valid, unknown, missing).
- Manual, per role: admin row renders five items; each redirect lands correctly;
  the approval queue and achievement moderation still load data; settings tabs
  open from the gear for student, parent, teacher and admin.
