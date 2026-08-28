import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ReactNode } from "react";

export const SCHOOL_ADMIN_SECTIONS = [
  { label: "Overview", to: "/admin/overview", icon: LayoutDashboard },
  { label: "Content", to: "/admin/content", icon: FileText },
  { label: "Announcements", to: "/admin/announcements", icon: Megaphone },
  { label: "Academic", to: "/admin/academic", icon: BookOpen },
  { label: "Moderation", to: "/admin/moderation", icon: ShieldCheck },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
] as const;

const pillClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
      : "border border-[hsl(var(--border))] text-muted-foreground hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]"
  );

/**
 * School admin workspace shell: a top navigation bar switches between the
 * admin sections (no side menu). The same pill rail scrolls horizontally on
 * mobile, so there is no hamburger anywhere.
 */
const SchoolAdminLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const schoolId = profile?.school_id ?? null;

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  return (
    <div className="editorial min-h-screen bg-background">
      <DashboardHeader
        profile={profile}
        onSignOut={handleSignOut}
        onProfileUpdated={refreshProfile}
      />

      {/* Top section navigation — replaces the old side menu */}
      <nav
        aria-label="School admin"
        className="sticky top-16 z-40 border-b border-border bg-background"
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SCHOOL_ADMIN_SECTIONS.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} className={pillClasses}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
          {schoolId && (
            <NavLink
              to={`/schools/${schoolId}`}
              className="ml-auto hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View public page
            </NavLink>
          )}
        </div>
      </nav>

      <main id="main-content" role="main" className="mx-auto w-full max-w-[1440px] px-4 py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default SchoolAdminLayout;
