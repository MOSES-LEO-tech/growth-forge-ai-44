import DOMPurify from "dompurify";

/**
 * Sanitize CMS-authored HTML before it is rendered anywhere public.
 * Rich text comes from trusted school staff, but content is ultimately
 * displayed to anonymous visitors, so it must be scrubbed on the client.
 */
export const sanitizeHtml = (html?: string | null): string =>
  DOMPurify.sanitize(html ?? "", {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
