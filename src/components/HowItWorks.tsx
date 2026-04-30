import { Card } from "@/components/ui/card";
import { UserPlus, Upload, TrendingUp, Rocket } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Create Your Profile",
    description: "Start with a role-based profile that reflects the student, parent, teacher, or school view.",
  },
  {
    icon: Upload,
    number: "02",
    title: "Add Proof",
    description: "Upload projects, events, certificates, and achievements with context and media.",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Track Growth",
    description: "Review patterns across skills, participation, verification, and portfolio completeness.",
  },
  {
    icon: Rocket,
    number: "04",
    title: "Open Opportunities",
    description: "Use the verified portfolio for scholarships, applications, school reports, and recognition.",
  },
];

const HowItWorks = () => {
  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.3 });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div
          ref={titleRef}
          className={`mx-auto mb-14 max-w-3xl text-center transition-all duration-700 ${
            titleInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="editorial-kicker mb-3">Method</p>
          <h2>Simple enough for families, rigorous enough for schools.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            The flow keeps documentation, review, and discovery close together so portfolios stay current.
          </p>
        </div>

        <div ref={stepsRef} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.number}
                className={`luxury-card p-6 transition-all duration-700 ${
                  stepsInView ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
                }`}
                style={{ transitionDelay: stepsInView ? `${index * 100}ms` : "0ms" }}
              >
                <div className="mb-7 flex items-center justify-between">
                  <div className="flat-icon h-14 w-14">
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{step.number}</span>
                </div>
                <h3 className="mb-3 text-xl">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
