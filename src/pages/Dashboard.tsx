import { useAuth } from "@/contexts/AuthContext";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import DashboardHeader from "@/components/DashboardHeader";

const Dashboard = () => {
  const { profile, signOut, loading } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={signOut} />
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;