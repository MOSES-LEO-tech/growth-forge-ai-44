import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useInView } from "@/hooks/useInView";
import { 
  GraduationCap, 
  Users, 
  School, 
  Award, 
  BookOpen, 
  BarChart, 
  FileText, 
  Calendar, 
  MessageSquare, 
  UserCheck, 
  Briefcase, 
  Zap,
  Brain,
  Target,
  Trophy,
  LineChart,
  Share2,
  Shield
} from "lucide-react";

type UserRole = "student" | "parent" | "teacher" | "admin";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  roles: UserRole[];
  isPremium?: boolean;
  benefits?: string[];
}

const Features = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const { ref: titleRef, isInView: titleInView } = useInView({ threshold: 0.3, triggerOnce: true });
  const { ref: tabsRef, isInView: tabsInView } = useInView({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    // TODO: Get user role from the new auth context
    setLoading(false);
  }, []);

  const allFeatures: Feature[] = [
    {
      title: "Digital Portfolio",
      description: "Build a comprehensive digital portfolio showcasing your academic achievements, extracurricular activities, and personal projects.",
      icon: FileText,
      roles: ["student"],
      benefits: [
        "Organize all achievements in one place",
        "Share with colleges and employers",
        "Track progress over time"
      ]
    },
    {
      title: "AI Study Buddy",
      description: "Get personalized homework help, study tips, and academic guidance from our intelligent AI assistant available 24/7.",
      icon: Brain,
      roles: ["student"],
      isPremium: true,
      benefits: [
        "Instant answers to academic questions",
        "Personalized study recommendations",
        "Subject-specific tutoring"
      ]
    },
    {
      title: "Skill Tracking",
      description: "Track your skill development across various areas including leadership, teamwork, and technical skills with visual analytics.",
      icon: Target,
      roles: ["student"],
      benefits: [
        "Visual skill development charts",
        "Competency benchmarking",
        "Personalized improvement suggestions"
      ]
    },
    {
      title: "Scholarship Matching",
      description: "Get matched with scholarships that align with your achievements, interests, and educational goals using AI algorithms.",
      icon: Award,
      roles: ["student"],
      benefits: [
        "Automatic scholarship discovery",
        "Deadline reminders",
        "Application tracking"
      ]
    },
    {
      title: "Learning Resources",
      description: "Access curated learning resources tailored to your interests and academic needs from trusted sources.",
      icon: BookOpen,
      roles: ["student"]
    },
    {
      title: "Event Calendar",
      description: "Stay updated with academic events, competitions, and extracurricular activities through an integrated smart calendar.",
      icon: Calendar,
      roles: ["student"]
    },
    {
      title: "Project Management",
      description: "Organize and track your projects with built-in collaboration tools and progress monitoring.",
      icon: Briefcase,
      roles: ["student"],
      benefits: [
        "File storage and versioning",
        "Collaborative workspaces",
        "Progress tracking"
      ]
    },
    
    // Parent Features
    {
      title: "Student Progress Monitoring",
      description: "Monitor your child's academic progress, skill development, and portfolio growth with real-time updates.",
      icon: LineChart,
      roles: ["parent"],
      benefits: [
        "Real-time progress alerts",
        "Detailed performance reports",
        "Skill development tracking"
      ]
    },
    {
      title: "Parent-Teacher Communication",
      description: "Communicate directly with teachers and school administrators regarding your child's education through secure messaging.",
      icon: MessageSquare,
      roles: ["parent"],
      benefits: [
        "Direct messaging with teachers",
        "Scheduled meetings",
        "Progress update notifications"
      ]
    },
    {
      title: "Achievement Verification",
      description: "Verify and endorse your child's achievements and extracurricular activities to build credibility.",
      icon: Award,
      roles: ["parent"]
    },
    {
      title: "Educational Resources",
      description: "Access resources to help support your child's educational journey and stay informed.",
      icon: BookOpen,
      roles: ["parent"]
    },
    {
      title: "Activity Dashboard",
      description: "View all your children's activities, events, and achievements in one comprehensive dashboard.",
      icon: BarChart,
      roles: ["parent"]
    },
    
    // Teacher Features
    {
      title: "Student Management",
      description: "Manage student profiles, verify achievements, and track class progress with powerful admin tools.",
      icon: Users,
      roles: ["teacher"],
      benefits: [
        "Class roster management",
        "Bulk actions",
        "Performance analytics"
      ]
    },
    {
      title: "Achievement Verification",
      description: "Verify student achievements and provide official endorsements for portfolios with digital signatures.",
      icon: Shield,
      roles: ["teacher"]
    },
    {
      title: "Class Analytics",
      description: "Access analytics on class performance, skill development, and engagement with detailed visualizations.",
      icon: BarChart,
      roles: ["teacher"],
      isPremium: true,
      benefits: [
        "Student performance trends",
        "Engagement metrics",
        "Comparative analytics"
      ]
    },
    {
      title: "Resource Sharing",
      description: "Share educational resources, assignments, and learning materials with students easily.",
      icon: Share2,
      roles: ["teacher"]
    },
    {
      title: "Grading & Feedback",
      description: "Provide detailed feedback and grades on student projects and assignments.",
      icon: Trophy,
      roles: ["teacher"],
      benefits: [
        "Rubric-based grading",
        "Comment templates",
        "Grade analytics"
      ]
    },
    
    // Admin Features
    {
      title: "School Management",
      description: "Comprehensive tools for managing your school's digital presence and student records efficiently.",
      icon: School,
      roles: ["admin"],
      benefits: [
        "Complete school administration",
        "Multi-level permissions",
        "Data export capabilities"
      ]
    },
    {
      title: "User Management",
      description: "Manage all user accounts including students, parents, and teachers with role-based access control.",
      icon: UserCheck,
      roles: ["admin"]
    },
    {
      title: "Analytics Dashboard",
      description: "Access detailed analytics on school performance, student engagement, and skill development trends.",
      icon: BarChart,
      roles: ["admin"],
      isPremium: true,
      benefits: [
        "School-wide metrics",
        "Custom reports",
        "Data visualization"
      ]
    },
    {
      title: "Partnership Management",
      description: "Manage partnerships with colleges, scholarship providers, and employers to benefit students.",
      icon: Briefcase,
      roles: ["admin"]
    },
    
    // Common Features for All
    {
      title: "Personalized Dashboard",
      description: "A customized dashboard tailored to your role and preferences with widgets you can arrange.",
      icon: Zap,
      roles: ["student", "parent", "teacher", "admin"]
    }
  ];

  const renderFeatureCard = (feature: Feature, index: number = 0) => (
    <Card 
      key={feature.title} 
      className={`overflow-hidden transition-all duration-700 hover:shadow-xl hover:-translate-y-1 ${
        tabsInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      }`}
      style={{ 
        transitionDelay: tabsInView ? `${index * 100}ms` : '0ms'
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <feature.icon className="h-6 w-6 text-primary" />
          </div>
          {feature.isPremium && (
            <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
              Premium
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm mb-4">{feature.description}</CardDescription>
        {feature.benefits && (
          <ul className="space-y-1">
            {feature.benefits.map((benefit, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const filterFeaturesByRole = (role: UserRole) => {
    return allFeatures.filter(feature => feature.roles.includes(role));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div 
          ref={titleRef}
          className={`text-center mb-12 transition-all duration-1000 ${
            titleInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Powerful <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Features</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover comprehensive tools designed to support every step of your educational journey
          </p>
        </div>

        <Tabs 
          ref={tabsRef}
          defaultValue={userRole || "student"} 
          className={`w-full transition-all duration-700 ${
            tabsInView 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          }`}
        >
          <TabsList className="grid w-full grid-cols-4 mb-8 h-auto">
            <TabsTrigger value="student" className="flex items-center gap-2 py-3">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="parent" className="flex items-center gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Parents</span>
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex items-center gap-2 py-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2 py-3">
              <School className="h-4 w-4" />
              <span className="hidden sm:inline">Admins</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="student" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterFeaturesByRole("student").map((feature, index) => renderFeatureCard(feature, index))}
            </div>
          </TabsContent>
          
          <TabsContent value="parent" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterFeaturesByRole("parent").map((feature, index) => renderFeatureCard(feature, index))}
            </div>
          </TabsContent>
          
          <TabsContent value="teacher" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterFeaturesByRole("teacher").map((feature, index) => renderFeatureCard(feature, index))}
            </div>
          </TabsContent>
          
          <TabsContent value="admin" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterFeaturesByRole("admin").map((feature, index) => renderFeatureCard(feature, index))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Features;
