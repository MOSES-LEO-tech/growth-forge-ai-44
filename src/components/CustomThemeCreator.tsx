import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeProvider";

interface CustomTheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

export default function CustomThemeCreator() {
  const { addCustomTheme, customThemes, removeCustomTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [newTheme, setNewTheme] = useState<CustomTheme>({
    name: "",
    primary: "#4338ca",
    secondary: "#c084fc",
    accent: "#fbbf24",
    background: "#ffffff",
    foreground: "#1e293b",
  });

  const handleSave = () => {
    if (newTheme.name.trim()) {
      addCustomTheme({
        name: newTheme.name,
        value: `custom-${newTheme.name.toLowerCase().replace(/\s+/g, "-")}`,
        colors: {
          primary: newTheme.primary,
          secondary: newTheme.secondary,
          accent: newTheme.accent,
          background: newTheme.background,
          foreground: newTheme.foreground,
        },
      });
      setNewTheme({
        name: "",
        primary: "#4338ca",
        secondary: "#c084fc",
        accent: "#fbbf24",
        background: "#ffffff",
        foreground: "#1e293b",
      });
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Create Custom Theme
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Custom Theme</DialogTitle>
            <DialogDescription>
              Choose your colors to create a personalized theme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input
                id="theme-name"
                placeholder="My Custom Theme"
                value={newTheme.name}
                onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primary"
                    value={newTheme.primary}
                    onChange={(e) => setNewTheme({ ...newTheme, primary: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={newTheme.primary}
                    onChange={(e) => setNewTheme({ ...newTheme, primary: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondary">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondary"
                    value={newTheme.secondary}
                    onChange={(e) => setNewTheme({ ...newTheme, secondary: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={newTheme.secondary}
                    onChange={(e) => setNewTheme({ ...newTheme, secondary: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accent">Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="accent"
                    value={newTheme.accent}
                    onChange={(e) => setNewTheme({ ...newTheme, accent: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={newTheme.accent}
                    onChange={(e) => setNewTheme({ ...newTheme, accent: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="background"
                    value={newTheme.background}
                    onChange={(e) => setNewTheme({ ...newTheme, background: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={newTheme.background}
                    onChange={(e) => setNewTheme({ ...newTheme, background: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: newTheme.background }}>
              <p className="text-sm font-medium mb-2" style={{ color: newTheme.foreground }}>Preview</p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: newTheme.primary }} title="Primary" />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: newTheme.secondary }} title="Secondary" />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: newTheme.accent }} title="Accent" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newTheme.name.trim()}>
              Save Theme
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* List custom themes */}
      {customThemes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-2">Your Themes</p>
          {customThemes.map((theme) => (
            <div
              key={theme.value}
              className="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: theme.colors.secondary }}
                  />
                </div>
                <span className="text-sm">{theme.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeCustomTheme(theme.value)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
