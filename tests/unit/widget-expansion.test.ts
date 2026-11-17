import { describe, expect, it } from "vitest";
import { bodyStartsExpanded, opensDialogOnMount } from "@/lib/widgetExpansion";

describe("opensDialogOnMount", () => {
  it("never opens a dialog for defaultExpanded — the regression that hid the parent workspace", () => {
    expect(opensDialogOnMount({ defaultExpanded: true })).toBe(false);
  });

  it("opens when a parent component controls the state explicitly", () => {
    expect(opensDialogOnMount({ controlledOpen: true })).toBe(true);
  });

  it("stays closed when controlled state is false or absent", () => {
    expect(opensDialogOnMount({ controlledOpen: false })).toBe(false);
    expect(opensDialogOnMount({})).toBe(false);
  });

  it("does not open even when both inputs are set unless control is explicit", () => {
    expect(opensDialogOnMount({ defaultExpanded: true, controlledOpen: undefined })).toBe(false);
  });
});

describe("bodyStartsExpanded", () => {
  it("renders expanded content inline when requested", () => {
    expect(bodyStartsExpanded({ defaultExpanded: true })).toBe(true);
  });

  it("renders the teaser by default", () => {
    expect(bodyStartsExpanded({})).toBe(false);
    expect(bodyStartsExpanded({ defaultExpanded: false })).toBe(false);
  });

  it("is independent of dialog control, so inline content is not a modal", () => {
    expect(bodyStartsExpanded({ defaultExpanded: true, controlledOpen: false })).toBe(true);
  });
});
