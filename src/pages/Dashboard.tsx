import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import DashboardHeader from "@/components/DashboardHeader";
import { QuickActions } from "@/components/QuickActions";
import { OnboardingModal } from "@/components/OnboardingModal";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('[Dashboard] checkUser - token exists:', !!token);
        if (!token) {
          console.log('[Dashboard] No token found, redirecting to /auth');
          navigate("/auth");
          return;
        }

        console.log('[Dashboard] Fetching profile...');
        const response = await auth.getProfile();
        console.log('[Dashboard] Profile fetched successfully:', response.data);
        setProfile(response.data);
        setLoading(false);

        // Show onboarding for first-time users
        const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
        if (!hasSeenOnboarding) {
          setShowOnboarding(true);
        }
      } catch (error: any) {
        console.error("[Dashboard] Failed to fetch profile:", error);
        console.error("[Dashboard] Error response:", error.response?.data);
        console.error("[Dashboard] Error status:", error.response?.status);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('[Dashboard] Cleared localStorage, redirecting to /auth');
        navigate("/auth");
      }
    };

    checkUser();
  }, [navigate]);

  const refreshProfile = async () => {
    try {
      const response = await auth.getProfile();
      setProfile(response.data);
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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

  if (loading) {
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
    switch (profile?.role) {
      case "student":
        return <StudentDashboard profile={profile} />;
      case "parent":
        return <ParentDashboard profile={profile} />;
      case "teacher":
      case "admin":
        return <TeacherDashboard profile={profile} />;
      default:
        return <StudentDashboard profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />

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