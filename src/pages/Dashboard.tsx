import { useAuth } from "@/contexts/AuthContext";
import StudentDashboard from "@/components/dashboards/StudentDashboard";
import ParentDashboard from "@/components/dashboards/ParentDashboard";
import TeacherDashboard from "@/components/dashboards/TeacherDashboard";
import DashboardHeader from "@/components/DashboardHeader";

const Dashboard = () => {
  const { profile, signOut } = useAuth();

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
      <DashboardHeader profile={profile} onSignOut={signOut} />
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;