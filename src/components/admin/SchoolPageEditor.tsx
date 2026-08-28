import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SchoolGalleryMedia } from "@/integrations/supabase/types";
import {
  addSchoolGalleryMedia,
  listSchoolGalleryMedia,
  removeSchoolGalleryMedia,
  reorderSchoolGalleryMedia,
  saveSchoolHero,
  updateSchoolGalleryMedia,
  uploadSchoolMedia,
} from "@/lib/supabase/schoolMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SchoolPageEditorProps {
  schoolId: string;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const SchoolPageEditor = ({ schoolId }: SchoolPageEditorProps) => {
  const { toast } = useToast();
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null);
  const [tagline, setTagline] = useState("");
  const [media, setMedia] = useState<SchoolGalleryMedia[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: school, error: schoolError }, gallery] = await Promise.all([
        supabase
          .from("schools")
          .select("cover_url,hero_video_url,tagline")
          .eq("id", schoolId)
          .maybeSingle(),
        listSchoolGalleryMedia(schoolId),
      ]);
      if (schoolError) throw schoolError;
      setCoverUrl(school?.cover_url || null);
      setHeroVideoUrl(school?.hero_video_url || null);
      setTagline(school?.tagline || "");
      setMedia(gallery);
    } catch (error) {
      console.error("Failed to load school page editor:", error);
      toast({
        title: "Load failed",
        description: getErrorMessage(error, "Unable to load school page settings."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistTagline = async () => {
    setBusy("tagline");
    try {
      await saveSchoolHero(schoolId, { tagline: tagline.trim() || null });
      toast({ title: "Tagline saved" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Unable to save tagline."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setBusy("cover");
    try {
      const { url } = await uploadSchoolMedia(schoolId, file, "hero");
      await saveSchoolHero(schoolId, { cover_url: url });
      setCoverUrl(url);
      toast({ title: "Header image updated" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Unable to upload header image."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setBusy("video");
    try {
      const { url } = await uploadSchoolMedia(schoolId, file, "hero");
      await saveSchoolHero(schoolId, { hero_video_url: url });
      setHeroVideoUrl(url);
      toast({ title: "Hero video updated" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Unable to upload hero video."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const removeHeroVideo = async () => {
    setBusy("video");
    try {
      await saveSchoolHero(schoolId, { hero_video_url: null });
      setHeroVideoUrl(null);
      toast({ title: "Hero video removed" });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: getErrorMessage(error, "Unable to remove hero video."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleGalleryUpload = async (files: File[]) => {
    setBusy("gallery");
    try {
      for (const file of files) {
        const { url, mediaType } = await uploadSchoolMedia(schoolId, file, "gallery");
        await addSchoolGalleryMedia(schoolId, url, mediaType, null);
      }
      await load();
      toast({ title: "Gallery updated" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Unable to add gallery media."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
      if (galleryFileRef.current) galleryFileRef.current.value = "";
    }
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setMedia(next);
    try {
      await reorderSchoolGalleryMedia(next.map((m) => m.id));
    } catch (error) {
      toast({
        title: "Reorder failed",
        description: getErrorMessage(error, "Unable to reorder gallery."),
        variant: "destructive",
      });
      void load();
    }
  };

  const saveCaption = async (id: string, caption: string) => {
    setBusy(`caption-${id}`);
    try {
      await updateSchoolGalleryMedia(id, { caption: caption.trim() || null });
    } catch (error) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Unable to save caption."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (id: string) => {
    setBusy(`remove-${id}`);
    try {
      await removeSchoolGalleryMedia(id);
      setMedia((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      toast({
        title: "Remove failed",
        description: getErrorMessage(error, "Unable to remove gallery media."),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section>
        <h3 className="mb-4 text-lg font-semibold">Hero</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Header image</Label>
            <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
              {coverUrl ? (
                <img src={coverUrl} alt="Header preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleCoverUpload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy === "cover"}
              onClick={() => coverFileRef.current?.click()}
              className="w-full gap-2"
            >
              {busy === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload header image
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Hero video (plays over the image)</Label>
            <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
              {heroVideoUrl ? (
                <video
                  src={heroVideoUrl}
                  poster={coverUrl || undefined}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Video className="h-8 w-8" />
                </div>
              )}
            </div>
            <input
              ref={videoFileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleVideoUpload(file);
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy === "video"}
                onClick={() => videoFileRef.current?.click()}
                className="flex-1 gap-2"
              >
                {busy === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Upload video
              </Button>
              {heroVideoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy === "video"}
                  onClick={() => void removeHeroVideo()}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 max-w-xl space-y-2">
          <Label htmlFor="school-tagline">Tagline</Label>
          <Textarea
            id="school-tagline"
            rows={2}
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="A short line that appears under the school name."
          />
          <Button
            type="button"
            size="sm"
            disabled={busy === "tagline"}
            onClick={() => void persistTagline()}
          >
            {busy === "tagline" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save tagline
          </Button>
        </div>
      </section>

      {/* Gallery */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Gallery</h3>
          <input
            ref={galleryFileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) void handleGalleryUpload(files);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy === "gallery"}
            onClick={() => galleryFileRef.current?.click()}
            className="gap-2"
          >
            {busy === "gallery" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Add media
          </Button>
        </div>

        {media.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
            <ImageIcon className="mx-auto mb-3 h-8 w-8" />
            Add photos or videos to your school gallery.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item, index) => (
              <div key={item.id} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  {item.media_type === "video" ? (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      controls
                    />
                  ) : (
                    <img src={item.url} alt={item.caption || "Gallery media"} className="h-full w-full object-cover" />
                  )}
                </div>
                <Input
                  value={item.caption || ""}
                  placeholder="Caption"
                  onChange={(event) =>
                    setMedia((current) =>
                      current.map((m) => (m.id === item.id ? { ...m, caption: event.target.value } : m))
                    )
                  }
                  onBlur={(event) => void saveCaption(item.id, event.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => void moveItem(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move down"
                      disabled={index === media.length - 1}
                      onClick={() => void moveItem(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    disabled={busy === `remove-${item.id}`}
                    onClick={() => void removeItem(item.id)}
                  >
                    {busy === `remove-${item.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SchoolPageEditor;
