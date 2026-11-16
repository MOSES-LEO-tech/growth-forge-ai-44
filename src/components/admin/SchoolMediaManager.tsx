import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SchoolGalleryMedia } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { validateBadgeFile } from "@/lib/schoolBadge";
import {
  addSchoolGalleryMedia,
  deleteSchoolMediaObject,
  listSchoolGalleryMedia,
  removeSchoolGalleryMedia,
  reorderSchoolGalleryMedia,
  saveSchoolBadge,
  updateSchoolGalleryMedia,
  uploadSchoolMedia,
} from "@/lib/supabase/schoolMedia";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

type Props = {
  schoolId: string | null;
  className?: string;
};

/**
 * The one place a school admin manages how their school looks: badge and
 * gallery. Both write to `schools.logo_url` / `school_gallery_media`, which the
 * public school page reads — no copy lives only in the browser.
 */
const SchoolMediaManager = ({ schoolId, className }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const badgeInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [schoolName, setSchoolName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [media, setMedia] = useState<SchoolGalleryMedia[]>([]);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [captionBusyId, setCaptionBusyId] = useState<string | null>(null);

  const refreshPublicCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
    queryClient.invalidateQueries({ queryKey: ["schools"] });
  }, [queryClient, schoolId]);

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data: school, error }, gallery] = await Promise.all([
        supabase.from("schools").select("name,logo_url").eq("id", schoolId).maybeSingle(),
        listSchoolGalleryMedia(schoolId),
      ]);
      if (error) throw error;
      setSchoolName(school?.name ?? "");
      setBadgeUrl(school?.logo_url ?? null);
      setMedia(gallery);
    } catch (error) {
      toast({
        title: "Could not load school media",
        description: getErrorMessage(error, "Try refreshing the page."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBadgeFile = async (file: File) => {
    if (!schoolId) return;
    const check = validateBadgeFile(file);
    if (!check.ok) {
      toast({ title: "Badge not accepted", description: check.error, variant: "destructive" });
      return;
    }

    const previousBadge = badgeUrl;
    setBadgeBusy(true);
    try {
      const { url } = await uploadSchoolMedia(schoolId, file, "logo");
      await saveSchoolBadge(schoolId, url);
      setBadgeUrl(url);
      refreshPublicCaches();
      toast({ title: "Badge updated", description: "It now appears on your school cards and header." });

      // Replace, not accumulate: drop the old file once the new one is live.
      if (previousBadge && previousBadge !== url) {
        try {
          await deleteSchoolMediaObject(previousBadge);
        } catch (cleanupError) {
          console.warn("Old badge file could not be deleted:", cleanupError);
        }
      }
    } catch (error) {
      toast({
        title: "Badge upload failed",
        description: getErrorMessage(error, "Unable to upload this badge."),
        variant: "destructive",
      });
    } finally {
      setBadgeBusy(false);
    }
  };

  const removeBadge = async () => {
    if (!schoolId) return;
    const previousBadge = badgeUrl;
    setBadgeBusy(true);
    try {
      await saveSchoolBadge(schoolId, null);
      setBadgeUrl(null);
      refreshPublicCaches();
      toast({ title: "Badge removed", description: "Your school will show its initials instead." });

      if (previousBadge) {
        try {
          await deleteSchoolMediaObject(previousBadge);
        } catch (cleanupError) {
          console.warn("Badge file could not be deleted:", cleanupError);
        }
      }
    } catch (error) {
      toast({
        title: "Could not remove badge",
        description: getErrorMessage(error, "Try again in a moment."),
        variant: "destructive",
      });
    } finally {
      setBadgeBusy(false);
    }
  };

  const handleGalleryFiles = async (files: File[]) => {
    if (!schoolId || files.length === 0) return;
    setGalleryBusy(true);
    let added = 0;
    const failures: string[] = [];

    try {
      for (const file of files) {
        try {
          const { url, mediaType } = await uploadSchoolMedia(schoolId, file, "gallery");
          await addSchoolGalleryMedia(schoolId, url, mediaType, null);
          added += 1;
        } catch (error) {
          failures.push(`${file.name}: ${getErrorMessage(error, "upload failed")}`);
        }
      }

      if (added > 0) {
        setMedia(await listSchoolGalleryMedia(schoolId));
        refreshPublicCaches();
      }

      if (failures.length === 0) {
        toast({ title: `${added} ${added === 1 ? "item" : "items"} added to the gallery` });
      } else {
        toast({
          title: `${added} added, ${failures.length} failed`,
          description: failures.slice(0, 3).join(" · "),
          variant: "destructive",
        });
      }
    } finally {
      setGalleryBusy(false);
    }
  };

  const saveCaption = async (id: string, caption: string) => {
    setCaptionBusyId(id);
    try {
      await updateSchoolGalleryMedia(id, { caption: caption.trim() || null });
      refreshPublicCaches();
    } catch (error) {
      toast({
        title: "Caption not saved",
        description: getErrorMessage(error, "Try again."),
        variant: "destructive",
      });
    } finally {
      setCaptionBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    setMedia(next);
    try {
      await reorderSchoolGalleryMedia(next.map((item) => item.id));
      refreshPublicCaches();
    } catch (error) {
      toast({
        title: "Order not saved",
        description: getErrorMessage(error, "Reload and try again."),
        variant: "destructive",
      });
      setMedia(media);
    }
  };

  const removeItem = async (item: SchoolGalleryMedia) => {
    if (!window.confirm("Remove this from the gallery? The uploaded file is deleted from storage too.")) return;
    try {
      // Row first: it is the source of truth. A failed file delete must not
      // leave a row pointing at a missing object.
      await removeSchoolGalleryMedia(item.id);
      setMedia((current) => current.filter((entry) => entry.id !== item.id));
      refreshPublicCaches();

      try {
        await deleteSchoolMediaObject(item.url);
      } catch (storageError) {
        console.warn("Gallery row removed but the file could not be deleted:", storageError);
        toast({
          title: "Removed from gallery",
          description: "The stored file could not be deleted — it will need cleaning up manually.",
        });
        return;
      }

      toast({ title: "Removed from gallery and storage" });
    } catch (error) {
      toast({
        title: "Could not remove",
        description: getErrorMessage(error, "Try again."),
        variant: "destructive",
      });
    }
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>School media</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No school is assigned to your account yet.</p>
        </CardContent>
      </Card>
    );
  }

  const initials = schoolName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div className={className}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Badge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              School badge
            </CardTitle>
            <CardDescription>
              The square mark shown on school cards, the directory and your school header. Use a
              square PNG, SVG or JPEG — at least 256×256 px on a transparent or white background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : badgeUrl ? (
                  <img src={badgeUrl} alt={`${schoolName} badge`} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">{initials || "—"}</span>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {badgeUrl ? (
                  <img src={badgeUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] font-semibold text-muted-foreground">{initials || "—"}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Square preview, and the same badge at avatar size.
              </p>
            </div>

            <input
              ref={badgeInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleBadgeFile(file);
                event.target.value = "";
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={badgeBusy || loading}
                onClick={() => badgeInputRef.current?.click()}
              >
                {badgeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {badgeUrl ? "Replace badge" : "Upload badge"}
              </Button>
              {badgeUrl && (
                <Button type="button" variant="ghost" disabled={badgeBusy} onClick={() => void removeBadge()}>
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gallery summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Gallery
            </CardTitle>
            <CardDescription>
              Photos and video from school life. Images up to 10 MB, video up to 100 MB. Items appear
              on your public page in this order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  if (files.length) void handleGalleryFiles(files);
                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                className="gap-2"
                disabled={galleryBusy}
                onClick={() => galleryInputRef.current?.click()}
              >
                {galleryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Add photos or video
              </Button>
              <span className="text-sm text-muted-foreground">
                {media.length} {media.length === 1 ? "item" : "items"} in the gallery
              </span>
            </div>
            {media.length === 0 && !loading && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Nothing yet. Your public gallery shows an empty state until you add something.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {media.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item, index) => (
            <div key={item.id} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                {item.media_type === "video" ? (
                  <video src={item.url} className="h-full w-full object-cover" muted loop playsInline controls />
                ) : (
                  <img src={item.url} alt={item.caption || "Gallery media"} className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.media_type === "video" ? (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" /> Video
                    </span>
                  ) : (
                    "Photo"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`caption-${item.id}`} className="text-xs text-muted-foreground">
                  Caption
                </Label>
                <Input
                  id={`caption-${item.id}`}
                  defaultValue={item.caption ?? ""}
                  placeholder="e.g. Inter-house athletics, term 2"
                  disabled={captionBusyId === item.id}
                  onBlur={(event) => void saveCaption(item.id, event.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => void move(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Move down"
                    disabled={index === media.length - 1}
                    onClick={() => void move(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove from gallery"
                  onClick={() => void removeItem(item)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolMediaManager;
