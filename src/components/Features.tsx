import { Card } from "@/components/ui/card";
import { 
  Award, 
  Brain, 
  Calendar, 
  GraduationCap, 
  LineChart, 
  Shield,
  Users,
  Zap
} from "lucide-react";
import { useInView } from "@/hooks/useInView";

const features = [
  {
    icon: Award,
    title: "Achievement Tracking",
    description: "Document and showcase verified achievements across academics, sports, arts, and leadership.",
    gradient: "from-accent to-amber-500"
  },
  {
    icon: Brain,
    title: "AI-Powered Guidance",
    description: "Receive personalized recommendations for activities, scholarships, and skill development.",
    gradient: "from-secondary to-purple-400"
  },
  {
    icon: LineChart,
    title: "Skill Analytics",
    description: "Track growth across teamwork, leadership, problem-solving, and creative competencies.",
    gradient: "from-primary to-blue-500"
  },
  {
    icon: GraduationCap,
    title: "Digital Portfolio",
    description: "Auto-generated, verified portfolios ready for college applications and opportunities.",
    gradient: "from-emerald-500 to-teal-500"
  },
  {
    icon: Calendar,
    title: "Event Gallery",
    description: "Multimedia archive of school events, projects, and memorable moments.",
    gradient: "from-rose-500 to-pink-500"
  },
  {
    icon: Users,
    title: "Parent Dashboard",
    description: "Parents can monitor progress and celebrate their child's growth journey.",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    icon: Shield,
    title: "Verified by Schools",
    description: "All achievements and projects verified by trusted school administrators.",
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: Zap,
    title: "Adaptive Experience",
    description: "Interface adapts to user age, role, and skill level for optimal experience.",
    gradient: "from-orange-500 to-red-500"
  }
];

const Features = () => {
  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.3 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div 
          ref={titleRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            titleInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Succeed</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform designed for students, parents, and educators to track and celebrate growth.
          </p>
        </div>

        <div 
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={feature.title}
                className={`p-6 hover:shadow-xl transition-all duration-700 hover:-translate-y-1 bg-[var(--gradient-card)] border-border/50 ${
                  gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridInView ? `${index * 100}ms` : '0ms' }}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
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