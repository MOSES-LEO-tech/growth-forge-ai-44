import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AcademicStructureWidget } from "@/components/widgets/AcademicStructureWidget";
import { useAuth } from "@/contexts/AuthContext";

const AdminAcademic = () => {
  const { profile } = useAuth();
  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Academic structure"
        title="Classes & subjects"
        description="Manage classes, subjects, and academic years for your school."
      />
      <AcademicStructureWidget defaultExpanded schoolId={profile?.school_id ?? null} />
    </SchoolAdminLayout>
  );
};

export default AdminAcademic;
