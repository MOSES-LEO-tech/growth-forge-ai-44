import { Card } from "@/components/ui/card";
import { useInView } from "@/hooks/useInView";
import { UserPlus, Upload, TrendingUp, Rocket } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Create Your Profile",
    description: "Sign up with your school credentials and set up your personalized profile based on your role and age."
  },
  {
    icon: Upload,
    number: "02",
    title: "Add Achievements",
    description: "Upload projects, events, and achievements. School admins verify authenticity for trust and credibility."
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Track Your Growth",
    description: "AI analyzes your activities and provides insights on skill development, balance, and opportunities."
  },
  {
    icon: Rocket,
    number: "04",
    title: "Unlock Opportunities",
    description: "Access scholarships, internships, and college opportunities with your verified digital portfolio."
  }
];

const HowItWorks = () => {
  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.3 });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="py-24">
      <div className="container mx-auto px-4">
        <div 
          ref={titleRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            titleInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple Steps to
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Success</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get started in minutes and begin documenting your incredible journey.
          </p>
        </div>

        <div 
          ref={stepsRef}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
        >
          {/* Connection lines for desktop */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-20" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card 
                key={step.number}
                className={`p-8 text-center relative hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-[var(--gradient-card)] border-border/50 ${
                  stepsInView 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ 
                  transitionDelay: stepsInView ? `${index * 150}ms` : '0ms'
                }}
              >
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center relative z-10">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
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