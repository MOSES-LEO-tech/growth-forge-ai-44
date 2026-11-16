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
import { readableForeground } from "@/lib/theme";

interface Draft {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  primary: "#4338ca",
  secondary: "#c084fc",
  accent: "#fbbf24",
};

const COLOR_FIELDS = [
  { key: "primary", label: "Primary", hint: "Buttons and active states" },
  { key: "secondary", label: "Secondary", hint: "Quiet surfaces and chips" },
  { key: "accent", label: "Accent", hint: "Single emphasis per screen" },
] as const;

/**
 * Custom theme creator.
 *
 * Deliberately three colours: surface and ink follow light/dark mode, so a user
 * theme can never make dark mode unreadable (the old version also stored a
 * background and foreground, which overrode both modes).
 */
export default function CustomThemeCreator() {
  const { addCustomTheme, customThemes, removeCustomTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const value = draft.name.trim()
    ? `custom-${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
    : "";

  const handleSave = () => {
    if (!value) return;
    addCustomTheme({
      name: draft.name.trim(),
      value,
      colors: {
        primary: draft.primary,
        secondary: draft.secondary,
        accent: draft.accent,
      },
    });
    // Apply straight away: saving a theme should not look like nothing happened.
    setColorTheme(value);
    setDraft(EMPTY_DRAFT);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create custom theme
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create custom theme</DialogTitle>
            <DialogDescription>
              Pick the brand colours. Light and dark mode are handled for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Name</Label>
              <Input
                id="theme-name"
                placeholder="School colours"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>

            <div className="space-y-3">
              {COLOR_FIELDS.map(({ key, label, hint }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    id={`theme-${key}`}
                    aria-label={`${label} colour`}
                    value={draft[key]}
                    onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`theme-${key}`} className="text-sm">
                      {label}
                      <span className="ml-2 font-mono text-[11px] uppercase text-muted-foreground">
                        {draft[key]}
                      </span>
                    </Label>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview uses real chips so the computed foreground ink is visible. */}
            <div className="rounded-lg border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: draft.primary, color: readableForeground(draft.primary) }}
                >
                  Primary
                </span>
                <span
                  className="rounded-md border px-3 py-1.5 text-sm"
                  style={{ backgroundColor: draft.secondary, color: readableForeground(draft.secondary) }}
                >
                  Secondary
                </span>
                <span
                  className="rounded-md px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: draft.accent, color: readableForeground(draft.accent) }}
                >
                  Accent
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!value}>
              Save and apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {customThemes.length > 0 && (
        <div className="space-y-1">
          <p className="px-2 text-xs text-muted-foreground">Your themes</p>
          {customThemes.map((theme) => (
            <div
              key={theme.value}
              className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex shrink-0 gap-0.5" aria-hidden="true">
                  {[theme.colors.primary, theme.colors.secondary, theme.colors.accent].map((colour) => (
                    <span
                      key={colour}
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colour }}
                    />
                  ))}
                </div>
                <span className="truncate text-sm">{theme.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeCustomTheme(theme.value)}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">Delete {theme.name}</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
