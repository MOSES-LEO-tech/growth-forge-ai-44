import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
        >
            <ol className="flex items-center gap-2">
                <li>
                    <Link
                        to="/dashboard"
                        className="hover:text-foreground transition-colors focus-ring rounded px-1"
                        aria-label="Home"
                    >
                        <Home className="w-4 h-4" aria-hidden="true" />
                    </Link>
                </li>

                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <li key={index} className="flex items-center gap-2">
                            <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            {item.href && !isLast ? (
                                <Link
                                    to={item.href}
                                    className="hover:text-foreground transition-colors focus-ring rounded px-1"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    className={cn(isLast && "text-foreground font-medium")}
                                    aria-current={isLast ? "page" : undefined}
                                >
                                    {item.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
