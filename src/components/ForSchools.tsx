import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shield, Users, BarChart } from "lucide-react";
import { Link } from "react-router-dom";
import { useInView } from "@/hooks/useInView";

const benefits = [
  {
    icon: Shield,
    title: "Verified Achievements",
    description: "Keep records credible with admin-approved verification and publishing controls.",
  },
  {
    icon: Users,
    title: "Student Engagement",
    description: "Make extracurricular, project, and event participation visible to families.",
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description: "Track student growth and program momentum across the school community.",
  },
];

const included = [
  "Unlimited student accounts",
  "Event management and media gallery",
  "Admin verification dashboard",
  "Parent access portal",
  "Analytics and reporting",
  "Secure data storage",
  "Custom branding options",
  "Dedicated support team",
];

const ForSchools = () => {
  const { ref: leftRef, isInView: leftInView } = useInView({ threshold: 0.2 });
  const { ref: rightRef, isInView: rightInView } = useInView({ threshold: 0.2 });

  return (
    <section id="for-schools" className="section-band py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div
            ref={leftRef}
            className={`transition-all duration-700 ${
              leftInView ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
            }`}
          >
            <p className="editorial-kicker mb-3">For schools</p>
            <h2>Modern records without the institutional coldness.</h2>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Give administrators and teachers a clear way to showcase student excellence while keeping review, privacy, and publishing controlled.
            </p>

            <div className="my-8 space-y-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className={`flex gap-4 transition-all duration-700 ${
                      leftInView ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
                    }`}
                    style={{ transitionDelay: leftInView ? `${index * 90}ms` : "0ms" }}
                  >
                    <div className="flat-icon h-12 w-12 shrink-0">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button size="lg" asChild>
              <Link to="/auth">Get Started for Your School</Link>
            </Button>
          </div>

          <Card
            ref={rightRef}
            className={`luxury-card p-7 transition-all duration-700 ${
              rightInView ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
            }`}
          >
            <h3 className="mb-6 text-2xl">Included</h3>
            <ul className="space-y-4">
              {included.map((feature, index) => (
                <li
                  key={feature}
                  className={`flex items-center gap-3 text-sm transition-all duration-700 ${
                    rightInView ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                  }`}
                  style={{ transitionDelay: rightInView ? `${index * 45}ms` : "0ms" }}
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ForSchools;
