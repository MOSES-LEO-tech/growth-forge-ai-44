import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionWidget } from "@/components/widgets/SubscriptionWidget";

const ParentSubscription = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />
      <main id="main-content" role="main" className="container mx-auto px-4 py-8">
        <section className="dashboard-hero">
          <p className="editorial-kicker mb-2">Subscription</p>
          <h1 className="text-2xl md:text-3xl">Parent plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage your monitoring features and plan details.
          </p>
        </section>
        <SubscriptionWidget defaultExpanded />
      </main>
    </div>
  );
};

export default ParentSubscription;
