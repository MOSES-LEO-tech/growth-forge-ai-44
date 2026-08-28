# Navbar Decluttering — Design

**Date:** 2026-08-22
**Status:** Approved (pending spec review)
**Skills used:** ui-ux-pro-max, brainstorming, web-design-guidelines

## Problem

The top navbar (`src/components/Navbar.tsx`) renders up to 13 links when a user is signed in:
5 marketing links (Features, How It Works, Schools, Scholarships, Contact) + 4 app links
(Projects, My Gallery, Smart Buddy, Profile) + My Apps + Guidance + 2 admin links
(CMS, Students). The navbar becomes crowded at `lg` widths, and below `lg` every one of
those links is hidden entirely — mobile users have no navigation at all.

The dashboard (`src/components/DashboardHeader.tsx`), meanwhile, renders **no** navigation
links — only logo, notification bell, and the avatar menu.

## Goal

Move all signed-in application links into the dashboard's own navigation so the top navbar
stays a clean marketing bar, and give mobile a real navigation menu.

## Decisions (user-confirmed)

1. **Top navbar** shows marketing links only; signed-in users get a single primary
   **Dashboard** button.
2. **App links** live in a role-aware nav strip inside the dashboard header.
3. **Mobile** gets a hamburger menu (top navbar) + horizontally scrollable dashboard strip.
4. **Admin pages** (`/admin/*`) get the same DashboardHeader + nav strip (they currently
   have no header at all).

## Design

### 1. Top navbar — `src/components/Navbar.tsx`

- Keep `navItems` (marketing) as the only inline links.
- Remove `authNavItems`, `adminNavItems`, the My Apps link, and the Guidance link
  (and the `Compass` icon import if unused).
- Signed in: right side = SettingsDropdown + primary **Dashboard** button
  (`/dashboard`), replacing Sign In / Get Started.
- Signed out: unchanged (SettingsDropdown + Sign In + Get Started).
- Mobile (`lg:hidden`): hamburger button opening a `Sheet` (Radix, `@/components/ui/sheet`)
  listing marketing links + Dashboard (signed in) or Sign In / Get Started (signed out).
  Trigger carries an `aria-label`; links are semantic `<Link>` elements.

### 2. Dashboard navigation — `src/components/DashboardHeader.tsx`

- Add a second sticky row under the header (`h-11`, `border-b`, `bg-background`,
  `overflow-x-auto` for small screens, thin/disabled scrollbar) with a role-aware set of
  `NavLink`s.
- Active state: `text-primary` + `border-b-2 border-primary` (active-state guideline).
- Link sets (order matters — admin workspace first for admins):
  - Student / Teacher / Parent: Projects · My Gallery · Smart Buddy · My Apps · Guidance · Profile
  - Admin / Super Admin: CMS · Students · Projects · My Gallery · Smart Buddy · My Apps · Guidance · Profile
- Header right side (bell, avatar menu, hero video uploader) is unchanged.
- Reusable: extracted link-set data + strip rendered from `profile.role`
  (`useAuth().userRole`), used by both the Dashboard and the admin layout.

### 3. Admin pages — shared header

- Create a small admin shell (or reuse `DashboardHeader` directly inside each admin page)
  rendering `DashboardHeader` + the nav strip above the existing page content.
- Profile / sign-out / refresh come from `useAuth` (same API the Dashboard already uses),
  so `DashboardHeader` needs no new dependencies.
- Routes: `/admin/cms`, `/admin/students`, `/admin/students/:id`.

### 4. Guidelines compliance (web-design-guidelines)

- Navigation via `<a>`/`<Link>` only (Cmd/Ctrl+click works); no `<div onClick>`.
- Active item visually indicated (color + underline).
- Sheet trigger has `aria-label`; Radix manages focus trap + ESC.
- `transition-colors` only — no `transition: all`.
- Mobile: contained horizontal scroll (`overflow-x-auto`) with no page-level overflow,
  no `user-scalable=no`.
- Existing skip-link in DashboardHeader is retained.

## Out of scope

- No changes to dashboard widget layout or the sidebar component.
- No new routes or page content changes.
- Guidance/My Apps pages themselves are unchanged (only their nav entry points move).

## Files touched

- `src/components/Navbar.tsx` — marketing-only links, Dashboard button, mobile Sheet.
- `src/components/DashboardHeader.tsx` — role-aware nav strip.
- `src/pages/Dashboard.tsx` — unchanged (header already rendered there); nav strip
  renders inside DashboardHeader, so no wiring change.
- `src/pages/admin/AdminCms.tsx`, `AdminStudents.tsx`, `AdminStudentDetail.tsx` —
  wrap with the shared header + strip.
- (new) `src/components/AdminShell.tsx` — optional shared wrapper for the admin pages.
- (new) `src/components/NavLinkStrip.tsx` (or inline in DashboardHeader) — the link strip.

## Verification

- Desktop: top navbar shows ≤5 marketing links + Dashboard button when signed in.
- Dashboard: nav strip per role (6 links students/teachers, 8 admins); active underline.
- Admin pages: header + strip present; navigation and sign-out work.
- Mobile 375px: hamburger menu on top navbar; strip scrolls horizontally with no page
  overflow (scrollWidth ≤ 376).
- `npx tsc -p tsconfig.app.json --noEmit` and `npx eslint` clean for touched files.
