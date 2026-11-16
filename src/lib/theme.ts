/**
 * Theme maths and application rules.
 *
 * Pure functions only — no DOM, no React — so the behaviour can be unit tested.
 * The provider turns these decisions into class names and inline CSS variables.
 *
 * Why this module exists: color themes used to be light-mode-only CSS blocks
 * (`.theme-ocean:not(.dark)`), so the class was applied in dark mode but no
 * selector matched and every theme silently fell back to Default.
 */

export type ThemeMode = "light" | "dark" | "system";

export interface CustomThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  /** Legacy fields: kept for stored themes, deliberately not applied. */
  background?: string;
  foreground?: string;
}

export interface CustomTheme {
  name: string;
  value: string;
  colors: CustomThemeColors;
}

export const BUILT_IN_THEME_VALUES = ["default", "ocean", "forest", "sunset", "rose"] as const;
export type BuiltInThemeValue = (typeof BUILT_IN_THEME_VALUES)[number];

export const MODE_CLASSES = ["light", "dark"] as const;

/** CSS custom properties a custom (user-created) theme is allowed to set. */
export const CUSTOM_THEME_VARS = [
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
] as const;

const HEX_PATTERN = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

/** Hex → `"H S% L%"`, the format `hsl(var(--token))` expects. */
export function hexToHslTriplet(hex: string, fallback = "0 0% 50%"): string {
  const match = HEX_PATTERN.exec(hex?.trim?.() ?? "");
  if (!match) return fallback;

  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / delta + 2) / 6;
        break;
      default:
        hue = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

/** Parse `"H S% L%"` back to numbers, or null when malformed. */
export function parseHslTriplet(triplet: string): [number, number, number] | null {
  const parts = triplet.trim().match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!parts) return null;
  return [Number(parts[1]), Number(parts[2]), Number(parts[3])];
}

function channelLuminance(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an `"H S% L%"` triplet. */
export function relativeLuminance(triplet: string): number {
  const parsed = parseHslTriplet(triplet);
  if (!parsed) return 0;
  const [h, s, l] = parsed;

  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = s / 100;
  const light = l / 100;

  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const r = hueToRgb(p, q, hue + 1 / 3);
  const g = hueToRgb(p, q, hue);
  const b = hueToRgb(p, q, hue - 1 / 3);

  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG contrast ratio between two `"H S% L%"` triplets. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export const INK_LIGHT = "0 0% 100%";
export const INK_DARK = "220 20% 10%";

/**
 * Pick white or near-black ink for a solid colour, whichever reads better.
 * Custom themes previously hard-coded white text, so a pale user colour became
 * unreadable the moment they saved it.
 */
export function readableForeground(colour: string): string {
  // Accept either "#1a5875" or "199 64% 28%": custom theme colours arrive as hex
  // from the picker, everything downstream works in triplets.
  const triplet = HEX_PATTERN.test(colour?.trim?.() ?? "") ? hexToHslTriplet(colour) : colour;
  const onLight = contrastRatio(triplet, INK_LIGHT);
  const onDark = contrastRatio(triplet, INK_DARK);
  return onDark >= onLight ? INK_DARK : INK_LIGHT;
}

/** `"custom-abc"` style values are stored in localStorage, not CSS classes. */
export function isCustomThemeValue(value: string): boolean {
  return value.startsWith("custom-");
}

/** The CSS class for a built-in theme, or null for Default / custom themes. */
export function themeClassFor(value: string): string | null {
  if (isCustomThemeValue(value)) return null;
  if (!BUILT_IN_THEME_VALUES.includes(value as BuiltInThemeValue)) return null;
  if (value === "default") return null;
  return `theme-${value}`;
}

/**
 * Inline variables for a custom theme.
 *
 * Only brand tokens are set: surface and ink stay owned by light/dark mode, so
 * a user theme cannot break dark mode (the old code wrote `--background` and
 * `--foreground` from a light-only palette).
 */
export function customThemeVars(colors: CustomThemeColors): Record<string, string> {
  const primary = hexToHslTriplet(colors.primary);
  const secondary = hexToHslTriplet(colors.secondary);
  const accent = hexToHslTriplet(colors.accent);

  return {
    "--primary": primary,
    "--primary-foreground": readableForeground(primary),
    "--secondary": secondary,
    "--secondary-foreground": readableForeground(secondary),
    "--accent": accent,
    "--accent-foreground": readableForeground(accent),
  };
}

/** Accept only stored values we can actually render. */
export function sanitizeColorTheme(
  value: string | null | undefined,
  customThemes: CustomTheme[]
): string {
  if (!value) return "default";
  if (isCustomThemeValue(value)) {
    return customThemes.some((theme) => theme.value === value) ? value : "default";
  }
  return BUILT_IN_THEME_VALUES.includes(value as BuiltInThemeValue) ? value : "default";
}

export function sanitizeMode(value: string | null | undefined): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

/** Resolve "system" against the live media query. */
export function resolveMode(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}
