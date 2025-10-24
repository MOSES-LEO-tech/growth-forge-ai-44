import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, 
  Upload, 
  TrendingUp, 
  Rocket, 
  BookOpen, 
  Award, 
  Briefcase, 
  School, 
  Users, 
  CheckCircle, 
  BarChart, 
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Search
} from "lucide-react";

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              How <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Growth Forge</span> Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              A comprehensive guide to all the features and functions of our platform designed to help students track achievements and unlock opportunities.
            </p>
          </div>
        </section>

        {/* Overview Steps Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">The Journey at a Glance</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connection line */}
              <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-20" />
              
              {[
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
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <Card 
                    key={step.number}
                    className="p-8 text-center relative hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-[var(--gradient-card)] border-border/50"
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

        {/* Detailed Features Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-4 text-center">Detailed Platform Features</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 text-center">
              Explore all the powerful tools and features Growth Forge offers to help you succeed
            </p>

            <Tabs defaultValue="students" className="w-full max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="students">For Students</TabsTrigger>
                <TabsTrigger value="schools">For Schools</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              </TabsList>
              
              <TabsContent value="students" className="space-y-8">
                <FeatureCard 
                  icon={UserPlus} 
                  title="Profile Creation" 
                  description="Create your personalized student profile with details about your academic interests, extracurricular activities, and career goals. Your profile serves as the foundation for all your achievements and opportunities."
                  steps={[
                    "Sign up with your school email address",
                    "Complete your basic profile information",
                    "Add your academic interests and career goals",
                    "Connect with your school for verification",
                    "Set privacy preferences for your profile"
                  ]}
                />
                
                <FeatureCard 
                  icon={Upload} 
                  title="Achievement Tracking" 
                  description="Document and showcase all your academic and extracurricular achievements in one centralized digital portfolio. Each achievement can be verified by school administrators for added credibility."
                  steps={[
                    "Select the type of achievement (academic, extracurricular, volunteer, etc.)",
                    "Add details, dates, and supporting documents",
                    "Request verification from school administrators",
                    "Organize achievements by categories and tags",
                    "Share specific achievements with colleges or employers"
                  ]}
                />
                
                <FeatureCard 
                  icon={BarChart} 
                  title="Skills Dashboard" 
                  description="Visualize your skill development across different areas. Our AI analyzes your achievements and activities to show your strengths and areas for growth."
                  steps={[
                    "View your skills radar chart showing development across key areas",
                    "Track skill growth over time with progress graphs",
                    "Receive personalized recommendations for skill improvement",
                    "Compare your skills to requirements for specific careers",
                    "Export skill reports for applications"
                  ]}
                />
                
                <FeatureCard 
                  icon={Bell} 
                  title="Opportunity Alerts" 
                  description="Receive personalized notifications about scholarships, internships, and programs that match your profile, interests, and achievements."
                  steps={[
                    "Set your opportunity preferences and interests",
                    "Receive tailored alerts for matching opportunities",
                    "Save opportunities to your favorites list",
                    "Track application deadlines with reminders",
                    "Apply directly through the platform when available"
                  ]}
                />
              </TabsContent>
              
              <TabsContent value="schools" className="space-y-8">
                <FeatureCard 
                  icon={Users} 
                  title="Student Management" 
                  description="Schools can manage student accounts, verify achievements, and track overall student engagement and growth across the platform."
                  steps={[
                    "View all registered students from your school",
                    "Verify student achievements and activities",
                    "Monitor student engagement with the platform",
                    "Generate reports on student participation",
                    "Communicate with students through the platform"
                  ]}
                />
                
                <FeatureCard 
                  icon={CheckCircle} 
                  title="Achievement Verification" 
                  description="School administrators can verify student-submitted achievements, adding credibility and authenticity to student portfolios."
                  steps={[
                    "Receive verification requests from students",
                    "Review submitted documentation and evidence",
                    "Approve, reject, or request more information",
                    "Add official school verification badge to achievements",
                    "Track verification history and statistics"
                  ]}
                />
                
                <FeatureCard 
                  icon={FileText} 
                  title="School Analytics" 
                  description="Access comprehensive analytics about student achievements, skill development, and opportunity engagement across your school."
                  steps={[
                    "View school-wide achievement statistics",
                    "Track skill development trends across grade levels",
                    "Monitor opportunity application and success rates",
                    "Generate reports for school leadership and stakeholders",
                    "Identify areas for program improvement based on data"
                  ]}
                />
                
                <FeatureCard 
                  icon={MessageSquare} 
                  title="Communication Tools" 
                  description="Communicate with students, share opportunities, and provide feedback on achievements through our integrated messaging system."
                  steps={[
                    "Send announcements to all students or specific groups",
                    "Provide feedback on student achievements",
                    "Share custom opportunities with relevant students",
                    "Schedule virtual meetings for guidance and support",
                    "Create discussion groups for specific topics or programs"
                  ]}
                />
              </TabsContent>
              
              <TabsContent value="opportunities" className="space-y-8">
                <FeatureCard 
                  icon={BookOpen} 
                  title="Scholarship Matching" 
                  description="Our AI-powered matching system connects students with scholarships that align with their achievements, interests, and qualifications."
                  steps={[
                    "Browse thousands of scholarship opportunities",
                    "Receive personalized scholarship recommendations",
                    "Filter scholarships by amount, deadline, and requirements",
                    "Track application status for each scholarship",
                    "Set up alerts for new matching scholarships"
                  ]}
                />
                
                <FeatureCard 
                  icon={Briefcase} 
                  title="Internship Connections" 
                  description="Discover internship opportunities that match your skills and career interests, with direct application options through the platform."
                  steps={[
                    "Explore internships filtered by industry and location",
                    "Match your skills profile to internship requirements",
                    "Prepare application materials with guided templates",
                    "Submit applications through the platform",
                    "Receive feedback and track application status"
                  ]}
                />
                
                <FeatureCard 
                  icon={School} 
                  title="College Admissions Support" 
                  description="Prepare for college applications with tools to showcase your verified achievements and match with programs that align with your goals."
                  steps={[
                    "Create college application portfolios from your achievements",
                    "Match your profile with college program requirements",
                    "Receive guidance on application strategies",
                    "Track application deadlines and requirements",
                    "Share your verified portfolio directly with admissions offices"
                  ]}
                />
                
                <FeatureCard 
                  icon={Award} 
                  title="Recognition Programs" 
                  description="Participate in exclusive recognition programs that celebrate student excellence and provide additional opportunities for growth."
                  steps={[
                    "Discover recognition programs based on your achievements",
                    "Apply for awards and recognition opportunities",
                    "Showcase badges and honors on your profile",
                    "Connect with other recognized students",
                    "Access special opportunities for award recipients"
                  ]}
                />
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Join thousands of students who are already building their future with Growth Forge.
            </p>
            <a href="/auth" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              Create Your Account
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, steps }) => {
  return (
    <Card className="p-6 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="flex-grow">
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{description}</p>
          
          <div className="bg-muted/50 p-4 rounded-md">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="list-decimal list-inside space-y-1">
              {steps.map((step, index) => (
                <li key={index} className="text-sm">{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HowItWorksPage;