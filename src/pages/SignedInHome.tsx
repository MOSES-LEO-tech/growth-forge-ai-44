import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getShowcase, type ShowcaseSchool, type ShowcaseProject } from "@/lib/supabase/showcase";
import { formatNullable } from "@/lib/numeric";
import { heroTiles } from "@/lib/mediaTiles";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  FolderKanban,
  GraduationCap,
  Megaphone,
  School as SchoolIcon,
} from "lucide-react";

const ROLE_COPY: Record<string, { label: string; heading: string; cta: { label: string; to: string } }> = {
  student: {
    label: "Signed in as a student",
    heading: "Your work, on the record",
    cta: { label: "Open my portfolio", to: "/dashboard" },
  },
  parent: {
    label: "Signed in as a parent",
    heading: "What your child is building",
    cta: { label: "Open parent workspace", to: "/parent" },
  },
  teacher: {
    label: "Signed in as a teacher",
    heading: "Your classes, at a glance",
    cta: { label: "Open teacher workspace", to: "/teacher" },
  },
  admin: {
    label: "Signed in as a school admin",
    heading: "Your school, in view",
    cta: { label: "Open admin console", to: "/admin/overview" },
  },
  super_admin: {
    label: "Signed in as a platform admin",
    heading: "The whole platform",
    cta: { label: "Open admin console", to: "/admin/overview" },
  },
};

const firstName = (fullName?: string | null) => {
  if (!fullName) return "there";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
};

/**
 * Cover mosaic for the signed-in hero.
 *
 * Only real media is drawn: a school's gallery photo (or badge), then approved
 * project covers. Slots with nothing to show carry a real label instead of a
 * stock photograph, so the hero never looks emptier — or more populated — than
 * the platform actually is.
 */
function CoverWall({
  schools,
  projects,
}: {
  schools: ShowcaseSchool[];
  projects: ShowcaseProject[];
}) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const tiles = useMemo(() => heroTiles(schools, projects, 3), [schools, projects]);
  const visible = tiles.filter((tile) => !broken[tile.id]);

  if (visible.length === 0) {
    const school = schools[0];
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.06] p-6">
        <p className="text-sm font-medium text-foreground">
          {school ? school.name : "Your school’s page lives here"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {school
            ? "Once the school adds photos to its gallery, the newest one is shown here."
            : "School photos and approved student work appear here as soon as they are published."}
        </p>
        <div className="mt-5 flex items-end gap-1" aria-hidden="true">
          {[38, 62, 46, 78, 54].map((height, index) => (
            <span
              key={index}
              className="w-2 rounded-full bg-primary/25"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const [lead, ...rest] = visible;

  return (
    <div className="grid h-full min-h-[260px] grid-cols-2 grid-rows-2 gap-2.5">
      <figure className="relative col-span-1 row-span-2 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60">
        <img
          src={lead.url}
          alt={lead.caption}
          className="h-full w-full object-cover"
          loading="eager"
          onError={() => setBroken((current) => ({ ...current, [lead.id]: true }))}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent"
        />
        <figcaption className="absolute inset-x-3 bottom-3 text-xs font-medium leading-tight text-white">
          {lead.caption}
          {lead.subcaption && <span className="mt-0.5 block font-normal opacity-80">{lead.subcaption}</span>}
        </figcaption>
      </figure>

      {rest.map((tile) => (
        <figure key={tile.id} className="relative overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60">
          <img
            src={tile.url}
            alt={tile.caption}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setBroken((current) => ({ ...current, [tile.id]: true }))}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent"
          />
          <figcaption className="absolute inset-x-2.5 bottom-2.5 text-[11px] font-medium leading-tight text-white">
            {tile.caption}
          </figcaption>
        </figure>
      ))}

      {rest.length < 2 && (
        <div className="flex flex-col justify-center rounded-2xl border border-primary/15 bg-primary/[0.06] p-3">
          <p className="text-[11px] font-medium text-foreground">Approved work</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {projects.length > 0
              ? `${projects.length} reviewed project${projects.length === 1 ? "" : "s"} published`
              : "Nothing reviewed yet"}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The signed-in home page.
 *
 * Guests keep the marketing page; anyone signed in lands here instead. The hero
 * shows the platform's own published covers, then the three real surfaces:
 * schools, approved student work, verified awards.
 */
const SignedInHome = () => {
  const { profile, userRole } = useAuth();
  const role = userRole ?? "student";
  const copy = ROLE_COPY[role] ?? ROLE_COPY.student;
  const isStaff = role === "admin" || role === "super_admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["showcase", 6],
    queryFn: () => getShowcase(6),
    staleTime: 2 * 60 * 1000,
  });

  const schools = data?.schools ?? [];
  const projects = data?.projects ?? [];
  const awards = data?.awards ?? [];

  const atAGlance = [
    { label: "Schools", value: schools.length },
    { label: "Student work", value: projects.length },
    { label: "Verified awards", value: awards.length },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pb-20 pt-24">
        {/* Hero ------------------------------------------------------------ */}
        <section className="dashboard-hero overflow-hidden p-0">
          <div className="grid gap-6 p-6 md:grid-cols-12 md:items-center md:gap-8 md:p-8">
            <div className="md:col-span-7">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
                {copy.label}
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight md:text-[2.9rem]">
                {copy.heading}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Welcome back, {firstName(profile?.full_name)}. Approved projects, verified awards and
                school galleries from across Milestone — all in one place.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Button asChild size="lg" className="gap-2">
                  <Link to={copy.cta.to}>
                    {copy.cta.label}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to="/scholarships">
                    <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    Scholarships
                  </Link>
                </Button>
              </div>

              <dl className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                {atAGlance.map((item) => (
                  <div key={item.label} className="min-w-[92px]">
                    <dt className="text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums leading-tight">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="md:col-span-5">
              {isLoading ? (
                <Skeleton className="h-[260px] w-full rounded-2xl" />
              ) : (
                <CoverWall schools={schools} projects={projects} />
              )}
            </div>
          </div>
        </section>

        {/* Staff shortcuts ------------------------------------------------ */}
        {isStaff && (
          <section className="mb-10 grid gap-3 sm:grid-cols-3">
            {[
              { to: "/admin/overview", label: "Admin console", desc: "Approvals and school settings", icon: SchoolIcon },
              { to: "/admin/settings", label: "Badge & gallery", desc: "How your school appears", icon: GraduationCap },
              { to: "/admin/announcements", label: "Announcements", desc: "Message students and parents", icon: Megaphone },
            ].map(({ to, label, desc, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="rounded-lg bg-muted p-2 text-muted-foreground group-hover:text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* Schools -------------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Schools</h2>
              <p className="text-sm text-muted-foreground">Verified schools on the platform.</p>
            </div>
            <Link
              to="/schools"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Schools could not be loaded right now.
            </p>
          ) : schools.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No schools have been approved yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => (
                <Link
                  key={school.id}
                  to={`/schools/${school.id}`}
                  className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {school.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={`${school.name} badge`}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {school.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover:text-primary">{school.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[school.location, school.country].filter(Boolean).join(", ") || "Location not set"}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatNullable(school.student_count)} student
                      {school.student_count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Student work --------------------------------------------------- */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <FolderKanban className="h-5 w-5 text-primary" aria-hidden="true" />
              Student work
            </h2>
            <p className="text-sm text-muted-foreground">
              Projects a teacher or school admin has reviewed and approved.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-56 rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No approved student projects yet. Work appears here once staff approve it under Moderation.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {project.cover_url ? (
                      <img
                        src={project.cover_url}
                        alt={project.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full flex-col justify-between p-4">
                        <span className="text-xs text-muted-foreground">No cover image</span>
                        <span className="text-lg font-semibold leading-tight text-foreground">
                          {project.title}
                        </span>
                      </div>
                    )}
                    {typeof project.media_count === "number" && project.media_count > 1 && (
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                        {project.media_count} files
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="line-clamp-2 font-medium">{project.title}</p>
                    {project.description && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-auto pt-2">
                      <p className="text-xs text-muted-foreground">
                        {project.student}
                        {project.school_name ? ` · ${project.school_name}` : ""}
                      </p>
                      {project.tags && project.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Awards --------------------------------------------------------- */}
        <section>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Award className="h-5 w-5 text-primary" aria-hidden="true" />
              Awards
            </h2>
            <p className="text-sm text-muted-foreground">Achievements the school has verified.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : awards.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No verified awards yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {awards.map((award) => (
                <li
                  key={award.id}
                  className="flex items-start gap-3 rounded-xl border border-l-2 border-l-primary/40 bg-card p-4"
                >
                  <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                    <Award className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{award.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[award.category, award.student, award.school_name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SignedInHome;
