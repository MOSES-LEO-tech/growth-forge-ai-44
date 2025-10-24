import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  Zap 
} from "lucide-react";

type UserRole = "student" | "parent" | "teacher" | "admin";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  roles: UserRole[];
  isPremium?: boolean;
}

const Features = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        
        setUserRole(profileData?.role || null);
      }
      
      setLoading(false);
    };

    checkUser();
  }, []);

  const allFeatures: Feature[] = [
    // Student Features
    {
      title: "Digital Portfolio",
      description: "Build a comprehensive digital portfolio showcasing your academic achievements, extracurricular activities, and personal projects.",
      icon: FileText,
      roles: ["student"]
    },
    {
      title: "Skill Tracking",
      description: "Track your skill development across various areas including leadership, teamwork, and technical skills.",
      icon: BarChart,
      roles: ["student"]
    },
    {
      title: "Scholarship Matching",
      description: "Get matched with scholarships that align with your achievements, interests, and educational goals.",
      icon: Award,
      roles: ["student"]
    },
    {
      title: "Learning Resources",
      description: "Access curated learning resources tailored to your interests and academic needs.",
      icon: BookOpen,
      roles: ["student"]
    },
    {
      title: "Event Calendar",
      description: "Stay updated with academic events, competitions, and extracurricular activities.",
      icon: Calendar,
      roles: ["student"]
    },
    
    // Parent Features
    {
      title: "Student Progress Monitoring",
      description: "Monitor your child's academic progress, skill development, and portfolio growth.",
      icon: UserCheck,
      roles: ["parent"]
    },
    {
      title: "Parent-Teacher Communication",
      description: "Communicate directly with teachers and school administrators regarding your child's education.",
      icon: MessageSquare,
      roles: ["parent"]
    },
    {
      title: "Achievement Verification",
      description: "Verify and endorse your child's achievements and extracurricular activities.",
      icon: Award,
      roles: ["parent"]
    },
    {
      title: "Educational Resources",
      description: "Access resources to help support your child's educational journey.",
      icon: BookOpen,
      roles: ["parent"]
    },
    
    // Teacher Features
    {
      title: "Student Management",
      description: "Manage student profiles, verify achievements, and track class progress.",
      icon: Users,
      roles: ["teacher"]
    },
    {
      title: "Achievement Verification",
      description: "Verify student achievements and provide official endorsements for portfolios.",
      icon: Award,
      roles: ["teacher"]
    },
    {
      title: "Class Analytics",
      description: "Access analytics on class performance, skill development, and engagement.",
      icon: BarChart,
      roles: ["teacher"]
    },
    {
      title: "Resource Sharing",
      description: "Share educational resources, assignments, and learning materials with students.",
      icon: BookOpen,
      roles: ["teacher"]
    },
    
    // Admin Features
    {
      title: "School Management",
      description: "Comprehensive tools for managing your school's digital presence and student records.",
      icon: School,
      roles: ["admin"]
    },
    {
      title: "User Management",
      description: "Manage all user accounts including students, parents, and teachers.",
      icon: Users,
      roles: ["admin"]
    },
    {
      title: "Analytics Dashboard",
      description: "Access detailed analytics on school performance, student engagement, and skill development.",
      icon: BarChart,
      roles: ["admin"]
    },
    {
      title: "Partnership Management",
      description: "Manage partnerships with colleges, scholarship providers, and employers.",
      icon: Briefcase,
      roles: ["admin"]
    },
    
    // Common Features for All
    {
      title: "Personalized Dashboard",
      description: "A customized dashboard tailored to your role and preferences.",
      icon: Zap,
      roles: ["student", "parent", "teacher", "admin"]
    }
  ];

  const renderFeatureCard = (feature: Feature) => (
    <Card key={feature.title} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-primary/10">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{feature.title}</CardTitle>
          </div>
          {feature.isPremium && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              Premium
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{feature.description}</CardDescription>
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">MILESTONE Features</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover the powerful features designed to support your educational journey
          </p>
        </div>

        <Tabs defaultValue={userRole || "student"} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="student">
              <GraduationCap className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Student</span>
            </TabsTrigger>
            <TabsTrigger value="parent">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Parent</span>
            </TabsTrigger>
            <TabsTrigger value="teacher">
              <BookOpen className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Teacher</span>
            </TabsTrigger>
            <TabsTrigger value="admin">
              <School className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="student" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterFeaturesByRole("student").map(renderFeatureCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="parent" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterFeaturesByRole("parent").map(renderFeatureCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="teacher" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterFeaturesByRole("teacher").map(renderFeatureCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="admin" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filterFeaturesByRole("admin").map(renderFeatureCard)}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Features;