import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useInView } from "@/hooks/useInView";
import { CheckCircle2, School, Users, BarChart, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Verified Achievements",
    description: "Maintain authenticity with admin-approved verification system"
  },
  {
    icon: Users,
    title: "Student Engagement",
    description: "Increase participation in extracurricular activities and events"
  },
  {
    icon: BarChart,
    title: "Analytics Dashboard",
    description: "Track student growth and program effectiveness school-wide"
  }
];

const ForSchools = () => {
  const { ref: contentRef, isInView: contentInView } = useInView({ threshold: 0.2 });

  return (
    <section id="for-schools" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div 
          ref={contentRef}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          <div 
            className={`transition-all duration-1000 ${
              contentInView 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 -translate-x-8'
            }`}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Built for
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Modern Schools</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Empower your institution with tools to showcase student excellence, manage events, and provide verified credentials that matter.
            </p>

            <div className="space-y-6 mb-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={benefit.title}
                    className={`flex gap-4 items-start transition-all duration-500 ${
                      contentInView 
                        ? 'opacity-100 translate-x-0' 
                        : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ 
                      transitionDelay: contentInView ? `${200 + index * 100}ms` : '0ms'
                    }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div 
              className={`transition-all duration-700 ${
                contentInView 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-4'
              }`}
              style={{ 
                transitionDelay: contentInView ? '600ms' : '0ms'
              }}
            >
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8">
                  Get Started for Your School
                </Button>
              </Link>
            </div>
          </div>

          <Card 
            className={`p-8 bg-[var(--gradient-card)] border-border/50 transition-all duration-1000 ${
              contentInView 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-8'
            }`}
            style={{ 
              transitionDelay: contentInView ? '300ms' : '0ms'
            }}
          >
            <h3 className="text-2xl font-bold mb-6">What's Included</h3>
            <ul className="space-y-4">
              {[
                "Unlimited student accounts",
                "Event management & media gallery",
                "Admin verification dashboard",
                "Parent access portal",
                "Analytics and reporting",
                "Secure data storage",
                "Custom branding options",
                "Dedicated support team"
              ].map((feature, index) => (
                <li 
                  key={feature}
                  className={`flex items-center gap-3 transition-all duration-400 ${
                    contentInView 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-4'
                  }`}
                  style={{ 
                    transitionDelay: contentInView ? `${500 + index * 50}ms` : '0ms'
                  }}
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
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