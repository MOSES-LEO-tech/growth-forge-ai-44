import { describe, expect, it } from "vitest";
import {
  BUILT_IN_THEME_VALUES,
  contrastRatio,
  customThemeVars,
  hexToHslTriplet,
  INK_DARK,
  INK_LIGHT,
  isCustomThemeValue,
  parseHslTriplet,
  readableForeground,
  relativeLuminance,
  resolveMode,
  sanitizeColorTheme,
  sanitizeMode,
  themeClassFor,
  type CustomTheme,
} from "@/lib/theme";

const OCEAN: CustomTheme = {
  name: "Ocean custom",
  value: "custom-ocean",
  colors: { primary: "#1a5875", secondary: "#d3e1e3", accent: "#c2703f" },
};

describe("hexToHslTriplet", () => {
  it("converts a hex colour into the hsl(var(--x)) triplet format", () => {
    expect(hexToHslTriplet("#1a5875")).toBe("199 64% 28%");
  });

  it("accepts hex without the leading hash", () => {
    expect(hexToHslTriplet("1a5875")).toBe(hexToHslTriplet("#1a5875"));
  });

  it("returns the fallback for malformed input instead of NaN", () => {
    expect(hexToHslTriplet("not-a-colour")).toBe("0 0% 50%");
    expect(hexToHslTriplet("")).toBe("0 0% 50%");
  });

  it("produces triplets that parse back to numbers", () => {
    expect(parseHslTriplet(hexToHslTriplet("#742f42"))).not.toBeNull();
  });
});

describe("contrast maths", () => {
  it("scores white against black at the WCAG maximum", () => {
    expect(contrastRatio("0 0% 100%", "0 0% 0%")).toBeCloseTo(21, 0);
  });

  it("treats identical colours as a 1:1 ratio", () => {
    expect(contrastRatio("164 42% 22%", "164 42% 22%")).toBeCloseTo(1, 5);
  });

  it("ranks white as the brighter luminance", () => {
    expect(relativeLuminance("0 0% 100%")).toBeGreaterThan(relativeLuminance("164 42% 22%"));
  });
});

describe("readableForeground", () => {
  it("uses dark ink on pale colours", () => {
    expect(readableForeground("#fde68a")).toBe(INK_DARK);
  });

  it("uses white ink on deep colours", () => {
    expect(readableForeground("#1a5875")).toBe(INK_LIGHT);
  });

  it("always reaches AA for normal text on the chosen pair", () => {
    for (const hex of ["#1a5875", "#fde68a", "#742f42", "#22c55e", "#7c3aed"]) {
      const colour = hexToHslTriplet(hex);
      expect(contrastRatio(colour, readableForeground(colour))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("themeClassFor", () => {
  it("maps built-in themes to their CSS class", () => {
    expect(themeClassFor("ocean")).toBe("theme-ocean");
    expect(themeClassFor("forest")).toBe("theme-forest");
    expect(themeClassFor("sunset")).toBe("theme-sunset");
    expect(themeClassFor("rose")).toBe("theme-rose");
  });

  it("returns null for the default theme", () => {
    expect(themeClassFor("default")).toBeNull();
  });

  it("returns null for custom themes, which use inline variables", () => {
    expect(themeClassFor("custom-ocean")).toBeNull();
  });

  it("returns null for unknown values rather than inventing a class", () => {
    expect(themeClassFor("neon")).toBeNull();
  });

  it("knows every built-in value", () => {
    expect([...BUILT_IN_THEME_VALUES]).toEqual(["default", "ocean", "forest", "sunset", "rose"]);
  });
});

describe("custom themes", () => {
  it("isCustomThemeValue only matches the custom- prefix", () => {
    expect(isCustomThemeValue("custom-a")).toBe(true);
    expect(isCustomThemeValue("ocean")).toBe(false);
  });

  it("never overrides surface or ink, so dark mode keeps working", () => {
    const vars = customThemeVars(OCEAN.colors);
    expect(vars).not.toHaveProperty("--background");
    expect(vars).not.toHaveProperty("--foreground");
    expect(vars).not.toHaveProperty("--card");
  });

  it("sets brand tokens with a foreground that passes AA", () => {
    const vars = customThemeVars(OCEAN.colors);
    expect(vars["--primary"]).toBe("199 64% 28%");
    expect(contrastRatio(vars["--primary"], vars["--primary-foreground"])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(vars["--accent"], vars["--accent-foreground"])).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a pale user colour readable instead of forcing white text", () => {
    const vars = customThemeVars({ ...OCEAN.colors, primary: "#fde68a" });
    expect(vars["--primary-foreground"]).toBe(INK_DARK);
  });
});

describe("sanitizeColorTheme", () => {
  it("falls back to default for unknown built-in values", () => {
    expect(sanitizeColorTheme("neon", [])).toBe("default");
  });

  it("keeps a custom theme that still exists", () => {
    expect(sanitizeColorTheme("custom-ocean", [OCEAN])).toBe("custom-ocean");
  });

  it("drops a custom theme that was deleted", () => {
    expect(sanitizeColorTheme("custom-deleted", [OCEAN])).toBe("default");
  });

  it("defaults null and undefined", () => {
    expect(sanitizeColorTheme(null, [])).toBe("default");
    expect(sanitizeColorTheme(undefined, [])).toBe("default");
  });
});

describe("mode handling", () => {
  it("sanitizes unknown modes to system", () => {
    expect(sanitizeMode("sepia")).toBe("system");
    expect(sanitizeMode(null)).toBe("system");
    expect(sanitizeMode("dark")).toBe("dark");
  });

  it("resolves system against the media query", () => {
    expect(resolveMode("system", true)).toBe("dark");
    expect(resolveMode("system", false)).toBe("light");
  });

  it("never lets system override an explicit choice", () => {
    expect(resolveMode("light", true)).toBe("light");
    expect(resolveMode("dark", false)).toBe("dark");
  });
});
