import { ChangeEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { School } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SchoolSettingsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

type SchoolPageForm = Pick<
  School,
  "name" | "location" | "country" | "description" | "logo_url" | "cover_url" | "gallery_urls"
>;

type UploadTarget = "logo" | "cover" | "gallery";

const SCHOOL_ASSETS_BUCKET = "school-assets";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const emptyForm: SchoolPageForm = {
  name: "",
  location: "",
  country: "",
  description: "",
  logo_url: "",
  cover_url: "",
  gallery_urls: [],
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

const cleanText = (value: string | null | undefined) => {
  const trimmed = value?.trim() || "";
  return trimmed.length > 0 ? trimmed : null;
};

const cleanGalleryUrls = (urls: string[] | null | undefined) => {
  const seen = new Set<string>();
  return (urls || [])
    .map((url) => url.trim())
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const buildAssetPath = (schoolId: string, target: UploadTarget, file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || target;
  const randomId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${schoolId}/${target}/${randomId}-${safeName}.${extension}`;
};

export function SchoolSettingsWidget({ className = "", defaultExpanded = false, schoolId }: SchoolSettingsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [form, setForm] = useState<SchoolPageForm>(emptyForm);
  const [galleryUrlDraft, setGalleryUrlDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<UploadTarget | null>(null);
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
          .select("name,location,country,description,logo_url,cover_url,gallery_urls")
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
          cover_url: data.cover_url || "",
          gallery_urls: cleanGalleryUrls(data.gallery_urls),
        });
      } catch (err) {
        console.error("Failed to fetch school settings:", err);
        setError(getErrorMessage(err, "Unable to load school settings."));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [schoolId]);

  const persistForm = async (nextForm: SchoolPageForm, successTitle = "School page updated") => {
    if (!schoolId) return;
    const schoolName = nextForm.name.trim();

    if (!schoolName) {
      toast({
        title: "School name required",
        description: "Add a school name before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: schoolName,
        location: cleanText(nextForm.location),
        country: cleanText(nextForm.country),
        description: cleanText(nextForm.description),
        logo_url: cleanText(nextForm.logo_url),
        cover_url: cleanText(nextForm.cover_url),
        gallery_urls: cleanGalleryUrls(nextForm.gallery_urls),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("schools")
        .update(updates)
        .eq("id", schoolId)
        .select("name,location,country,description,logo_url,cover_url,gallery_urls")
        .maybeSingle();

      if (updateError) throw updateError;
      if (!data) throw new Error("Only this school's approved admin can update the page.");

      const savedForm = {
        name: data.name || "",
        location: data.location || "",
        country: data.country || "",
        description: data.description || "",
        logo_url: data.logo_url || "",
        cover_url: data.cover_url || "",
        gallery_urls: cleanGalleryUrls(data.gallery_urls),
      };

      setForm(savedForm);
      queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      toast({ title: successTitle });
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

  const uploadSchoolImage = async (file: File, target: UploadTarget) => {
    if (!schoolId) throw new Error("No school is assigned to your account.");
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 10 MB or smaller.");

    const path = buildAssetPath(schoolId, target, file);
    const { error: uploadError } = await supabase.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, target: UploadTarget) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingTarget(target);
    try {
      const publicUrl = await uploadSchoolImage(file, target);
      const nextForm: SchoolPageForm =
        target === "logo"
          ? { ...form, logo_url: publicUrl }
          : target === "cover"
            ? { ...form, cover_url: publicUrl }
            : { ...form, gallery_urls: cleanGalleryUrls([...(form.gallery_urls || []), publicUrl]) };

      await persistForm(nextForm, target === "gallery" ? "Gallery image added" : "Image updated");
    } catch (err) {
      console.error("School image upload failed:", err);
      toast({
        title: "Upload failed",
        description: getErrorMessage(err, "Unable to upload this image."),
        variant: "destructive",
      });
    } finally {
      setUploadingTarget(null);
      event.target.value = "";
    }
  };

  const handleAddGalleryUrl = async () => {
    const url = galleryUrlDraft.trim();
    if (!url) return;

    const nextForm = {
      ...form,
      gallery_urls: cleanGalleryUrls([...(form.gallery_urls || []), url]),
    };

    setGalleryUrlDraft("");
    await persistForm(nextForm, "Gallery image added");
  };

  const handleRemoveGalleryUrl = async (urlToRemove: string) => {
    const nextForm = {
      ...form,
      gallery_urls: (form.gallery_urls || []).filter((url) => url !== urlToRemove),
    };

    await persistForm(nextForm, "Gallery image removed");
  };

  const updateGalleryUrl = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      gallery_urls: (current.gallery_urls || []).map((url, urlIndex) => (urlIndex === index ? value : url)),
    }));
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Page Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Page Settings
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
                persistForm(form);
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
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-1">
                  <Building className="h-4 w-4" /> Details
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center gap-1">
                  <ImageIcon className="h-4 w-4" /> Media
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="school-page-name">School Name</Label>
                    <Input
                      id="school-page-name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="school-page-country">Country</Label>
                    <Input
                      id="school-page-country"
                      value={form.country || ""}
                      onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="school-page-location">Location</Label>
                    <Input
                      id="school-page-location"
                      value={form.location || ""}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="school-page-description">Description</Label>
                    <Textarea
                      id="school-page-description"
                      rows={5}
                      value={form.description || ""}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="mt-4 space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Label>Header Image</Label>
                    <div className="aspect-[16/7] overflow-hidden rounded-lg border bg-muted">
                      {form.cover_url ? (
                        <img src={form.cover_url} alt={`${form.name} header`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Input
                        value={form.cover_url || ""}
                        onChange={(event) => setForm((current) => ({ ...current, cover_url: event.target.value }))}
                        placeholder="https://..."
                      />
                      <Label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-semibold hover:bg-secondary">
                        {uploadingTarget === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload Header
                        <Input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleUpload(event, "cover")}
                          disabled={saving || uploadingTarget !== null}
                        />
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>School Logo</Label>
                    <div className="flex aspect-[16/7] items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {form.logo_url ? (
                        <img src={form.logo_url} alt={`${form.name} logo`} className="h-full w-full object-contain p-6" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Building className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Input
                        value={form.logo_url || ""}
                        onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
                        placeholder="https://..."
                      />
                      <Label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-semibold hover:bg-secondary">
                        {uploadingTarget === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload Logo
                        <Input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => handleUpload(event, "logo")}
                          disabled={saving || uploadingTarget !== null}
                        />
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="school-gallery-url">Gallery URL</Label>
                      <Input
                        id="school-gallery-url"
                        value={galleryUrlDraft}
                        onChange={(event) => setGalleryUrlDraft(event.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={handleAddGalleryUrl} disabled={saving || !galleryUrlDraft.trim()}>
                      <ImageIcon className="h-4 w-4" />
                      Add URL
                    </Button>
                    <Label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-semibold hover:bg-secondary">
                      {uploadingTarget === "gallery" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Gallery
                      <Input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => handleUpload(event, "gallery")}
                        disabled={saving || uploadingTarget !== null}
                      />
                    </Label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(form.gallery_urls || []).map((url, index) => (
                      <div key={`${url}-${index}`} className="space-y-2 rounded-lg border bg-background p-3">
                        <div className="aspect-video overflow-hidden rounded-md bg-muted">
                          <img src={url} alt={`${form.name} gallery ${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex gap-2">
                          <Input value={url} onChange={(event) => updateGalleryUrl(index, event.target.value)} />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveGalleryUrl(url)}
                            disabled={saving}
                            aria-label="Remove gallery image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      )}
    </Card>
  );
}
