import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { SchoolSettingsWidget } from "@/components/widgets/SchoolSettingsWidget";
import { SchoolAccessWidget } from "@/components/widgets/SchoolAccessWidget";
import { AIGovernanceWidget } from "@/components/widgets/AIGovernanceWidget";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * One settings hub for the school admin: public profile, who can join, and
 * AI guidance governance. All previously scattered settings live here.
 */
const AdminSettings = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id ?? null;

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Settings"
        title="School configuration"
        description="One place for your public profile, who can join, and AI guidance governance."
      />

      <Tabs defaultValue="profile">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 rounded-xl border bg-card p-1">
          <TabsTrigger value="profile">School profile</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="ai">AI &amp; safety</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <SchoolSettingsWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="access" className="mt-6">
          <SchoolAccessWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <AIGovernanceWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </SchoolAdminLayout>
  );
};

export default AdminSettings;
