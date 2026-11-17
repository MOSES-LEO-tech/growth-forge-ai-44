import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ImageOff, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaDisplay } from "@/components/MediaDisplay";
import { getGalleryEvents } from "@/lib/supabase/gallery";
import { getErrorMessage } from "@/lib/errors";

interface ChildMedia {
  id: string;
  url: string;
  type: string | null;
}

interface ChildGalleryEvent {
  id: string;
  title: string | null;
  created_at: string | null;
  media?: ChildMedia[];
  gallery_media?: ChildMedia[];
}

/**
 * A child's gallery, read-only.
 *
 * Parents previously had no gallery surface at all. Access is granted by the
 * parent_reads_linked_child_gallery_* policies (active link only) and the
 * storage policy that lets an active parent sign the child's media URLs.
 */
export function ChildGallery({ childId, childName }: { childId: string; childName?: string | null }) {
  const [events, setEvents] = useState<ChildGalleryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await getGalleryEvents(childId)) as unknown as ChildGalleryEvent[];
      setEvents(rows);
    } catch (err) {
      setError(getErrorMessage(err, "We could not load the gallery."));
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading gallery…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
        <Button size="sm" variant="outline" onClick={() => void load()} className="gap-1.5">
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-10 text-center">
        <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No gallery items yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Photos and videos {childName ? `${childName} has` : "your child has"} uploaded will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {events.map((event) => {
        const media = (event.media ?? event.gallery_media ?? []).filter((item) => item?.url);
        return (
          <section key={event.id} className="rounded-xl border bg-card p-4">
            <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{event.title || "Untitled"}</h3>
              {event.created_at && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {new Date(event.created_at).toLocaleDateString()}
                </p>
              )}
            </header>

            {media.length === 0 ? (
              <p className="text-xs text-muted-foreground">No media attached to this item.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {media.map((item) => (
                  <li key={item.id} className="overflow-hidden rounded-lg border bg-muted">
                    <MediaDisplay
                      src={item.url}
                      alt={event.title ?? "Gallery item"}
                      className="aspect-square w-full"
                      fit="cover"
                      loading="lazy"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default ChildGallery;
