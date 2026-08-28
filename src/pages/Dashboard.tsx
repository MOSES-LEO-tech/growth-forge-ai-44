import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import SchoolAdminDashboard from "@/components/dashboards/SchoolAdminDashboard";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import DashboardHeader from "@/components/DashboardHeader";
import { QuickActions } from "@/components/QuickActions";
import RoleOnboardingWizard from "@/components/RoleOnboardingWizard";
import { needsOnboarding } from "@/lib/onboarding";
import type { Profile, UserRole } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ShieldCheck } from "lucide-react";

const Dashboard = () => {
  const { user, profile: authProfile, isLoading: authLoading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }

    if (!authLoading && user && authProfile && needsOnboarding(authProfile)) {
      setShowOnboarding(true);
    }
  }, [user, authLoading, authProfile]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully"
    });
    navigate("/auth");
  };

  const handleOnboardingClose = () => setShowOnboarding(false);

  const fallbackRole = (user?.user_metadata?.role as UserRole | undefined) ?? "student";
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
    role: fallbackRole,
    school_id: null,
    account_status: fallbackRole === "admin" || fallbackRole === "teacher" ? "pending" : "approved",
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    visibility: "public",
    timezone: null,
    education_system: null,
    onboarding_completed_at: null,
    notification_prefs: {},
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

    if ((dashboardProfile.role === "admin" || dashboardProfile.role === "teacher") && dashboardProfile.account_status !== "approved") {
      return <PendingApprovalPanel profile={dashboardProfile} />;
    }

    switch (dashboardProfile.role) {
      case "student":
        return <StudentDashboard profile={dashboardProfile} />;
      case "parent":
        return <Navigate to="/parent" replace />;
      case "teacher":
        return <Navigate to="/teacher" replace />;
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
          {needsOnboarding(dashboardProfile) && !showOnboarding && (
            <div className="container mx-auto mt-4 px-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <div>
                  <p className="text-sm font-medium">Finish setting up your account</p>
                  <p className="text-xs text-muted-foreground">
                    A few quick details make your experience better. You can skip any optional step.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowOnboarding(true)}>
                  Finish setup
                </Button>
              </div>
            </div>
          )}
          {renderDashboard()}
        </main>

        {/* Quick Actions FAB — uses DashboardContext directly */}
        <QuickActions />

        {/* Role onboarding wizard */}
        <RoleOnboardingWizard
          open={showOnboarding}
          onClose={handleOnboardingClose}
          profile={dashboardProfile}
          onCompleted={() => {
            setShowOnboarding(false);
            void refreshProfile();
          }}
        />
      </div>
    </DashboardProvider>
  );
};

const PendingApprovalPanel = ({ profile }: { profile: Profile }) => {
  const rejected = profile.account_status === "rejected";
  const title = rejected ? "Approval needed before you can continue" : "Your account is waiting for approval";
  const description =
    profile.role === "admin"
      ? "A Super Admin needs to approve your school registration before your school admin workspace opens."
      : "Your school admin needs to approve your teacher account before your teacher workspace opens.";

  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="mx-auto max-w-2xl luxury-card">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            {rejected ? <ShieldCheck className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
          </div>
          <div>
            <Badge variant={rejected ? "destructive" : "secondary"} className="mb-3">
              {rejected ? "Rejected" : "Pending approval"}
            </Badge>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm text-muted-foreground">
          <p>{description}</p>
          {profile.rejection_reason && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-left text-destructive">
              {profile.rejection_reason}
            </div>
          )}
          <p>You can stay signed in and check back later. The dashboard will open automatically after approval.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
