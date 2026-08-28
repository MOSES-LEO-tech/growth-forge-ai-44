import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AnalyticsWidget } from "@/components/widgets/AnalyticsWidget";
import { useAuth } from "@/contexts/AuthContext";

const AdminAnalytics = () => {
  const { profile } = useAuth();
  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Analytics"
        title="School performance"
        description="Engagement, growth, and usage metrics across your school."
      />
      <AnalyticsWidget defaultExpanded schoolId={profile?.school_id ?? null} />
    </SchoolAdminLayout>
  );
};

export default AdminAnalytics;
