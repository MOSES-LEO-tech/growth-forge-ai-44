import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNullable } from "@/lib/numeric";
import { AnalyticsWidget } from "@/components/widgets/AnalyticsWidget";
import { PortfolioModerationWidget } from "@/components/widgets/PortfolioModerationWidget";
import { getErrorMessage } from "@/lib/errors";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  Megaphone,
  Trophy,
  Users,
} from "lucide-react";

const TILE = "editorial-panel flex items-start gap-3 p-5";

/**
 * The admin landing page: only what an admin can act on.
 *
 * Analytics lives in /admin/analytics, the CMS in /admin/content, join codes in
 * /admin/settings. Repeating them here made the page long without making it
 * useful, so it now shows counts and the work waiting for a decision.
 */
const AdminOverview = () => {
  const { profile } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview", profile?.school_id ?? "platform"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.id),
  });

  const pendingProjects = data?.pending_projects;
  const pendingAchievements = data?.pending_achievements;
  // Unknown (still loading) is not zero: waiting stays null until data arrives.
  const waiting = data ? data.pending_projects + data.pending_achievements : null;
  const hasPendingProjects = typeof pendingProjects === "number" && pendingProjects > 0;
  const hasPendingAchievements = typeof pendingAchievements === "number" && pendingAchievements > 0;

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Overview"
        title={profile?.full_name ? `Good to see you, ${profile.full_name.split(" ")[0]}` : "School overview"}
        description="What needs a decision today. Detailed metrics, content and settings live in their own sections."
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            {getErrorMessage(error, "The overview could not be loaded.")}
          </CardContent>
        </Card>
      ) : (
        <>
          <section aria-label="Key numbers" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Students", value: data?.students, icon: Users, tone: "text-primary" },
              { label: "Pending review", value: data?.pending_projects, icon: ClipboardCheck, tone: "text-warning-ink" },
              { label: "Approved projects", value: data?.approved_projects, icon: FolderKanban, tone: "text-success-ink" },
              { label: "Verified awards", value: data?.verified_achievements, icon: Trophy, tone: "text-primary" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={TILE}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="caps-label text-muted-foreground">{label}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {isLoading ? <Skeleton className="h-8 w-12" /> : formatNullable(value)}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <section aria-label="Needs attention" className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Needs your attention
            </h2>

            {isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : waiting === 0 ? (
              <div className="flex items-center gap-3 rounded-xl border border-dashed p-5">
                <CheckCircle2 className="h-5 w-5 text-success-ink" />
                <div>
                  <p className="font-medium">Nothing is waiting</p>
                  <p className="text-sm text-muted-foreground">
                    Student work you approve appears on the school page and the home showcase.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    show: hasPendingProjects,
                    title: `${formatNullable(pendingProjects)} project${pendingProjects === 1 ? "" : "s"} to review`,
                    desc: "Approve, reject with a reason, or send back for more evidence.",
                    to: "#approvals",
                    label: "Review below",
                    icon: FolderKanban,
                  },
                  {
                    show: hasPendingAchievements,
                    title: `${formatNullable(pendingAchievements)} award${pendingAchievements === 1 ? "" : "s"} to verify`,
                    desc: "Only verified awards carry the school's endorsement.",
                    to: "/admin/students?tab=achievements",
                    label: "Verify awards",
                    icon: Trophy,
                  },
                ]
                  .filter((item) => item.show)
                  .map(({ title, desc, to, label, icon: Icon }) => (
                    <div key={title} className="editorial-panel flex flex-col gap-3 p-5">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-medium">{title}</p>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="gap-2 self-start">
                        {to.startsWith("#") ? (
                          <a href={to}>{label}</a>
                        ) : (
                          <Link to={to}>
                            {label}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section id="approvals" aria-label="Portfolio approvals" className="mb-8 scroll-mt-24">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Portfolio approvals
            </h2>
            <PortfolioModerationWidget defaultExpanded schoolId={profile?.school_id ?? null} />
          </section>

          <section id="analytics" aria-label="Analytics" className="mb-8 scroll-mt-24">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Analytics
            </h2>
            <AnalyticsWidget defaultExpanded schoolId={profile?.school_id ?? null} />
          </section>

          <section aria-label="Shortcuts" className="grid gap-3 sm:grid-cols-2">
            {[
              { to: "/admin/content?tab=announcements", label: "Post an announcement", desc: "Reaches students, parents or staff", icon: Megaphone },
              { to: "/admin/settings", label: "Badge & gallery", desc: "How your school appears publicly", icon: Users },
            ].map(({ to, label, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="rounded-lg bg-muted p-2 text-muted-foreground group-hover:text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </section>
        </>
      )}
    </SchoolAdminLayout>
  );
};

export default AdminOverview;
