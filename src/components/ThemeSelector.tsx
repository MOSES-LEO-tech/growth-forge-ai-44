import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeProvider";

const colorThemes = [
  { name: "Default", value: "default", colors: ["#4338ca", "#c084fc"] },
  { name: "Ocean", value: "ocean", colors: ["#0ea5e9", "#06b6d4"] },
  { name: "Forest", value: "forest", colors: ["#16a34a", "#22c55e"] },
  { name: "Sunset", value: "sunset", colors: ["#f97316", "#ec4899"] },
  { name: "Rose", value: "rose", colors: ["#e11d48", "#db2777"] },
] as const;

export default function ThemeSelector() {
  const { colorTheme, setColorTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Select color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {colorThemes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setColorTheme(theme.value)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="flex gap-1">
              {theme.colors.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span>{theme.name}</span>
            {colorTheme === theme.value && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
