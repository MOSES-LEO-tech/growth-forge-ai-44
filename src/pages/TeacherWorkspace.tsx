import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PendingApprovalsWidget } from "@/components/widgets/PendingApprovalsWidget";
import { TeacherStatsWidget } from "@/components/widgets/TeacherStatsWidget";
import { StudentDirectoryWidget } from "@/components/widgets/StudentDirectoryWidget";
import { NotificationsWidget } from "@/components/widgets/NotificationsWidget";

const TeacherWorkspace = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />
      <main id="main-content" role="main" className="container mx-auto px-4 py-8">
        <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="editorial-kicker mb-2">Teacher workspace</p>
            <h1 className="text-3xl md:text-4xl">Welcome back, {profile?.full_name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Review approvals, keep an eye on your students, and manage school content.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/content")}>
              <FileText className="mr-1.5 h-4 w-4" /> Content
            </Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <Settings className="mr-1.5 h-4 w-4" /> Settings
            </Button>
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-4">
            <TeacherStatsWidget defaultExpanded />
            <div className="grid gap-4 xl:grid-cols-2">
              <NotificationsWidget defaultExpanded />
              <PendingApprovalsWidget defaultExpanded />
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <PendingApprovalsWidget defaultExpanded />
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <StudentDirectoryWidget defaultExpanded />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherWorkspace;
