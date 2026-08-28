import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { PortfolioModerationWidget } from "@/components/widgets/PortfolioModerationWidget";
import { AchievementControlWidget } from "@/components/widgets/AchievementControlWidget";
import { useAuth } from "@/contexts/AuthContext";

const AdminModeration = () => {
  const { profile } = useAuth();
  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Moderation"
        title="Content & achievement review"
        description="Review student projects, portfolio items, and achievement claims submitted for approval."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <PortfolioModerationWidget defaultExpanded schoolId={profile?.school_id ?? null} />
        <AchievementControlWidget defaultExpanded schoolId={profile?.school_id ?? null} />
      </div>
    </SchoolAdminLayout>
  );
};

export default AdminModeration;
