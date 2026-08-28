import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type StripLink = { label: string; to: string };

/** Student workspace links. */
const STUDENT_LINKS: StripLink[] = [
  { label: "Projects", to: "/projects" },
  { label: "My Gallery", to: "/gallery/personal" },
  { label: "Smart Buddy", to: "/buddy" },
  { label: "My Apps", to: "/my-applications" },
  { label: "Guidance", to: "/recommendations" },
  { label: "Settings", to: "/settings" },
];

/** Parent workspace links. */
const PARENT_LINKS: StripLink[] = [
  { label: "Children", to: "/parent" },
  { label: "Messages", to: "/parent/messages" },
  { label: "Subscription", to: "/parent/subscription" },
  { label: "Settings", to: "/settings" },
];

/** Teacher workspace links. */
const TEACHER_LINKS: StripLink[] = [
  { label: "Overview", to: "/teacher" },
  { label: "Content", to: "/content" },
  { label: "Settings", to: "/settings" },
];

/** Admin workspace links — Settings points at the single school settings hub. */
const ADMIN_LINKS: StripLink[] = [
  { label: "Workspace", to: "/admin/overview" },
  { label: "Settings", to: "/admin/settings" },
];

/** Super admin keeps the platform-level dashboard and account settings. */
const SUPER_ADMIN_LINKS: StripLink[] = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Settings", to: "/settings" },
];

interface NavLinkStripProps {
  role?: string | null;
}

/**
 * Role-aware primary navigation strip rendered under the dashboard header.
 * The dashboard is the app hub: all signed-in links live here so the public
 * top navbar stays a clean marketing bar.
 */
const NavLinkStrip = ({ role }: NavLinkStripProps) => {
  // The school admin workspace has its own top navigation; do not render the
  // generic hub strip there.
  if (role === "admin") {
    return null;
  }

  const links =
    role === "student"
      ? STUDENT_LINKS
      : role === "parent"
        ? PARENT_LINKS
        : role === "teacher"
          ? TEACHER_LINKS
          : role === "super_admin"
            ? SUPER_ADMIN_LINKS
            : STUDENT_LINKS;

  return (
    <nav
      aria-label="Primary"
      className="container mx-auto flex h-11 items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default NavLinkStrip;
