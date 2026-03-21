import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import SchoolAdminDashboard from "@/components/dashboards/SchoolAdminDashboard";
import DashboardHeader from "@/components/DashboardHeader";
import { QuickActions } from "@/components/QuickActions";
import { OnboardingModal } from "@/components/OnboardingModal";

const Dashboard = () => {
  const { user, profile: authProfile, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }

    if (!authLoading && user) {
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully"
    });
    navigate("/auth");
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (authProfile?.role) {
      case "student":
        return <StudentDashboard profile={authProfile} />;
      case "parent":
        return <ParentDashboard profile={authProfile} />;
      case "teacher":
      case "admin":
        return <TeacherDashboard profile={authProfile} />;
      case "school_admin":
        return <SchoolAdminDashboard profile={authProfile} />;
      default:
        return <StudentDashboard profile={authProfile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={authProfile} onSignOut={handleSignOut} />

      <main id="main-content" role="main">
        {renderDashboard()}
      </main>

      {/* Quick Actions FAB */}
      <QuickActions
        onAddAchievement={() => toast({ title: "Add Achievement", description: "Feature coming soon!" })}
        onAddProject={() => toast({ title: "Add Project", description: "Feature coming soon!" })}
        onAddEvent={() => toast({ title: "Add Event", description: "Feature coming soon!" })}
      />

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />
    </div>
  );
};

export default Dashboard;