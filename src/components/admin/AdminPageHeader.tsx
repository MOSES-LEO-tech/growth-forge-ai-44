import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared page header for the school admin workspace. A quiet, hairline-divided
 * heading block — deliberately not a card.
 */
const AdminPageHeader = ({
  kicker,
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) => (
  <section
    className={cn(
      "mb-8 flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between",
      className
    )}
  >
    <div className="min-w-0 max-w-3xl">
      <span className="caps-label text-muted-foreground">{kicker}</span>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </section>
);

export default AdminPageHeader;
