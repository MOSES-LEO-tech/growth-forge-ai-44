import { Link } from "react-router-dom";
import { brand } from "@/lib/brand";

export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label={`${brand.name} mark`}
    >
      <rect width="48" height="48" rx="10" fill="hsl(var(--primary))" />
      <path
        d="M13 33V15h5.4L24 25.2 29.6 15H35v18h-4.5V22.6L25.9 33h-3.8l-4.6-10.4V33H13Z"
        fill="hsl(var(--primary-foreground))"
      />
      <circle cx="14" cy="38" r="2.2" fill="hsl(var(--accent))" />
      <circle cx="24" cy="38" r="2.2" fill="hsl(var(--secondary))" />
      <circle cx="34" cy="38" r="2.2" fill="hsl(var(--accent))" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link 
      to="/" 
      className="flex min-w-0 items-center gap-3 hover:opacity-80 transition-opacity duration-300"
    >
      <BrandMark />
      <span className="hidden font-semibold text-lg uppercase tracking-normal sm:inline">{brand.shortName}</span>
    </Link>
  );
}
