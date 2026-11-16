/**
 * One way to read an error message.
 *
 * Supabase returns PostgrestError as a *plain object* (`{ message, details,
 * hint, code }`), never an `Error` instance, so the old idiom
 * `error instanceof Error ? error.message : fallback` discarded every real
 * database error and showed the fallback instead. That turned "row-level
 * security policy" and "duplicate key" into "Unable to save your details."
 */

type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

const nonEmpty = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (typeof error === "string") return nonEmpty(error) || fallback;

  if (error && typeof error === "object") {
    const candidate = error as ErrorLike;
    const message = nonEmpty(candidate.message);
    if (!message) return fallback;

    const code = nonEmpty(candidate.code);
    const head = code ? `${message} (${code})` : message;

    // Details/hints are useful while developing and noisy for end users.
    if (import.meta.env?.DEV) {
      const extras = [nonEmpty(candidate.details), nonEmpty(candidate.hint)].filter(Boolean);
      if (extras.length > 0) return `${head} — ${extras.join(" — ")}`;
    }
    return head;
  }

  return fallback;
}
