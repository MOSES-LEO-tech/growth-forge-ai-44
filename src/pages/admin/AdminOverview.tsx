import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileDown,
  FileText,
  Images,
  LayoutGrid,
  Megaphone,
  PencilLine,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import { SchoolAccessWidget } from "@/components/widgets/SchoolAccessWidget";
import { SchoolOverviewWidget } from "@/components/widgets/SchoolOverviewWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useSchool } from "@/hooks/useSchools";
import {
  listSchoolEvents,
  listSchoolNews,
  listSchoolPages,
  listSchoolResources,
} from "@/lib/supabase/cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CmsStatus = "draft" | "pending_review" | "published" | "rejected";

interface ContentItem {
  id: string;
  type: string;
  title: string;
  status: CmsStatus;
  updatedAt: string;
}

const STATUS_BADGES: Record<CmsStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABELS: Record<CmsStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Rejected",
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  Page: LayoutGrid,
  News: FileText,
  Event: CalendarDays,
  Resource: FileDown,
};

const SectionHeading = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h2 className="caps-label text-muted-foreground">
      {title}
    </h2>
    {action}
  </div>
);

const WORKSPACE_LINKS = [
  { to: "/admin/content", label: "Content", desc: "Pages, news, events & gallery", icon: FileText },
  { to: "/admin/announcements", label: "Announcements", desc: "Send updates to your community", icon: Megaphone },
  { to: "/admin/academic", label: "Academic", desc: "Classes & subjects", icon: BookOpen },
  { to: "/admin/moderation", label: "Moderation", desc: "Review & approvals", icon: ShieldCheck },
  { to: "/admin/analytics", label: "Analytics", desc: "Engagement & growth", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", desc: "Profile, access & safety", icon: Settings },
];

const AdminOverview = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id ?? null;
  const { data: school } = useSchool(schoolId || "");
  const [coverFailed, setCoverFailed] = useState(false);

  const [counts, setCounts] = useState({
    published: 0,
    drafts: 0,
    pending: 0,
    scheduled: 0,
  });
  const [recent, setRecent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setContentLoading(false);
      return;
    }

    let cancelled = false;
    setContentLoading(true);

    Promise.all([
      listSchoolPages(schoolId),
      listSchoolNews(schoolId),
      listSchoolEvents(schoolId),
      listSchoolResources(schoolId),
    ])
      .then(([pages, news, events, resources]) => {
        if (cancelled) return;

        const now = Date.now();
        const all: { type: string; title: string; status: CmsStatus; updatedAt: string; publishAt?: string | null }[] = [
          ...pages.map((row) => ({
            type: "Page",
            title: row.title,
            status: row.status as CmsStatus,
            updatedAt: row.updated_at,
            publishAt: row.publish_at,
          })),
          ...news.map((row) => ({
            type: "News",
            title: row.title,
            status: row.status as CmsStatus,
            updatedAt: row.updated_at,
            publishAt: row.publish_at,
          })),
          ...events.map((row) => ({
            type: "Event",
            title: row.title,
            status: row.status as CmsStatus,
            updatedAt: row.updated_at,
            publishAt: row.publish_at,
          })),
          ...resources.map((row) => ({
            type: "Resource",
            title: row.title,
            status: row.status as CmsStatus,
            updatedAt: row.updated_at,
            publishAt: row.publish_at,
          })),
        ];

        setCounts({
          published: all.filter((row) => row.status === "published").length,
          drafts: all.filter((row) => row.status === "draft").length,
          pending: all.filter((row) => row.status === "pending_review").length,
          scheduled: all.filter(
            (row) => row.publishAt && new Date(row.publishAt).getTime() > now
          ).length,
        });
        setRecent(
          all
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 6)
            .map((row) => ({
              id: `${row.type}-${row.title}-${row.updatedAt}`,
              type: row.type,
              title: row.title,
              status: row.status,
              updatedAt: row.updatedAt,
            }))
        );
      })
      .catch((error) => {
        console.warn("Failed to load content pulse:", error);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const schoolName = school?.name || profile?.full_name || "Your school";
  const initial = schoolName.charAt(0).toUpperCase();
  const location = [school?.location, school?.country].filter(Boolean).join(", ");
  const cover = school?.cover_url && !coverFailed ? school.cover_url : null;

  const ledger = [
    { label: "Published", value: counts.published, icon: CheckCircle2, iconClass: "text-muted-foreground" },
    { label: "Drafts", value: counts.drafts, icon: PencilLine, iconClass: "text-muted-foreground" },
    { label: "Pending review", value: counts.pending, icon: Clock3, iconClass: "text-muted-foreground" },
    { label: "Scheduled", value: counts.scheduled, icon: CalendarClock, iconClass: "text-muted-foreground" },
  ];

  return (
    <SchoolAdminLayout>
      {/* School presence hero — 50/50 split: dark editorial text + full-bleed cover */}
      <section className="mb-8 grid overflow-hidden border border-border md:grid-cols-2">
        <div className="flex flex-col justify-center bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] md:p-10">
          <p className="caps-label text-[hsl(var(--primary-foreground)/0.62)]">School workspace</p>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-tight md:text-4xl">
            {schoolName}
          </h1>
          {location && (
            <p className="mt-4 max-w-md text-sm leading-6 text-[hsl(var(--primary-foreground)/0.8)]">
              {location}
            </p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            {schoolId && (
              <Button asChild variant="secondary" size="sm">
                <Link to={`/schools/${schoolId}`}>
                  View public page
                  <ExternalLink className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/admin/content">Edit content</Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-[240px] bg-[hsl(var(--secondary))] md:min-h-[360px]">
          {cover ? (
            <img
              src={cover}
              alt={`${schoolName} campus`}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl font-semibold text-white/25">
              {initial}
            </div>
          )}
        </div>
      </section>

      {/* Content pulse ledger */}
      <section aria-label="Content status" className="editorial-panel mb-8 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
          {ledger.map(({ label, value, icon: Icon, iconClass }) => (
            <div key={label} className="flex items-start gap-3 p-5">
              <Icon className={`mt-1 h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="caps-label text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                  {contentLoading ? "–" : value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <section>
            <SectionHeading
              title="School overview"
              action={
                <Link to="/admin/analytics" className="text-xs font-medium text-muted-foreground hover:text-primary">
                  All metrics
                </Link>
              }
            />
            <SchoolOverviewWidget defaultExpanded schoolId={schoolId} />
          </section>

          <section>
            <SectionHeading
              title="Recent content"
              action={
                <Link to="/admin/content" className="text-xs font-medium text-muted-foreground hover:text-primary">
                  Open CMS
                </Link>
              }
            />
            <div className="editorial-panel overflow-hidden">
              {contentLoading ? (
                <div className="space-y-3 p-4">
                  {[...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Images className="mx-auto mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    Nothing published yet. Start with your school&apos;s About page.
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-4">
                    <Link to="/admin/content">Open the CMS</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((item) => {
                    const TypeIcon = TYPE_ICONS[item.type] ?? FileText;
                    return (
                      <li key={item.id}>
                        <Link
                          to="/admin/content"
                          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <TypeIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            <span className="block text-xs text-muted-foreground">
                              {item.type} ·{" "}
                              {new Date(item.updatedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </span>
                          <Badge variant="outline" className={STATUS_BADGES[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-8">
          <section>
            <SectionHeading title="Access" />
            <SchoolAccessWidget defaultExpanded schoolId={schoolId} />
          </section>

          <section>
            <SectionHeading title="Workspace" />
            <div className="editorial-panel overflow-hidden">
              <ul className="divide-y divide-border">
                {WORKSPACE_LINKS.map(({ to, label, desc, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{desc}</span>
                      </span>
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </SchoolAdminLayout>
  );
};

export default AdminOverview;
