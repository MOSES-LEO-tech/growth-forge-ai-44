import { sanitizeHtml } from "@/lib/sanitize";

interface SanitizedHtmlProps {
  html?: string | null;
  className?: string;
}

/**
 * Renders CMS-authored HTML through DOMPurify. Consumer controls styling via
 * `className` (e.g. `prose` or a custom rich-text stylesheet).
 */
export const SanitizedHtml = ({ html, className }: SanitizedHtmlProps) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
);

export default SanitizedHtml;
