/**
 * Map a public Storage URL back to an object path.
 *
 * Deleting a gallery row leaves the file in the bucket unless we remove it, so
 * the app needs the inverse of `getPublicUrl()`. Anything that is not a public
 * URL for our own bucket returns null — we must never delete a file the school
 * merely linked to (their badge could be hosted elsewhere).
 */

export const SCHOOL_ASSETS_BUCKET = "school-assets";

const MARKER = `/storage/v1/object/public/${SCHOOL_ASSETS_BUCKET}/`;

export function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  const markerIndex = url.indexOf(MARKER);
  if (markerIndex === -1) return null;

  const rest = url.slice(markerIndex + MARKER.length).split(/[?#]/)[0];
  if (!rest) return null;

  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}
