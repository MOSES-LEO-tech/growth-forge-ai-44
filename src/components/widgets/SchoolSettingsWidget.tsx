import { ChangeEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Building, ExternalLink, Loader2, Save, Settings, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { School } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SchoolSettingsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

type SchoolIdentityForm = Pick<
  School,
  "name" | "location" | "country" | "description" | "logo_url" | "founded_year"
>;

const SCHOOL_ASSETS_BUCKET = "school-assets";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const emptyForm: SchoolIdentityForm = {
  name: "",
  location: "",
  country: "",
  description: "",
  logo_url: "",
  founded_year: null,
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const cleanText = (value: string | null | undefined) => {
  const trimmed = value?.trim() || "";
  return trimmed.length > 0 ? trimmed : null;
};

export function SchoolSettingsWidget({
  className = "",
  defaultExpanded = false,
  schoolId,
}: SchoolSettingsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [form, setForm] = useState<SchoolIdentityForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from("schools")
          .select("name,location,country,description,logo_url,founded_year")
          .eq("id", schoolId)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (!data) throw new Error("School settings could not be loaded.");

        setForm({
          name: data.name || "",
          location: data.location || "",
          country: data.country || "",
          description: data.description || "",
          logo_url: data.logo_url || "",
          founded_year: data.founded_year ?? null,
        });
      } catch (err) {
        console.error("Failed to fetch school settings:", err);
        setError(getErrorMessage(err, "Unable to load school settings."));
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();
  }, [schoolId]);

  const persistForm = async (nextForm: SchoolIdentityForm) => {
    if (!schoolId) return;
    if (!nextForm.name.trim()) {
      toast({ title: "School name required", description: "Add a school name before saving.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: nextForm.name.trim(),
        location: cleanText(nextForm.location),
        country: cleanText(nextForm.country),
        description: cleanText(nextForm.description),
        logo_url: cleanText(nextForm.logo_url),
        founded_year: nextForm.founded_year,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("schools")
        .update(updates)
        .eq("id", schoolId)
        .select("name,location,country,description,logo_url,founded_year")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!data) throw new Error("Only this school's approved admin can update the page.");

      setForm({
        name: data.name || "",
        location: data.location || "",
        country: data.country || "",
        description: data.description || "",
        logo_url: data.logo_url || "",
        founded_year: data.founded_year ?? null,
      });
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast({ title: "School details saved" });
    } catch (err) {
      console.error("Failed to save school settings:", err);
      toast({
        title: "Save failed",
        description: getErrorMessage(err, "Unable to update this school page."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!schoolId) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Choose an image", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: "Logo too large", description: "Logos must be 10 MB or smaller.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const safeName = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "logo";
      const randomId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${schoolId}/logo/${randomId}-${safeName}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(path);
      await persistForm({ ...form, logo_url: data.publicUrl });
    } catch (err) {
      console.error("School logo upload failed:", err);
      toast({
        title: "Upload failed",
        description: getErrorMessage(err, "Unable to upload this logo."),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadLogo(file);
    event.target.value = "";
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded((value) => !value)}>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Details
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" onClick={(event) => event.stopPropagation()}>
              <Link to={`/schools/${schoolId}`}>
                <ExternalLink className="h-4 w-4" />
                View
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                void persistForm(form);
              }}
              disabled={loading || saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-28" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school-country">Country</Label>
                  <Input
                    id="school-country"
                    value={form.country || ""}
                    onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school-location">Location</Label>
                  <Input
                    id="school-location"
                    value={form.location || ""}
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school-founded">Founded Year</Label>
                  <Input
                    id="school-founded"
                    type="number"
                    value={form.founded_year?.toString() || ""}
                    placeholder="2004"
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((current) => ({
                        ...current,
                        founded_year: value === "" ? null : Number(value),
                      }));
                    }}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="school-description">Description</Label>
                  <Textarea
                    id="school-description"
                    rows={4}
                    value={form.description || ""}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt={`${form.name} logo`} className="h-full w-full object-contain p-2" />
                    ) : (
                      <Building className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      value={form.logo_url || ""}
                      placeholder="https://..."
                      onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
                    />
                    <Label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-semibold hover:bg-secondary">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Logo
                      <Input type="file" accept="image/*" className="sr-only" onChange={handleLogoFile} disabled={uploading} />
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
