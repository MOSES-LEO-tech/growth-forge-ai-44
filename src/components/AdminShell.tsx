import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Shared chrome for the school-admin workspace (/admin/*). Renders the same
 * dashboard header + role-aware nav strip as /dashboard, so admins always
 * have full navigation and a clear path back to the dashboard.
 */
const AdminShell = ({ children }: AdminShellProps) => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        profile={profile}
        onSignOut={handleSignOut}
        onProfileUpdated={refreshProfile}
      />
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  );
};

export default AdminShell;
