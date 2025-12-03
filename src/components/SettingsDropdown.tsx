import { Settings, Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeProvider";
import CustomThemeCreator from "./CustomThemeCreator";

const colorThemes = [
  { name: "Default", value: "default", colors: ["#4338ca", "#c084fc"] },
  { name: "Ocean", value: "ocean", colors: ["#0ea5e9", "#06b6d4"] },
  { name: "Forest", value: "forest", colors: ["#16a34a", "#22c55e"] },
  { name: "Sunset", value: "sunset", colors: ["#f97316", "#ec4899"] },
  { name: "Rose", value: "rose", colors: ["#e11d48", "#db2777"] },
] as const;

const modeOptions = [
  { name: "Light", value: "light", icon: Sun },
  { name: "Dark", value: "dark", icon: Moon },
  { name: "System", value: "system", icon: Monitor },
] as const;

export default function SettingsDropdown() {
  const { theme, setTheme, colorTheme, setColorTheme, customThemes, isTransitioning } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Settings className={`h-5 w-5 transition-transform duration-500 ${isTransitioning ? 'rotate-180' : ''}`} />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Mode Selection */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Mode</DropdownMenuLabel>
        {modeOptions.map((mode) => (
          <DropdownMenuItem
            key={mode.value}
            onClick={() => setTheme(mode.value)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <mode.icon className="h-4 w-4" />
            <span>{mode.name}</span>
            {theme === mode.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Color Theme Selection */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Color Theme</DropdownMenuLabel>
        {colorThemes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setColorTheme(themeOption.value)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex gap-1 transition-transform group-hover:scale-110">
              {themeOption.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>{themeOption.name}</span>
            {colorTheme === themeOption.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}

        {/* Custom themes */}
        {customThemes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setColorTheme(themeOption.value)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex gap-1 transition-transform group-hover:scale-110">
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: themeOption.colors.primary }}
              />
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: themeOption.colors.secondary }}
              />
            </div>
            <span>{themeOption.name}</span>
            {colorTheme === themeOption.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {/* Custom Theme Creator */}
        <div className="p-2">
          <CustomThemeCreator />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
