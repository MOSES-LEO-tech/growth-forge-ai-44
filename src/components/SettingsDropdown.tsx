import { Check, Settings } from "lucide-react";
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
import { COLOR_THEMES, MODE_OPTIONS } from "@/lib/theme-options";
import CustomThemeCreator from "./CustomThemeCreator";

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
        {MODE_OPTIONS.map((mode) => (
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
        {COLOR_THEMES.map((themeOption) => (
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
