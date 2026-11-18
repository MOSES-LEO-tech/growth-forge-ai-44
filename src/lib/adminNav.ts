/**
 * School-admin navigation.
 *
 * Five destinations, each a real page. Announcements, Academic, Moderation and
 * Analytics used to sit here as separate items while being one widget each; they
 * now live inside Content (announcements tab), Students (academic + achievement
 * review) and Overview (analytics + portfolio approvals). The old URLs redirect.
 *
 * Kept as data, separate from the component, so the shape can be tested.
 */

export type AdminSectionIcon = "overview" | "content" | "students" | "scholarships" | "settings";

export interface AdminSection {
  label: string;
  to: string;
  icon: AdminSectionIcon;
}

export const SCHOOL_ADMIN_SECTIONS: readonly AdminSection[] = [
  { label: "Overview", to: "/admin/overview", icon: "overview" },
  { label: "Content", to: "/admin/content", icon: "content" },
  { label: "Students", to: "/admin/students", icon: "students" },
  { label: "Scholarships", to: "/admin/scholarships", icon: "scholarships" },
  { label: "Settings", to: "/admin/settings", icon: "settings" },
] as const;

/** Paths that no longer have their own page, and where they go now. */
export const ADMIN_REDIRECTS: readonly { from: string; to: string }[] = [
  { from: "/admin/analytics", to: "/admin/overview" },
  { from: "/admin/announcements", to: "/admin/content?tab=announcements" },
  { from: "/admin/academic", to: "/admin/students" },
  { from: "/admin/moderation", to: "/admin/students" },
  { from: "/announcements", to: "/admin/content?tab=announcements" },
  { from: "/content", to: "/admin/content" },
] as const;
