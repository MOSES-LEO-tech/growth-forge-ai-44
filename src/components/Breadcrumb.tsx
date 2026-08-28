import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface BreadcrumbProps {
  /** Destination of the back link. */
  to: string;
  /** Accessible label describing where the link goes. */
  label?: string;
  /** Optional intermediate label (e.g. page section) shown before the target. */
  items?: Array<{ label: string; to?: string }>;
}

/**
 * Shared back-navigation breadcrumb used across authenticated pages so users
 * can always return to the dashboard (or a parent section) from anywhere.
 */
export function Breadcrumb({ to, label = "Back to Dashboard", items = [] }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm">
      <Link
        to={to}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1 text-muted-foreground">
          <span aria-hidden="true" className="text-muted-foreground/50">/</span>
          {item.to ? (
            <Link
              to={item.to}
              className="rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
