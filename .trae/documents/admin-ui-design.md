# Admin UI Design — Decision Ledger (CMS + Student Module)

**Date:** 2026-08-21
**Skill:** refero-design (bundled fallback; Refero MCP not configured in this environment) + WebSearch reference research
**Scope:** `AdminCms` (Pages/News/Events/Resources), `AdminStudents` (roster + detail), and the public `/schools/:id` Students tab
**Status:** Reference-locked — the decisions below are the locks the Phase 2/3 implementations were built against. Reused tokens come from the existing Tailwind design system (`index.css` HSL tokens + shadcn/ui).

---

## 1. Research Basis (references studied)

| Source | Pattern captured | Adapted as |
|--------|------------------|------------|
| Admin content dashboard refs (Strapi / Sanity / Forestry-style CMS screens) | Editorial list pages favor **dense tables with a status column**; primary actions (New) in the page header, row actions in a per-row menu | CMS tab list views: shadcn Table, status badge column, "New" header button |
| Data-table design research (Tremor / shadcn data-table + general guidance) | Status as **semantic color chips** (green=published/active, amber=pending, gray=draft, red=rejected); avoid icon-only status; **row actions accessible without hover** (actions visible or in modal, not hover-only) | `STATUS_STYLES`/badge maps with fixed label + color; dialogs for edit/version/import actions |
| Admin dashboards (school SIS references — PowerSchool-style lists) | **Scanning and comparison** are the primary tasks → tables over cards for list data; keep density high but row height ≥ 44px for touch | Roster table with 44px+ rows, sticky header |
| Filter/refine patterns | Search + dropdown filters above the table, **count of filtered results** shown in the title so operators know scope | Filter row + `filtered.length` in CardTitle |
| Dialog-over-destructive patterns | Confirm destructive/state-changing actions in a dialog with explicit submit text; never hover-only affordances | Enrollment status change + CSV import results in dialogs |
| Refero anti-average rule | Do not blend conflicting references into a safe middle; choose one dominant direction | Dominant direction: **dense, scannable tables with semantic status** (SIS-style) over card-heavy dashboards; modal-first actions |

## 2. Token / Component Decisions

| Decision | Lock | Rationale / source |
|----------|------|--------------------|
| List layout | shadcn `Table` inside `Card`, header row `bg-muted/50`, `text-xs uppercase text-muted-foreground` | Data-table research: sticky/scannable headers; consistent with codebase Table usage |
| Status treatment | Text label + semantic badge: `published`/`active` → `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`; `pending_review`/`pending` → `bg-amber-500/10 text-amber-600 dark:text-amber-400`; `draft` → `bg-muted text-muted-foreground`; `rejected`/`withdrawn` → `bg-red-500/10 text-red-600 dark:text-red-400` | Semantic color research (green/amber/gray/red); never color-only (WCAG: label included) |
| Primary actions | Page header: title + `Button` with icon (New / Import / Export) on the right | Admin dashboard refs |
| Row actions | Visible icon buttons (`Pencil`, `Eye`, `Clock`, `Download`) — not hover-only; state-changing actions open dialogs | Table research: no hover-only affordances |
| Editing | `Dialog` + `Form` (title, slug, body textarea, audience select, publish/expiry dates) | CMS reference screens |
| Version history | `Dialog` listing `cms_content_versions` (version #, author, timestamp, diff preview) + `Restore` button (admin) | Content-editor conventions |
| Roster density | Avatar + name + email in first cell; grade/class/status columns; row height ≥ 44px | Touch-target + SIS scanning |
| Filters | Search input + grade/status `Select`s; filtered count in CardTitle | Data-table filter research |
| Import/export | `Import CSV` (hidden file input) + `Export CSV` buttons in header; results dialog lists matched/updated/unmatched rows + "Download invite CSV" for unmatched | Plan §7.4; keeps scanning visible, not toast-only |
| Empty/loading states | Skeleton rows while loading; empty state with icon + CTA + no-school-link guard | Existing app patterns; prevents blank screens |
| Dark mode | All colors via Tailwind tokens (`bg-background`, `text-muted-foreground`) or explicit `dark:` variants above; no raw `slate-*` on new surfaces | Plan §6.5 token pass; `SchoolProfile.tsx` existing `slate-*` not carried into admin pages |
| Mobile | `container mx-auto px-4 pt-24 pb-8`; tables allow horizontal scroll (`overflow-x-auto`) rather than hiding columns; dialogs full-width on small screens | Mobile 375px QA target |

## 3. What Was NOT Locked (deliberately)

- Custom data-grid libraries (e.g. TanStack Table) — avoided; shadcn Table + JS filtering is sufficient and keeps bundle small.
- Drag-and-drop content ordering — deferred; not in scope.
- Card-based roster — rejected in favor of tables (scanning research).
