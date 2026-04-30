import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Landmark, UsersRound } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { brand } from "@/lib/brand";

const stats = [
  { key: "studentPortfolios", label: "Student portfolios", source: "profiles marked as students" },
  { key: "projectsRecorded", label: "Projects recorded", source: "active project records" },
  { key: "partnerSchools", label: "Partner schools", source: "schools in the directory" },
  { key: "awardsVerified", label: "Awards verified", source: "verified achievement records" },
] as const;

const trustSignals = [
  { icon: BookOpenCheck, label: "Portfolio ready" },
  { icon: Landmark, label: "School verified" },
  { icon: UsersRound, label: "Parent friendly" },
];

const Hero = () => {
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: statsRef, isInView: statsInView } = useInView({ threshold: 0.3 });
  const { data: platformStats, isLoading: statsLoading, isError: statsError } = usePlatformStats();

  const formatStat = (key: (typeof stats)[number]["key"]) => {
    if (statsLoading) return "...";
    if (statsError || !platformStats) return "-";

    return new Intl.NumberFormat().format(platformStats[key]);
  };

  return (
    <section className="relative min-h-[82vh] overflow-hidden border-b bg-foreground pt-16 text-white">
      <img
        src={brand.heroImage}
        alt="Students gathered on a school campus lawn"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/60" />

      <div ref={heroRef} className="container relative z-10 mx-auto flex min-h-[calc(82vh-4rem)] flex-col justify-center px-4 py-20">
        <div className="max-w-4xl">
          <div
            className={`editorial-kicker mb-5 text-white/74 transition-all duration-700 ${
              heroInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            Student portfolios for modern schools
          </div>

          <h1
            className={`max-w-4xl text-white transition-all duration-700 ${
              heroInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
            style={{ transitionDelay: heroInView ? "80ms" : "0ms" }}
          >
            {brand.name}
          </h1>

          <p
            className={`mt-6 max-w-2xl text-lg leading-8 text-white/82 md:text-xl transition-all duration-700 ${
              heroInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
            style={{ transitionDelay: heroInView ? "160ms" : "0ms" }}
          >
            {brand.description}
          </p>

          <div
            className={`mt-9 flex flex-col gap-3 sm:flex-row transition-all duration-700 ${
              heroInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
            style={{ transitionDelay: heroInView ? "240ms" : "0ms" }}
          >
            <Button size="lg" asChild className="bg-white text-[#171717] hover:bg-white/90">
              <Link to="/auth">
                Start a Portfolio
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/40 bg-transparent text-white hover:bg-white hover:text-foreground"
            >
              <Link to="/schools">Explore Schools</Link>
            </Button>
          </div>
        </div>

        <div
          className={`mt-12 flex flex-wrap gap-3 transition-all duration-700 ${
            heroInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          style={{ transitionDelay: heroInView ? "320ms" : "0ms" }}
        >
          {trustSignals.map((signal) => (
            <div key={signal.label} className="flex items-center gap-2 rounded-md border border-white/18 bg-white/10 px-3 py-2 text-sm text-white/88 backdrop-blur-sm">
              <signal.icon className="h-4 w-4" />
              {signal.label}
            </div>
          ))}
        </div>

        <div ref={statsRef} className="relative mt-16 grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/18 bg-white/18 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`bg-[#141414]/72 p-5 transition-all duration-700 ${
                statsInView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
              style={{ transitionDelay: statsInView ? `${index * 80}ms` : "0ms" }}
              title={`Live count from ${stat.source}`}
            >
              <div className="text-2xl font-semibold md:text-3xl">{formatStat(stat.key)}</div>
              <div className="mt-1 text-sm text-white/66">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
