/**
 * Settings tab resolution.
 *
 * Settings sections are addressable by URL (`/settings?tab=security`) so the
 * gear menu can link straight to one, a refresh keeps it, and a link can be
 * shared. Anything unrecognised falls back to the profile section rather than
 * rendering an empty panel.
 */

export const SETTINGS_TABS = [
  "profile",
  "school",
  "notifications",
  "appearance",
  "security",
  "privacy",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const DEFAULT_SETTINGS_TAB: SettingsTab = "profile";

export function isSettingsTab(value: string | null | undefined): value is SettingsTab {
  return typeof value === "string" && (SETTINGS_TABS as readonly string[]).includes(value);
}

export function resolveSettingsTab(value: string | null | undefined): SettingsTab {
  return isSettingsTab(value) ? value : DEFAULT_SETTINGS_TAB;
}
