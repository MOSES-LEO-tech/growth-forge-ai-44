import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_TABS,
  isSettingsTab,
  resolveSettingsTab,
} from "@/lib/settingsTabs";

describe("resolveSettingsTab", () => {
  it("accepts every tab the page defines", () => {
    for (const tab of SETTINGS_TABS) {
      expect(resolveSettingsTab(tab)).toBe(tab);
    }
  });

  it("falls back to profile for unknown values", () => {
    expect(resolveSettingsTab("billing")).toBe(DEFAULT_SETTINGS_TAB);
    expect(resolveSettingsTab("")).toBe(DEFAULT_SETTINGS_TAB);
  });

  it("falls back when the parameter is absent", () => {
    expect(resolveSettingsTab(null)).toBe(DEFAULT_SETTINGS_TAB);
    expect(resolveSettingsTab(undefined)).toBe(DEFAULT_SETTINGS_TAB);
  });

  it("is case sensitive, so a wrong-cased value does not silently open a tab", () => {
    expect(resolveSettingsTab("Security")).toBe(DEFAULT_SETTINGS_TAB);
  });
});

describe("isSettingsTab", () => {
  it("narrows known tabs", () => {
    expect(isSettingsTab("privacy")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isSettingsTab("privacyy")).toBe(false);
    expect(isSettingsTab(null)).toBe(false);
  });
});
