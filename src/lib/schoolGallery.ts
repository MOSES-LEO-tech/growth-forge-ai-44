/**
 * Gallery selection for a school page.
 *
 * Rule: the gallery shows only photos the school itself supplied. There is no
 * fallback imagery — not a stock photo, not the logo, not the cover image.
 * A placeholder here is indistinguishable from a real photo to a visitor, so
 * it silently fabricates a school's history.
 */

const MAX_GALLERY_TILES = 6;

export function selectGalleryImages(
  urls: Array<string | null | undefined> | null | undefined,
  brokenUrls: string[] = []
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of urls ?? []) {
    const url = raw?.trim();
    if (!url || seen.has(url) || brokenUrls.includes(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= MAX_GALLERY_TILES) break;
  }

  return out;
}
