import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type ColorTheme = "default" | "ocean" | "forest" | "sunset" | "rose";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("default");

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const storedColorTheme = localStorage.getItem("colorTheme") as ColorTheme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
    if (storedColorTheme) {
      setColorTheme(storedColorTheme);
    }
  }, []);

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

  useEffect(() => {
    const root = document.documentElement;
    // Remove all color theme classes
    root.classList.remove("theme-ocean", "theme-forest", "theme-sunset", "theme-rose");
    
    // Add color theme class if not default
    if (colorTheme !== "default") {
      root.classList.add(`theme-${colorTheme}`);
    }

    localStorage.setItem("colorTheme", colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colorTheme, setColorTheme }}>
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
