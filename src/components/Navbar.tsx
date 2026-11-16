import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import SettingsDropdown from "@/components/SettingsDropdown";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard, LogOut, Settings, ShieldCheck } from "lucide-react";

/** Guests see the marketing story. Signed-in users get one merged bar. */
const GUEST_LINKS = [
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Schools", to: "/schools" },
  { label: "Scholarships", to: "/scholarships" },
  { label: "Contact", to: "/contact" },
];

/** Public trio, then the workspace sections — all in the single bar. */
const MEMBER_PUBLIC = [
  { label: "Schools", to: "/schools" },
  { label: "Scholarships", to: "/scholarships" },
  { label: "Contact", to: "/contact" },
];

const MEMBER_SECTIONS = [
  { label: "Home", to: "/dashboard" },
  { label: "Projects", to: "/projects" },
  { label: "Achievements", to: "/achievements" },
  { label: "CV", to: "/cv" },
];

const workspaceFor = (role?: string | null) => {
  switch (role) {
    case "admin":
    case "super_admin":
      return { to: "/admin/overview", label: "Admin console", icon: ShieldCheck };
    case "teacher":
      return { to: "/teacher", label: "Teacher workspace", icon: LayoutDashboard };
    case "parent":
      return { to: "/parent", label: "Parent workspace", icon: LayoutDashboard };
    default:
      return { to: "/dashboard", label: "My dashboard", icon: LayoutDashboard };
  }
};

/**
 * Public marketing navbar. On every breakpoint the marketing links are an
 * inline scrollable strip — no hamburger. Signed-in app links live in the
 * dashboard navigation.
 */
const Navbar = () => {
  const { user, profile, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const links = user ? MEMBER_PUBLIC : GUEST_LINKS;
  const workspace = workspaceFor(userRole);
  const WorkspaceIcon = workspace.icon;
  const sections =
    userRole === "admin" || userRole === "super_admin"
      ? [{ label: "Admin console", to: "/admin/overview" }]
      : MEMBER_SECTIONS;

  const fullName = profile?.full_name?.trim() ?? "";
  // Never render "?" while the profile is still arriving: fall back to the
  // session email, which is always present when we render the signed-in bar.
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : (user?.email?.[0]?.toUpperCase() ?? "?");
  const displayName = fullName || user?.email || "Your account";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto flex h-16 items-center gap-2 px-4">
        <Logo />

        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shrink-0 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <>
              <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
              {sections.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {user && <NotificationBell profile={profile} />}
          <SettingsDropdown />

          {!user ? (
            <>
              <Button variant="ghost" asChild className="px-3 sm:px-4">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="whitespace-nowrap px-3 sm:px-4">
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {displayName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={workspace.to} className="flex cursor-pointer items-center gap-2">
                    <WorkspaceIcon className="h-4 w-4" />
                    {workspace.label}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex cursor-pointer items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleSignOut()} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
