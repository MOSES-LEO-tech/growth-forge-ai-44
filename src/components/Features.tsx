import { Card } from "@/components/ui/card";
import {
  Award,
  Calendar,
  Compass,
  GraduationCap,
  LineChart,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Award,
    title: "Achievement Tracking",
    description: "Document verified achievements across academics, sports, arts, service, and leadership.",
  },
  {
    icon: Compass,
    title: "Guided Pathways",
    description: "Turn student activity into next-step suggestions for skills, scholarships, and enrichment.",
  },
  {
    icon: LineChart,
    title: "Skill Analytics",
    description: "Track growth across teamwork, leadership, problem-solving, creativity, and initiative.",
  },
  {
    icon: GraduationCap,
    title: "Digital Portfolio",
    description: "Create polished student profiles ready for applications, reviews, and opportunities.",
  },
  {
    icon: Calendar,
    title: "Event Gallery",
    description: "Keep a visual archive of school events, projects, performances, and milestones.",
  },
  {
    icon: Users,
    title: "Parent Dashboard",
    description: "Give families a clear, calm view of progress, achievements, and school activity.",
  },
  {
    icon: Shield,
    title: "School Verification",
    description: "Protect trust with admin-approved achievements, projects, and gallery publishing.",
  },
  {
    icon: Zap,
    title: "Role-Based Workspace",
    description: "Students, parents, teachers, and admins get focused dashboards built around their jobs.",
  },
];

const Features = () => {
  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.3 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });

  return (
    <section id="features" className="section-band py-24">
      <div className="container mx-auto px-4">
        <div
          ref={titleRef}
          className={`mx-auto mb-14 max-w-3xl text-center transition-all duration-700 ${
            titleInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="editorial-kicker mb-3">The workspace</p>
          <h2>Portfolio clarity for every role.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            A unified system for students, families, and schools to collect proof of growth without visual clutter.
          </p>
        </div>

        <div ref={gridRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className={`luxury-card p-6 transition-all duration-700 ${
                  gridInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: gridInView ? `${index * 70}ms` : "0ms" }}
              >
                <div className="flat-icon mb-5 h-12 w-12">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
