import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Upload, TrendingUp, Rocket, Award, Users, BookOpen, Calendar, MessageSquare, Shield, Brain, Target } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const HowItWorks = () => {
  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.1, triggerOnce: true });
  const { ref: stepsRef, isInView: stepsInView } = useInView({ threshold: 0.1, triggerOnce: true });
  const { ref: featuresRef, isInView: featuresInView } = useInView({ threshold: 0.1, triggerOnce: true });

  const steps = [
    {
      icon: UserPlus,
      number: "01",
      title: "Create Your Profile",
      description: "Sign up with your school credentials and set up your personalized profile based on your role (Student, Parent, Teacher, or Admin). Complete your profile with relevant information to unlock all features."
    },
    {
      icon: Upload,
      number: "02",
      title: "Add Achievements & Projects",
      description: "Upload your projects, events, achievements, and extracurricular activities. School administrators verify authenticity to build trust and credibility. Organize everything in your digital portfolio."
    },
    {
      icon: TrendingUp,
      number: "03",
      title: "Track Growth with AI",
      description: "Our AI analyzes your activities and provides personalized insights on skill development, balance, and opportunities. Get recommendations for improvement and see your progress visualized."
    },
    {
      icon: Rocket,
      number: "04",
      title: "Unlock Opportunities",
      description: "Access matched scholarships, internships, and college opportunities with your verified digital portfolio. Share your achievements with institutions and employers to stand out."
    }
  ];

  const features = [
    {
      icon: Award,
      title: "Digital Portfolio",
      description: "Build a comprehensive showcase of all your academic and extracurricular achievements in one place.",
      roles: ["Student"]
    },
    {
      icon: Brain,
      title: "AI Study Buddy",
      description: "Get personalized help with homework, study tips, and academic guidance from our intelligent assistant.",
      roles: ["Student", "Parent"]
    },
    {
      icon: Target,
      title: "Skill Tracking",
      description: "Monitor skill development across leadership, teamwork, technical skills, and more with detailed analytics.",
      roles: ["Student", "Teacher"]
    },
    {
      icon: Users,
      title: "Collaboration Tools",
      description: "Work together on projects, share resources, and communicate with teachers and classmates seamlessly.",
      roles: ["Student", "Teacher"]
    },
    {
      icon: BookOpen,
      title: "Resource Library",
      description: "Access curated learning materials, study guides, and educational content tailored to your curriculum.",
      roles: ["Student", "Parent", "Teacher"]
    },
    {
      icon: Calendar,
      title: "Event Management",
      description: "Stay updated with school events, competitions, deadlines, and extracurricular activities through an integrated calendar.",
      roles: ["All Roles"]
    },
    {
      icon: MessageSquare,
      title: "Parent-Teacher Communication",
      description: "Direct messaging between parents and teachers for seamless updates on student progress and concerns.",
      roles: ["Parent", "Teacher"]
    },
    {
      icon: Shield,
      title: "Verified Achievements",
      description: "School-verified achievements ensure authenticity and build credibility for scholarship and college applications.",
      roles: ["Student", "Admin"]
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Hero Section */}
        <div 
          ref={titleRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">MILESTONE</span> Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your complete guide to using MILESTONE - from creating your profile to unlocking life-changing opportunities
          </p>
        </div>

        {/* Steps Section */}
        <div 
          ref={stepsRef}
          className="mb-24"
        >
          <h2 className="text-3xl font-bold text-center mb-12">Getting Started in 4 Simple Steps</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className={`hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent transition-opacity duration-1000 ${
              stepsInView ? 'opacity-20' : 'opacity-0'
            }`} />
            
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card 
                  key={step.number}
                  className={`p-8 text-center relative hover:shadow-xl transition-all duration-700 hover:-translate-y-2 bg-[var(--gradient-card)] border-border/50 ${
                    stepsInView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  style={{ transitionDelay: stepsInView ? `${index * 150}ms` : '0ms' }}
                >
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center relative z-10">
                      <Icon className="w-10 h-10 text-primary-foreground" />
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

        {/* Features Section */}
        <div 
          ref={featuresRef}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center mb-4">Key Features & Functionality</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Explore the powerful tools and features that make MILESTONE the ultimate platform for educational growth
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title}
                  className={`hover:shadow-lg transition-all duration-500 ${
                    featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: featuresInView ? `${index * 100}ms` : '0ms' }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {feature.roles.join(", ")}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of students, parents, and educators already using MILESTONE to track growth and unlock opportunities
          </p>
          <div className="flex gap-4 justify-center">
            <a href="/auth" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 transition-colors">
              Create Account
            </a>
            <a href="/features" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 transition-colors">
              View All Features
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;
