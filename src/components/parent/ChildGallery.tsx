import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ImageOff, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MediaDisplay } from "@/components/MediaDisplay";
import { getGalleryEvents } from "@/lib/supabase/gallery";
import { getErrorMessage } from "@/lib/errors";
import {
  galleryTiles,
  mediaCounts,
  type GalleryEventLike,
  type GalleryTile,
  type MediaFilter,
} from "@/lib/mediaTiles";

const FILTERS: { value: MediaFilter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
];

/**
 * A child's gallery, read-only.
 *
 * An album wall rather than a list of events: the newest item opens large, the
 * rest tile around it, and any item opens full-size with arrow navigation.
 * Access is granted by the parent_reads_linked_child_gallery_* policies (active
 * link only) and the storage policy that lets an active parent sign the child's
 * media URLs.
 */
export function ChildGallery({ childId, childName }: { childId: string; childName?: string | null }) {
  const [events, setEvents] = useState<GalleryEventLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = (await getGalleryEvents(childId)) as unknown as GalleryEventLike[];
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

  const counts = useMemo(() => mediaCounts(events), [events]);
  const tiles = useMemo(() => galleryTiles(events, filter), [events, filter]);
  const active: GalleryTile | null = openIndex === null ? null : tiles[openIndex] ?? null;

  const step = useCallback((delta: number) => {
    setOpenIndex((current) => {
      if (current === null) return current;
      const next = current + delta;
      if (next < 0 || next >= tiles.length) return current;
      return next;
    });
  }, [tiles.length]);

  /* Arrow keys move through the lightbox; Radix handles Escape. */
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, step]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`animate-pulse rounded-xl bg-muted ${
              index === 0 ? "col-span-2 row-span-2 h-64" : "h-[7.5rem]"
            }`}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      >
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

  if (counts.all === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
        <ImageOff className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No photos or videos yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Anything {childName ? `${childName} uploads` : "your child uploads"} to their gallery appears here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter gallery">
          {FILTERS.map(({ value, label }) => {
            const count = counts[value];
            const selected = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={selected}
                disabled={count === 0 && value !== "all"}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                <span className={`ml-1.5 tabular-nums ${selected ? "opacity-80" : "opacity-60"}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {tiles.length} {tiles.length === 1 ? "item" : "items"}
        </p>
      </div>

      {tiles.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {filter === "video" ? "videos" : "photos"} in this gallery yet.
        </p>
      ) : (
        <ul className="grid auto-rows-[132px] grid-cols-2 gap-3 sm:auto-rows-[150px] sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile, index) => (
            <li key={tile.key} className={index === 0 ? "col-span-2 row-span-2" : undefined}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                className="group relative h-full w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <MediaDisplay
                  src={tile.url}
                  alt={tile.eventTitle ?? "Gallery item"}
                  kind={tile.kind}
                  className="h-full w-full"
                  mediaClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  fit="cover"
                  loading={index < 4 ? "eager" : "lazy"}
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                />

                {tile.kind === "video" && (
                  <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  </span>
                )}

                {tile.leadsEvent && tile.eventTitle && (
                  <span className="absolute inset-x-3 bottom-3 text-left text-sm font-medium leading-tight text-white drop-shadow">
                    {tile.eventTitle}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIndex(null);
        }}
      >
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">{active?.eventTitle ?? "Gallery item"}</DialogTitle>
          {active && (
            <>
              <div className="relative flex max-h-[70vh] items-center justify-center bg-black">
                <MediaDisplay
                  src={active.url}
                  alt={active.eventTitle ?? "Gallery item"}
                  kind={active.kind}
                  className="max-h-[70vh] w-full"
                  mediaClassName="max-h-[70vh] w-full object-contain"
                  fit="contain"
                  controls={active.kind === "video"}
                  autoPlay={active.kind === "video"}
                />

                {tiles.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={openIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Previous item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      disabled={openIndex === tiles.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-30"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Next item</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{active.eventTitle ?? "Gallery item"}</p>
                  <p className="text-xs text-muted-foreground">
                    {active.kind === "video" ? "Video" : active.kind === "document" ? "Document" : "Photo"}
                  </p>
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {openIndex === null ? 1 : openIndex + 1} of {tiles.length}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChildGallery;
