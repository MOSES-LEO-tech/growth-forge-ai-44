import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessagingWidget } from "@/components/widgets/MessagingWidget";
import Navbar from "@/components/Navbar";

const ParentMessages = () => {
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
      <Navbar />
      <main id="main-content" role="main" className="container mx-auto px-4 app-main">
        <section className="dashboard-hero">
          <p className="editorial-kicker mb-2">Messages</p>
          <h1 className="text-2xl md:text-3xl">Conversations</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep in touch with your child's teachers and school staff.
          </p>
        </section>
        <MessagingWidget defaultExpanded />
      </main>
    </div>
  );
};

export default ParentMessages;
