import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type ColorTheme = "default" | "ocean" | "forest" | "sunset" | "rose" | string;

export interface CustomThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

export interface CustomTheme {
  name: string;
  value: string;
  colors: CustomThemeColors;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
  customThemes: CustomTheme[];
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (value: string) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert hex to HSL
function hexToHSL(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 50%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load stored preferences
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const storedColorTheme = localStorage.getItem("colorTheme") as ColorTheme | null;
    const storedCustomThemes = localStorage.getItem("customThemes");
    
    if (storedTheme) setTheme(storedTheme);
    if (storedColorTheme) setColorThemeState(storedColorTheme);
    if (storedCustomThemes) {
      try {
        setCustomThemes(JSON.parse(storedCustomThemes));
      } catch (e) {
        console.error("Failed to parse custom themes:", e);
      }
    }
  }, []);

  // Apply light/dark mode
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Apply color theme with transition
  const applyCustomTheme = useCallback((customTheme: CustomTheme) => {
    const root = document.documentElement;
    const { colors } = customTheme;
    
    root.style.setProperty("--primary", hexToHSL(colors.primary));
    root.style.setProperty("--secondary", hexToHSL(colors.secondary));
    root.style.setProperty("--accent", hexToHSL(colors.accent));
    root.style.setProperty("--background", hexToHSL(colors.background));
    root.style.setProperty("--foreground", hexToHSL(colors.foreground));
    
    // Generate gradient
    root.style.setProperty(
      "--gradient-hero",
      `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
    );
  }, []);

  const clearCustomStyles = useCallback(() => {
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--secondary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--background");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--gradient-hero");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Remove all color theme classes
    root.classList.remove("theme-ocean", "theme-forest", "theme-sunset", "theme-rose");
    customThemes.forEach(ct => {
      root.classList.remove(ct.value);
    });

    // Clear any inline custom styles first
    clearCustomStyles();
    
    // Add color theme class if not default
    if (colorTheme !== "default") {
      if (colorTheme.startsWith("custom-")) {
        const custom = customThemes.find(ct => ct.value === colorTheme);
        if (custom) {
          applyCustomTheme(custom);
        }
      } else {
        root.classList.add(`theme-${colorTheme}`);
      }
    }

    localStorage.setItem("colorTheme", colorTheme);
  }, [colorTheme, customThemes, applyCustomTheme, clearCustomStyles]);

  const setColorTheme = useCallback((newTheme: ColorTheme) => {
    setIsTransitioning(true);
    setColorThemeState(newTheme);
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 500);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const addCustomTheme = useCallback((theme: CustomTheme) => {
    setCustomThemes(prev => {
      const updated = [...prev, theme];
      localStorage.setItem("customThemes", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeCustomTheme = useCallback((value: string) => {
    setCustomThemes(prev => {
      const updated = prev.filter(t => t.value !== value);
      localStorage.setItem("customThemes", JSON.stringify(updated));
      return updated;
    });
    // If currently using this theme, switch to default
    if (colorTheme === value) {
      setColorTheme("default");
    }
  }, [colorTheme, setColorTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      toggleTheme, 
      colorTheme, 
      setColorTheme,
      customThemes,
      addCustomTheme,
      removeCustomTheme,
      isTransitioning
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
