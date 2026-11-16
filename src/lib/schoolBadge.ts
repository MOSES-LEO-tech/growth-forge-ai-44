/**
 * School badge (logo) rules.
 *
 * A badge appears in small squares — school cards, the school header, directory
 * lists — so it has to be square-ish, light, and legible at 40 px. It is stored
 * in the `school-assets` bucket under `<school-id>/logo/` and its public URL is
 * written to `schools.logo_url`.
 */

export const MAX_BADGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export type BadgeValidation = { ok: true } | { ok: false; error: string };

export function validateBadgeFile(file: { type: string; size: number }): BadgeValidation {
  if (!file.type || !ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Choose a PNG, JPEG, WEBP or SVG image." };
  }
  if (file.size <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > MAX_BADGE_BYTES) {
    return { ok: false, error: "Badges must be 5 MB or smaller." };
  }
  return { ok: true };
}

const slug = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "badge";

const extension = (name: string) =>
  name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";

export function badgeUploadPath(schoolId: string, fileName: string): string {
  const randomId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${schoolId}/logo/${randomId}-${slug(fileName)}.${extension(fileName)}`;
}
