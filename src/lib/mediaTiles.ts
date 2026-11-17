/**
 * Media presentation helpers.
 *
 * Both surfaces here are image-led, and both must stay honest: a tile only
 * renders real media the platform actually has. When there is none, the design
 * falls back to typographic tiles built from real names and counts rather than
 * stock photography or empty grey boxes.
 */

export type MediaKind = "image" | "video" | "document";

export interface GalleryMediaLike {
  id: string;
  url: string;
  type: string | null;
}

export interface GalleryEventLike {
  id: string;
  title: string | null;
  created_at: string | null;
  media?: GalleryMediaLike[] | null;
  gallery_media?: GalleryMediaLike[] | null;
}

/** Media rows of an event, from whichever field the normaliser filled. */
export function eventMedia(event: GalleryEventLike): GalleryMediaLike[] {
  const rows = event.media ?? event.gallery_media ?? [];
  return rows.filter((item) => Boolean(item?.url));
}

/** `${extension}` based kind detection, with the stored type as a fallback. */
export function mediaKind(media: GalleryMediaLike): MediaKind {
  const stored = (media.type ?? "").toLowerCase();
  if (stored.startsWith("video")) return "video";
  if (stored.includes("pdf") || stored.startsWith("application")) return "document";

  const path = media.url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(path)) return "video";
  if (/\.pdf$/.test(path)) return "document";
  return "image";
}

export type MediaFilter = "all" | "photo" | "video";

/** Filter a flat media list for the gallery chips. */
export function filterMedia(media: GalleryMediaLike[], filter: MediaFilter): GalleryMediaLike[] {
  if (filter === "all") return media;
  const wanted: MediaKind = filter === "video" ? "video" : "image";
  return media.filter((item) => mediaKind(item) === wanted);
}

export interface GalleryTile {
  key: string;
  url: string;
  kind: MediaKind;
  eventTitle: string | null;
  eventId: string;
  /** True for the first tile of an event — it carries the caption. */
  leadsEvent: boolean;
}

/**
 * Flatten events into tiles, newest event first, media in order.
 * The first tile gets the large cell in the mosaic.
 */
export function galleryTiles(events: GalleryEventLike[], filter: MediaFilter = "all"): GalleryTile[] {
  const tiles: GalleryTile[] = [];

  for (const event of events) {
    const media = filterMedia(eventMedia(event), filter);
    media.forEach((item, index) => {
      tiles.push({
        key: `${event.id}:${item.id}`,
        url: item.url,
        kind: mediaKind(item),
        eventTitle: event.title,
        eventId: event.id,
        leadsEvent: index === 0,
      });
    });
  }

  return tiles;
}

/** Counts for the filter chips, so a chip never promises items it cannot show. */
export function mediaCounts(events: GalleryEventLike[]): Record<MediaFilter, number> {
  const all = events.flatMap(eventMedia);
  return {
    all: all.length,
    photo: all.filter((item) => mediaKind(item) === "image").length,
    video: all.filter((item) => mediaKind(item) === "video").length,
  };
}

export interface HeroTile {
  id: string;
  url: string;
  caption: string;
  subcaption?: string;
}

/**
 * Hero mosaic: real covers only.
 *
 * School covers (gallery photo, else badge) come first because they are the one
 * thing this platform can show without exposing a student's work, then approved
 * project covers. Missing slots are not filled with anything.
 */
export function heroTiles(
  schools: { id: string; name: string; cover_url?: string | null; location?: string | null; country?: string | null }[],
  projects: { id: string; title: string; cover_url?: string | null; student?: string | null; school_name?: string | null }[],
  limit = 3
): HeroTile[] {
  const tiles: HeroTile[] = [];

  for (const school of schools) {
    if (tiles.length >= limit) break;
    if (!school.cover_url) continue;
    tiles.push({
      id: `school-${school.id}`,
      url: school.cover_url,
      caption: school.name,
      subcaption: [school.location, school.country].filter(Boolean).join(", ") || undefined,
    });
  }

  for (const project of projects) {
    if (tiles.length >= limit) break;
    if (!project.cover_url) continue;
    tiles.push({
      id: `project-${project.id}`,
      url: project.cover_url,
      caption: project.title,
      subcaption: [project.student, project.school_name].filter(Boolean).join(" · ") || undefined,
    });
  }

  return tiles;
}
