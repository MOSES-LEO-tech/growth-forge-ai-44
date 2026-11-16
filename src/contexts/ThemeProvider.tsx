import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CUSTOM_THEME_VARS,
  customThemeVars,
  MODE_CLASSES,
  resolveMode,
  sanitizeColorTheme,
  sanitizeMode,
  themeClassFor,
  type CustomTheme,
  type CustomThemeColors,
  type ThemeMode,
} from "@/lib/theme";

export type { CustomTheme, CustomThemeColors };

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  colorTheme: string;
  setColorTheme: (colorTheme: string) => void;
  customThemes: CustomTheme[];
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (value: string) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  mode: "theme",
  color: "colorTheme",
  custom: "customThemes",
} as const;

/** Prefixes we are allowed to strip back off <html>. */
const THEME_CLASS_PREFIXES = ["theme-"];

function readStoredCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.custom);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CustomTheme =>
        Boolean(entry) &&
        typeof entry.name === "string" &&
        typeof entry.value === "string" &&
        Boolean(entry.colors) &&
        typeof entry.colors.primary === "string" &&
        typeof entry.colors.secondary === "string" &&
        typeof entry.colors.accent === "string"
    );
  } catch {
    return [];
  }
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Theme provider.
 *
 * State is read from localStorage during the first render (not in an effect) so
 * the correct theme is applied before first paint — the old version rendered the
 * default theme first and corrected itself afterwards.
 *
 * Mode and colour theme are independent: the mode picks `light`/`dark`, the
 * colour theme picks a `theme-*` class (built-in) or inline brand variables
 * (custom). Every built-in theme defines both modes in CSS.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(readStoredCustomThemes);
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    sanitizeMode(localStorage.getItem(STORAGE_KEYS.mode))
  );
  const [colorTheme, setColorThemeState] = useState<string>(() =>
    sanitizeColorTheme(localStorage.getItem(STORAGE_KEYS.color), customThemes)
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(prefersDark);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const resolvedMode = resolveMode(theme, systemPrefersDark);

  /* Keep "system" live: without this listener the app ignored an OS switch
     until the next reload. */
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  /* Mode class. */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...MODE_CLASSES);
    root.classList.add(resolvedMode);
    root.style.colorScheme = resolvedMode;
    localStorage.setItem(STORAGE_KEYS.mode, theme);
  }, [resolvedMode, theme]);

  /* Colour theme class + custom variables. */
  useEffect(() => {
    const root = document.documentElement;

    for (const className of Array.from(root.classList)) {
      if (THEME_CLASS_PREFIXES.some((prefix) => className.startsWith(prefix))) {
        root.classList.remove(className);
      }
    }
    CUSTOM_THEME_VARS.forEach((variable) => root.style.removeProperty(variable));

    const themeClass = themeClassFor(colorTheme);
    if (themeClass) {
      root.classList.add(themeClass);
    } else if (colorTheme.startsWith("custom-")) {
      const custom = customThemes.find((entry) => entry.value === colorTheme);
      if (custom) {
        const vars = customThemeVars(custom.colors);
        Object.entries(vars).forEach(([variable, value]) => root.style.setProperty(variable, value));
      }
    }

    localStorage.setItem(STORAGE_KEYS.color, colorTheme);
  }, [colorTheme, customThemes]);

  const setTheme = useCallback((next: ThemeMode) => setThemeState(sanitizeMode(next)), []);

  const setColorTheme = useCallback((next: string) => {
    setIsTransitioning(true);
    setColorThemeState(next);
    // Reset the indicator once the CSS transition has had time to run.
    window.setTimeout(() => setIsTransitioning(false), 500);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (resolveMode(current, prefersDark()) === "dark" ? "light" : "dark"));
  }, []);

  const addCustomTheme = useCallback((next: CustomTheme) => {
    setCustomThemes((current) => {
      const updated = [...current.filter((entry) => entry.value !== next.value), next];
      localStorage.setItem(STORAGE_KEYS.custom, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeCustomTheme = useCallback(
    (value: string) => {
      setCustomThemes((current) => {
        const updated = current.filter((entry) => entry.value !== value);
        localStorage.setItem(STORAGE_KEYS.custom, JSON.stringify(updated));
        return updated;
      });
      if (colorTheme === value) setColorTheme("default");
    },
    [colorTheme, setColorTheme]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      colorTheme,
      setColorTheme,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
      isTransitioning,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      colorTheme,
      setColorTheme,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
      isTransitioning,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
