import { describe, expect, it } from "vitest";
import { countCommentsByResource, countProjectFiles } from "@/lib/commentCounts";

describe("countCommentsByResource", () => {
  it("counts several comments on one project", () => {
    expect(
      countCommentsByResource([{ resource_id: "p1" }, { resource_id: "p1" }, { resource_id: "p2" }])
    ).toEqual({ p1: 2, p2: 1 });
  });

  it("returns an empty map when nothing was fetched", () => {
    expect(countCommentsByResource([])).toEqual({});
    expect(countCommentsByResource(null)).toEqual({});
  });

  it("skips rows without a resource id instead of creating an undefined key", () => {
    expect(countCommentsByResource([{ resource_id: "" }, { resource_id: "p1" }])).toEqual({ p1: 1 });
  });
});

describe("countProjectFiles", () => {
  it("counts media entries", () => {
    expect(countProjectFiles(["a.jpg", "b.mp4"])).toBe(2);
  });

  it("reports zero for null, missing or malformed values", () => {
    expect(countProjectFiles(null)).toBe(0);
    expect(countProjectFiles(undefined)).toBe(0);
    expect(countProjectFiles("a.jpg")).toBe(0);
  });
});
