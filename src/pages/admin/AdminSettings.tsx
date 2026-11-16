import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { SchoolSettingsWidget } from "@/components/widgets/SchoolSettingsWidget";
import { SchoolAccessWidget } from "@/components/widgets/SchoolAccessWidget";
import { AIGovernanceWidget } from "@/components/widgets/AIGovernanceWidget";
import SchoolMediaManager from "@/components/admin/SchoolMediaManager";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

/**
 * One settings hub for the school admin: public profile, badge + gallery, who
 * can join, and AI guidance governance. All previously scattered settings live here.
 *
 * A super admin has no `school_id` of their own, so they pick the school they
 * are inspecting — otherwise every card here would read "no school assigned".
 */
const AdminSettings = () => {
  const { profile, userRole } = useAuth();
  const profileSchoolId = profile?.school_id ?? null;
  const isSuperAdmin = userRole === "super_admin";
  const [pickedSchoolId, setPickedSchoolId] = useState<string | null>(null);

  const { data: schools } = useQuery({
    queryKey: ["schools", "picker"],
    enabled: isSuperAdmin && !profileSchoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const schoolId = profileSchoolId ?? pickedSchoolId ?? schools?.[0]?.id ?? null;

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Settings"
        title="School configuration"
        description="Your public profile, badge and gallery, who can join, and AI guidance governance."
      />

      {isSuperAdmin && !profileSchoolId && (
        <div className="mb-6 max-w-sm space-y-2">
          <Label htmlFor="school-picker">Managing school</Label>
          <select
            id="school-picker"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={schoolId ?? ""}
            onChange={(event) => setPickedSchoolId(event.target.value || null)}
          >
            {(schools ?? []).length === 0 && <option value="">No schools yet</option>}
            {(schools ?? []).map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="grid h-auto w-full max-w-2xl grid-cols-4 rounded-xl border bg-card p-1">
          <TabsTrigger value="profile">School profile</TabsTrigger>
          <TabsTrigger value="media">Badge &amp; gallery</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="ai">AI &amp; safety</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <SchoolSettingsWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>
        <TabsContent value="media" className="mt-6">
          <SchoolMediaManager schoolId={schoolId} />
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
