import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import SchoolAdminDashboard from "@/components/dashboards/SchoolAdminDashboard";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import DashboardHeader from "@/components/DashboardHeader";
import { QuickActions } from "@/components/QuickActions";
import { OnboardingModal } from "@/components/OnboardingModal";
import type { Profile, UserRole } from "@/integrations/supabase/types";

const Dashboard = () => {
  const { user, profile: authProfile, isLoading: authLoading, signOut, refreshProfile } = useAuth();
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

  const fallbackProfile: Profile | null = user ? {
    id: user.id,
    email: user.email ?? null,
    full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Student",
    avatar_url: user.user_metadata?.avatar_url ?? null,
    bio: null,
    grade_level: null,
    class_name: null,
    age: null,
    gpa: null,
    subjects: null,
    clubs: null,
    interests: null,
    extracurriculars: null,
    role: (user.user_metadata?.role as UserRole | undefined) ?? "student",
    school_id: null,
    created_at: user.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } : null;

  const dashboardProfile = authProfile ?? fallbackProfile;

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
    if (!dashboardProfile) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    switch (dashboardProfile.role) {
      case "student":
        return <StudentDashboard profile={dashboardProfile} />;
      case "parent":
        return <ParentDashboard profile={dashboardProfile} />;
      case "teacher":
        return <TeacherDashboard profile={dashboardProfile} />;
      case "admin":
        return <SchoolAdminDashboard profile={dashboardProfile} />;
      case "super_admin":
        return <SuperAdminDashboard profile={dashboardProfile} />;
      default:
        return <StudentDashboard profile={dashboardProfile} />;
    }
  };

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background">
        <DashboardHeader profile={dashboardProfile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />

        <main id="main-content" role="main">
          {renderDashboard()}
        </main>

        {/* Quick Actions FAB — uses DashboardContext directly */}
        <QuickActions />

        {/* Onboarding Modal */}
        <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />
      </div>
    </DashboardProvider>
  );
};

export default Dashboard;
