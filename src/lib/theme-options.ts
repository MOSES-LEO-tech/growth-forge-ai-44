import { Moon, Monitor, Sun } from "lucide-react";

/**
 * Canonical built-in color themes.
 *
 * The `value` keys map to the CSS theme classes in src/index.css
 * (`theme-ocean`, `theme-forest`, ...) and the swatch hex colors are derived
 * from the exact HSL variables defined there, so the pickers always show the
 * theme the user will actually see. Kept as the single source of truth shared
 * by every appearance dropdown in the app.
 */
export const COLOR_THEMES = [
  { name: "Default", value: "default", colors: ["#215043", "#e4ded3"] },
  { name: "Ocean", value: "ocean", colors: ["#1a5875", "#d3e1e3"] },
  { name: "Forest", value: "forest", colors: ["#265e3b", "#d8decf"] },
  { name: "Sunset", value: "sunset", colors: ["#a94e2d", "#e2dbd0"] },
  { name: "Rose", value: "rose", colors: ["#742f42", "#e2d5da"] },
] as const;

/** Light / dark / system appearance modes shared by all theme pickers. */
export const MODE_OPTIONS = [
  { name: "Light", value: "light", icon: Sun },
  { name: "Dark", value: "dark", icon: Moon },
  { name: "System", value: "system", icon: Monitor },
] as const;
