import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Shield, Users, BarChart } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: Shield,
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
  return (
    <section id="for-schools" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
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
                    className="flex gap-4 items-start animate-in fade-in slide-in-from-left"
                    style={{ animationDelay: `${index * 100}ms` }}
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

            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Get Started for Your School
              </Button>
            </Link>
          </div>

          <Card className="p-8 bg-[var(--gradient-card)] border-border/50">
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
                  className="flex items-center gap-3 animate-in fade-in slide-in-from-right"
                  style={{ animationDelay: `${index * 50}ms` }}
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