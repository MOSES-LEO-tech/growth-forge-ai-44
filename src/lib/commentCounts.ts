/**
 * Comment counting for a set of resources.
 *
 * Projects and comments are not related by a foreign key — comments carry a
 * polymorphic `resource_type` / `resource_id` pair — so PostgREST cannot embed
 * `comments(count)` in a projects query. Asking it to produced:
 *
 *   Could not find a relationship between 'projects' and 'comments'
 *
 * which is what a parent saw when opening their child's projects.
 */

export interface CommentRow {
  resource_id: string;
}

/** Counts comments per resource id, for the rows already fetched. */
export function countCommentsByResource(rows: CommentRow[] | null | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    if (!row?.resource_id) continue;
    counts[row.resource_id] = (counts[row.resource_id] ?? 0) + 1;
  }
  return counts;
}

/** Safe file count for a project's `media_urls` column, which may be null. */
export function countProjectFiles(mediaUrls: unknown): number {
  return Array.isArray(mediaUrls) ? mediaUrls.length : 0;
}
