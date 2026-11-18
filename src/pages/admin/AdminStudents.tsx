import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AcademicStructureWidget } from "@/components/widgets/AcademicStructureWidget";
import { AchievementControlWidget } from "@/components/widgets/AchievementControlWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

const TABS = ["structure", "achievements"] as const;

/**
 * Students: the school's classes and the achievement review queue.
 *
 * Both used to be separate nav items (`/admin/academic`, `/admin/moderation`)
 * behind one widget each. The active tab is addressable, so the old moderation
 * link can land straight on the review queue.
 */
const AdminStudents = () => {
  const { profile } = useAuth();
  const schoolId = profile?.school_id ?? null;

  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = requested && (TABS as readonly string[]).includes(requested) ? requested : "structure";
  const setTab = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Students"
        title="Classes & achievements"
        description="Manage classes, subjects and academic years, and review the achievement claims that carry the school's endorsement."
      />

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="structure">Classes & subjects</TabsTrigger>
          <TabsTrigger value="achievements">Achievement review</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-6">
          <AcademicStructureWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <AchievementControlWidget defaultExpanded schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </SchoolAdminLayout>
  );
};

export default AdminStudents;
