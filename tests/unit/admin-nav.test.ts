import { describe, expect, it } from "vitest";
import { ADMIN_REDIRECTS, SCHOOL_ADMIN_SECTIONS } from "@/lib/adminNav";

const paths = SCHOOL_ADMIN_SECTIONS.map((section) => section.to);

describe("SCHOOL_ADMIN_SECTIONS", () => {
  it("exposes exactly five destinations", () => {
    expect(paths).toEqual([
      "/admin/overview",
      "/admin/content",
      "/admin/students",
      "/admin/scholarships",
      "/admin/settings",
    ]);
  });

  it("no longer advertises the absorbed pages", () => {
    for (const removed of ["/admin/academic", "/admin/moderation", "/admin/analytics", "/admin/announcements"]) {
      expect(paths).not.toContain(removed);
    }
  });

  it("uses one icon per section and no duplicates", () => {
    const icons = SCHOOL_ADMIN_SECTIONS.map((section) => section.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});

describe("ADMIN_REDIRECTS", () => {
  it("sends every retired path to a section that still exists", () => {
    for (const { to } of ADMIN_REDIRECTS) {
      const target = to.split("?")[0];
      expect(paths).toContain(target);
    }
  });

  it("never redirects a path twice", () => {
    const from = ADMIN_REDIRECTS.map((redirect) => redirect.from);
    expect(new Set(from).size).toBe(from.length);
  });

  it("does not redirect a live section path", () => {
    for (const { from } of ADMIN_REDIRECTS) {
      expect(paths).not.toContain(from);
    }
  });
});
