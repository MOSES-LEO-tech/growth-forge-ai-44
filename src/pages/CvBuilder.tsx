import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errors";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Printer,
  RotateCw,
  ShieldCheck,
} from "lucide-react";

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  status: string | null;
  approval_status: string | null;
  start_date: string | null;
  end_date: string | null;
  updated_at: string | null;
};

type AchievementRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  date_earned: string | null;
  verified: boolean | null;
  approval_status: string | null;
};

const SECTIONS = [
  { key: "summary", label: "Profile summary" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "awards", label: "Awards" },
  { key: "skills", label: "Skills and activities" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const formatRange = (start: string | null, end: string | null, fallback: string | null) => {
  const fmt = (value: string | null) =>
    value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
  const from = fmt(start);
  const to = fmt(end);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Ended ${to}`;
  return fmt(fallback);
};

/**
 * CV builder.
 *
 * Deliberately local: the page is print-optimised and the browser's own
 * "Save as PDF" produces the file. Nothing about the student's CV is uploaded,
 * stored, or sent to an edge function — the data is already in their own rows.
 *
 * Default is verified work only. A CV that claims unapproved work would
 * misrepresent the student the moment a school checks.
 *
 * Layout: a control rail beside a true A4 sheet (794px at 96dpi). The sheet is
 * the product; the rail only edits what goes on it. Print shows the sheet alone.
 */
const CvBuilder = () => {
  const { profile, user } = useAuth();
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    summary: true,
    education: true,
    projects: true,
    awards: true,
    skills: true,
  });
  const [includePending, setIncludePending] = useState(false);

  const { data: school } = useQuery({
    queryKey: ["school", profile?.school_id],
    enabled: Boolean(profile?.school_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("name,location,country")
        .eq("id", profile?.school_id as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["cv-projects", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,description,tags,status,approval_status,start_date,end_date,updated_at")
        .eq("user_id", user?.id as string)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  const {
    data: achievements,
    isLoading: achievementsLoading,
    error: achievementsError,
    refetch: refetchAchievements,
  } = useQuery({
    queryKey: ["cv-achievements", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,title,description,category,date_earned,verified,approval_status")
        .eq("user_id", user?.id as string)
        .order("date_earned", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AchievementRow[];
    },
  });

  const approvedProjects = useMemo(
    () => (projects ?? []).filter((p) => p.approval_status === "approved"),
    [projects]
  );
  const pendingProjects = useMemo(
    () => (projects ?? []).filter((p) => p.approval_status !== "approved"),
    [projects]
  );
  const verifiedAwards = useMemo(() => (achievements ?? []).filter((a) => a.verified), [achievements]);
  const pendingAwards = useMemo(() => (achievements ?? []).filter((a) => !a.verified), [achievements]);

  const shownProjects = includePending ? [...approvedProjects, ...pendingProjects] : approvedProjects;
  const shownAwards = includePending ? [...verifiedAwards, ...pendingAwards] : verifiedAwards;

  const skills = useMemo(() => {
    const fromProjects = shownProjects.flatMap((p) => p.tags ?? []);
    const fromProfile = [...(profile?.subjects ?? []), ...(profile?.clubs ?? []), ...(profile?.interests ?? [])];
    return Array.from(new Set([...fromProjects, ...fromProfile].map((s) => s.trim()).filter(Boolean))).slice(0, 14);
  }, [shownProjects, profile]);

  const loading = projectsLoading || achievementsLoading;
  const queryError = projectsError ?? achievementsError;
  const hasContent = shownProjects.length > 0 || shownAwards.length > 0;

  const toggle = (key: SectionKey) => setSections((current) => ({ ...current, [key]: !current[key] }));

  const schoolLine = [school?.name, [school?.location, school?.country].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");

  const educationLine =
    [profile?.class_name, profile?.grade_level, profile?.education_system].filter(Boolean).join(" · ") ||
    "Class not set";

  const hasSchool = Boolean(school?.name || profile?.grade_level || profile?.class_name);

  /** How much material each section actually has — drives the rail counts. */
  const counts: Record<SectionKey, number> = {
    summary: profile?.bio ? 1 : 0,
    education: hasSchool ? 1 : 0,
    projects: shownProjects.length,
    awards: shownAwards.length,
    skills: skills.length,
  };

  const retry = () => {
    void refetchProjects();
    void refetchAchievements();
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-[1200px] px-4 pb-20 pt-20 print:max-w-none print:p-0">
        {/* Page header ------------------------------------------------------ */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Document</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Curriculum vitae</h1>
            <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">
              Built from your profile, approved projects and verified awards. Everything is generated in this
              browser — nothing is uploaded.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <Button onClick={() => window.print()} className="gap-2" disabled={loading}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          {/* Control rail -------------------------------------------------- */}
          <aside className="space-y-3 lg:sticky lg:top-20 print:hidden">
            <section aria-labelledby="sections-heading" className="rounded-xl border bg-card p-4">
              <h2 id="sections-heading" className="text-sm font-medium text-foreground">
                Sections
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Choose what appears in the document.</p>

              <ul className="mt-3 space-y-0.5">
                {SECTIONS.map(({ key, label }) => {
                  const count = counts[key];
                  const empty = count === 0;
                  const on = sections[key];
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${label}: ${empty ? "nothing to show yet" : `${count} item${count === 1 ? "" : "s"}`}`}
                        disabled={empty}
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                              on && !empty
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {on && !empty && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                          <span className="truncate">{label}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {empty ? "None yet" : count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Inclusion rule ---------------------------------------------- */}
            <section className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="include-pending" className="text-sm font-medium text-foreground">
                    Work awaiting review
                  </Label>
                  <p id="include-pending-help" className="mt-1 text-xs leading-5 text-muted-foreground">
                    Each item is labelled in the document, so it cannot pass as approved.
                  </p>
                </div>
                <Switch
                  id="include-pending"
                  checked={includePending}
                  onCheckedChange={setIncludePending}
                  aria-describedby="include-pending-help"
                />
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Verified work only by default.
              </p>
            </section>

            {/* What's inside ------------------------------------------------ */}
            <section aria-labelledby="included-heading" className="rounded-xl border bg-card p-4">
              <h2 id="included-heading" className="text-sm font-medium text-foreground">
                Inside this version
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Projects</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {shownProjects.length}{" "}
                    <span className="font-normal text-muted-foreground">
                      of {approvedProjects.length} approved
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Awards</dt>
                  <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                    {shownAwards.length}{" "}
                    <span className="font-normal text-muted-foreground">of {verifiedAwards.length} verified</span>
                  </dd>
                </div>
              </dl>
              <p className="mt-3 flex items-start gap-1.5 border-t pt-3 text-xs leading-5 text-muted-foreground">
                <Printer className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Print at A4, margins “default”, headers and footers off.
              </p>
            </section>
          </aside>

          {/* The document --------------------------------------------------- */}
          <div className="min-w-0">
            {queryError && (
              <div
                role="alert"
                className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {getErrorMessage(queryError, "Part of your CV could not be loaded.")}
                </p>
                <Button size="sm" variant="outline" onClick={retry} className="gap-1.5">
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            )}

            <article
              aria-busy={loading}
              className="cv-document mx-auto w-full max-w-[794px] rounded-sm bg-white px-14 py-16 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_16px_40px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none print:ring-0"
            >
              {loading ? (
                <div className="space-y-3" aria-hidden="true">
                  <div className="h-8 w-2/5 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="mt-10 space-y-2">
                    <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-11/12 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  </div>
                  <div className="mt-8 space-y-2">
                    <div className="h-2.5 w-28 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-10/12 animate-pulse rounded bg-slate-100" />
                  </div>
                  <span className="sr-only">Building your CV…</span>
                </div>
              ) : (
                <>
                  <header className="border-b border-slate-900/10 pb-5">
                    <h2 className="text-[30px] font-semibold leading-[1.1] tracking-tight">
                      {profile?.full_name || "Your name"}
                    </h2>
                    <p className="mt-1.5 text-[12.5px] leading-5 text-slate-600">
                      {[profile?.email, schoolLine].filter(Boolean).join(" · ") ||
                        "Add your school and email in Settings"}
                    </p>
                  </header>

                  {!hasContent && (
                    <div className="mt-7 rounded border border-dashed border-slate-300 bg-slate-50/60 px-4 py-4">
                      <p className="text-[13px] font-medium text-slate-800">No verified work yet</p>
                      <p className="mt-1 text-[12.5px] leading-5 text-slate-600">
                        Approved projects and verified awards appear here automatically. Add a project, then ask
                        your school to review it.
                      </p>
                    </div>
                  )}

                  {sections.summary && profile?.bio && (
                    <section className="mt-7 break-inside-avoid">
                      <h3 className="border-b border-slate-900/10 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Profile
                      </h3>
                      <p className="mt-2.5 whitespace-pre-line text-[13px] leading-6 text-slate-700">{profile.bio}</p>
                    </section>
                  )}

                  {sections.education && hasSchool && (
                    <section className="mt-7 break-inside-avoid">
                      <h3 className="border-b border-slate-900/10 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Education
                      </h3>
                      <div className="mt-2.5">
                        <p className="text-[13px] font-medium leading-6">{school?.name ?? "School not set"}</p>
                        <p className="text-[12.5px] leading-5 text-slate-600">{educationLine}</p>
                      </div>
                    </section>
                  )}

                  {sections.projects && shownProjects.length > 0 && (
                    <section className="mt-7 break-inside-avoid">
                      <h3 className="border-b border-slate-900/10 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Projects
                      </h3>
                      <ul className="mt-3 space-y-4">
                        {shownProjects.map((project) => (
                          <li key={project.id} className="break-inside-avoid">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
                              <p className="text-[13px] font-medium leading-5">{project.title}</p>
                              <p className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">
                                {formatRange(project.start_date, project.end_date, project.updated_at)}
                              </p>
                            </div>
                            {project.description && (
                              <p className="mt-0.5 text-[13px] leading-6 text-slate-700">{project.description}</p>
                            )}
                            {(project.approval_status !== "approved" || (project.tags ?? []).length > 0) && (
                              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-slate-500">
                                {project.approval_status !== "approved" && (
                                  <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-amber-900">
                                    Awaiting review
                                  </span>
                                )}
                                {(project.tags ?? []).length > 0 && (
                                  <span>{(project.tags ?? []).slice(0, 5).join(" · ")}</span>
                                )}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {sections.awards && shownAwards.length > 0 && (
                    <section className="mt-7 break-inside-avoid">
                      <h3 className="border-b border-slate-900/10 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Awards
                      </h3>
                      <ul className="mt-3 space-y-2.5">
                        {shownAwards.map((award) => (
                          <li key={award.id} className="break-inside-avoid">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
                              <p className="text-[13px] leading-5">
                                <span className="font-medium">{award.title}</span>
                                {award.category ? <span className="text-slate-600"> — {award.category}</span> : null}
                              </p>
                              {award.date_earned && (
                                <p className="whitespace-nowrap text-[11px] tabular-nums text-slate-500">
                                  {new Date(award.date_earned).getFullYear()}
                                </p>
                              )}
                            </div>
                            {!award.verified && (
                              <p className="mt-1">
                                <span className="rounded-sm border border-amber-300 bg-amber-50 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-amber-900">
                                  Not yet verified
                                </span>
                              </p>
                            )}
                            {award.description && (
                              <p className="mt-0.5 text-[12.5px] leading-6 text-slate-600">{award.description}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {sections.skills && skills.length > 0 && (
                    <section className="mt-7 break-inside-avoid">
                      <h3 className="border-b border-slate-900/10 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Skills and activities
                      </h3>
                      <p className="mt-2.5 text-[13px] leading-6 text-slate-700">{skills.join(" · ")}</p>
                    </section>
                  )}

                  {includePending && shownProjects.length > approvedProjects.length && (
                    <p className="mt-8 border-t border-slate-900/10 pt-2.5 text-[10.5px] leading-5 text-slate-500">
                      Items labelled “Awaiting review” have not been approved by the school and are marked for
                      transparency.
                    </p>
                  )}
                </>
              )}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CvBuilder;
