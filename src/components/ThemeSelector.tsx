import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export default function ThemeSelector() {
  const { colorTheme, setColorTheme, customThemes, isTransitioning } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Palette className={`h-5 w-5 transition-transform duration-500 ${isTransitioning ? 'rotate-180' : ''}`} />
          <span className="sr-only">Select color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {colorThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setColorTheme(theme.value)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex gap-1 transition-transform group-hover:scale-110">
              {theme.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>{theme.name}</span>
            {colorTheme === theme.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {/* Custom themes */}
        {customThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setColorTheme(theme.value)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex gap-1 transition-transform group-hover:scale-110">
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <div
                className="w-4 h-4 rounded-full shadow-sm"
                style={{ backgroundColor: theme.colors.secondary }}
              />
            </div>
            <span>{theme.name}</span>
            {colorTheme === theme.value && (
              <Check className="ml-auto h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="p-2">
          <CustomThemeCreator />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
