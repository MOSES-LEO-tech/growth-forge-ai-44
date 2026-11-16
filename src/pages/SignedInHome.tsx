import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getShowcase } from "@/lib/supabase/showcase";
import { formatNullable } from "@/lib/numeric";
import {
  ArrowUpRight,
  Award,
  FolderKanban,
  GraduationCap,
  Megaphone,
  School as SchoolIcon,
} from "lucide-react";

const ROLE_COPY: Record<string, { label: string; heading: string; cta: { label: string; to: string } }> = {
  student: {
    label: "Student workspace",
    heading: "Your portfolio",
    cta: { label: "Open my portfolio", to: "/dashboard" },
  },
  parent: {
    label: "Parent workspace",
    heading: "Your child's progress",
    cta: { label: "Open parent workspace", to: "/parent" },
  },
  teacher: {
    label: "Teacher workspace",
    heading: "Your classes",
    cta: { label: "Open teacher workspace", to: "/teacher" },
  },
  admin: {
    label: "School admin",
    heading: "Your school console",
    cta: { label: "Open admin console", to: "/admin/overview" },
  },
  super_admin: {
    label: "Platform admin",
    heading: "Platform console",
    cta: { label: "Open admin console", to: "/admin/overview" },
  },
};

const firstName = (fullName?: string | null) => {
  if (!fullName) return "there";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
};

/**
 * The signed-in home page.
 *
 * Guests keep the marketing page; anyone signed in lands here instead: the
 * schools on the platform, work students have had approved, awards the school
 * has verified, and (for staff) a short path into the console.
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

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pb-16 pt-24">
        {/* Greeting */}
        <section className="mb-10">
          <p className="editorial-kicker mb-2">{copy.label}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {copy.heading}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Welcome back, {firstName(profile?.full_name)}. Here is what the schools and students on
            Milestone have published.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link to={copy.cta.to}>
                {copy.cta.label}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/scholarships">
                <GraduationCap className="h-4 w-4" />
                Scholarships
              </Link>
            </Button>
          </div>
        </section>

        {/* Staff shortcuts — the only admin paths from this page */}
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
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
              </Link>
            ))}
          </section>
        )}

        {/* Schools */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <SchoolIcon className="h-5 w-5 text-primary" />
                Schools
              </h2>
              <p className="text-sm text-muted-foreground">Verified schools on the platform.</p>
            </div>
            <Link to="/schools" className="text-sm font-medium text-muted-foreground hover:text-primary">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Schools could not be loaded right now.
            </p>
          ) : schools.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No schools have been approved yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schools.map((school) => (
                <Link
                  key={school.id}
                  to={`/schools/${school.id}`}
                  className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={`${school.name} badge`} className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {school.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">{school.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[school.location, school.country].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNullable(school.student_count)} student{school.student_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Student work */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <FolderKanban className="h-5 w-5 text-primary" />
              Student work
            </h2>
            <p className="text-sm text-muted-foreground">
              Projects a teacher or school admin has reviewed and approved.
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No approved student projects yet. Work appears here once staff approve it under
              Moderation.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col gap-2 p-5">
                    <p className="line-clamp-2 font-medium">{project.title}</p>
                    {project.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">{project.description}</p>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Awards */}
        <section>
          <div className="mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Award className="h-5 w-5 text-primary" />
              Awards
            </h2>
            <p className="text-sm text-muted-foreground">Achievements the school has verified.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(2)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : awards.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No verified awards yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {awards.map((award) => (
                <li key={award.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-800">
                    <Award className="h-4 w-4" />
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
