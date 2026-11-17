import { describe, expect, it } from "vitest";
import { pendingChildRequests, type ChildLinkLike } from "@/lib/linkPresentation";

const row = (over: Partial<ChildLinkLike> = {}): ChildLinkLike => ({
  link_id: "l1",
  direction: "child",
  state: "pending",
  initiated_by_me: true,
  expires_at: "2026-12-01T00:00:00.000Z",
  updated_at: "2026-11-16T00:00:00.000Z",
  counterparty_name: "mark Lui",
  counterparty_email: "mark001@gmail.com",
  ...over,
});

describe("pendingChildRequests", () => {
  it("surfaces a request the child has not answered", () => {
    expect(pendingChildRequests([row({ state: "pending" })])).toHaveLength(1);
    expect(pendingChildRequests([row({ state: "invited" })])).toHaveLength(1);
  });

  it("ignores links that are already settled", () => {
    for (const state of ["active", "declined", "revoked", "expired"] as const) {
      expect(pendingChildRequests([row({ state })])).toHaveLength(0);
    }
  });

  it("ignores the parent's own guardian link (direction parent)", () => {
    expect(pendingChildRequests([row({ direction: "parent" })])).toHaveLength(0);
  });

  it("keeps every waiting child and drops the rest", () => {
    const result = pendingChildRequests([
      row({ link_id: "a", state: "pending", counterparty_name: "Ann" }),
      row({ link_id: "b", state: "active", counterparty_name: "Ben" }),
      row({ link_id: "c", state: "invited", counterparty_name: "Cid" }),
    ]);
    expect(result.map((r) => r.link_id)).toEqual(["a", "c"]);
  });

  it("returns an empty list for no links", () => {
    expect(pendingChildRequests([])).toEqual([]);
  });
});
