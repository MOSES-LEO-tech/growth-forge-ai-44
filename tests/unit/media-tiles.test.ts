import { describe, expect, it } from "vitest";
import {
  eventMedia,
  filterMedia,
  galleryTiles,
  heroTiles,
  mediaCounts,
  mediaKind,
  type GalleryEventLike,
} from "@/lib/mediaTiles";

const img = (id: string, url = `${id}.jpg`) => ({ id, url, type: "image/jpeg" });
const vid = (id: string) => ({ id, url: `${id}.mp4`, type: "video/mp4" });

const event = (over: Partial<GalleryEventLike> = {}): GalleryEventLike => ({
  id: "e1",
  title: "Sports day",
  created_at: "2026-11-10T10:00:00.000Z",
  media: [],
  ...over,
});

describe("mediaKind", () => {
  it("trusts a stored video type", () => {
    expect(mediaKind({ id: "a", url: "a.bin", type: "video/mp4" })).toBe("video");
  });

  it("falls back to the file extension when the type is missing", () => {
    expect(mediaKind({ id: "a", url: "clip.MOV?token=1", type: null })).toBe("video");
    expect(mediaKind({ id: "b", url: "photo.png", type: null })).toBe("image");
    expect(mediaKind({ id: "c", url: "report.pdf", type: null })).toBe("document");
  });
});

describe("eventMedia", () => {
  it("prefers normalised media and drops entries without a url", () => {
    const rows = eventMedia(event({ media: [img("a"), { id: "b", url: "", type: null }] }));
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("falls back to gallery_media", () => {
    const rows = eventMedia(event({ media: undefined, gallery_media: [img("z")] }));
    expect(rows.map((r) => r.id)).toEqual(["z"]);
  });
});

describe("filterMedia", () => {
  it("splits photos from videos", () => {
    const all = [img("a"), vid("b")];
    expect(filterMedia(all, "photo").map((m) => m.id)).toEqual(["a"]);
    expect(filterMedia(all, "video").map((m) => m.id)).toEqual(["b"]);
    expect(filterMedia(all, "all")).toHaveLength(2);
  });
});

describe("galleryTiles", () => {
  it("marks only the first tile of an event as the caption carrier", () => {
    const tiles = galleryTiles([event({ media: [img("a"), img("b")] })]);
    expect(tiles.map((t) => [t.key, t.leadsEvent])).toEqual([
      ["e1:a", true],
      ["e1:b", false],
    ]);
  });

  it("keeps event order (newest first) and media order", () => {
    const tiles = galleryTiles([
      event({ id: "new", media: [img("a")] }),
      event({ id: "old", media: [img("b")] }),
    ]);
    expect(tiles.map((t) => t.eventId)).toEqual(["new", "old"]);
  });

  it("returns nothing for an event with no playable media", () => {
    expect(galleryTiles([event({ media: [] })])).toEqual([]);
  });

  it("applies the video filter across events", () => {
    const tiles = galleryTiles(
      [event({ id: "e1", media: [img("a"), vid("b")] }), event({ id: "e2", media: [vid("c")] })],
      "video"
    );
    expect(tiles.map((t) => t.key)).toEqual(["e1:b", "e2:c"]);
  });
});

describe("mediaCounts", () => {
  it("counts each filter so a chip never over-promises", () => {
    expect(mediaCounts([event({ media: [img("a"), vid("b")] })])).toEqual({ all: 2, photo: 1, video: 1 });
  });
});

describe("heroTiles", () => {
  it("uses real school covers before project covers", () => {
    const tiles = heroTiles(
      [{ id: "s1", name: "Goodwill SSS", cover_url: "logo.jpg", location: "Khyengera", country: "Uganda" }],
      [{ id: "p1", title: "Solar lamp", cover_url: "lamp.jpg", student: "Mark L.", school_name: "Goodwill SSS" }]
    );
    expect(tiles.map((t) => t.caption)).toEqual(["Goodwill SSS", "Solar lamp"]);
    expect(tiles[0].subcaption).toBe("Khyengera, Uganda");
  });

  it("skips entities without a cover instead of inventing one", () => {
    const tiles = heroTiles([{ id: "s1", name: "No photos", cover_url: null }], []);
    expect(tiles).toEqual([]);
  });

  it("respects the limit", () => {
    const tiles = heroTiles(
      [
        { id: "s1", name: "A", cover_url: "a.jpg" },
        { id: "s2", name: "B", cover_url: "b.jpg" },
      ],
      [{ id: "p1", title: "C", cover_url: "c.jpg" }],
      2
    );
    expect(tiles).toHaveLength(2);
  });
});
