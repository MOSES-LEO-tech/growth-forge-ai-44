import type { Profile } from "@/services/api";
import { SchoolOverviewWidget } from "@/components/widgets/SchoolOverviewWidget";
import { UserManagementWidget } from "@/components/widgets/UserManagementWidget";
import { AcademicStructureWidget } from "@/components/widgets/AcademicStructureWidget";
import { PortfolioModerationWidget } from "@/components/widgets/PortfolioModerationWidget";
import { AchievementControlWidget } from "@/components/widgets/AchievementControlWidget";
import { AIGovernanceWidget } from "@/components/widgets/AIGovernanceWidget";
import { AnalyticsWidget } from "@/components/widgets/AnalyticsWidget";
import { SchoolSettingsWidget } from "@/components/widgets/SchoolSettingsWidget";
import { useSearchParams } from "react-router-dom";

const SchoolAdminDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome Back, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Manage your school, users, and academic structure from one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* Row 1: School Overview */}
        <SchoolOverviewWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'overview'}
          schoolId={profile.schoolId}
        />

        {/* Row 2: User Management */}
        <UserManagementWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'users'}
          schoolId={profile.schoolId}
        />

        {/* Row 3: Academic Structure */}
        <AcademicStructureWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'academic'}
          schoolId={profile.schoolId}
        />

        {/* Row 4: Portfolio Moderation */}
        <PortfolioModerationWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'portfolio'}
          schoolId={profile.schoolId}
        />

        {/* Row 5: Achievement Control */}
        <AchievementControlWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'achievements'}
          schoolId={profile.schoolId}
        />

        {/* Row 6: AI Governance */}
        <AIGovernanceWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'ai'}
          schoolId={profile.schoolId}
        />

        {/* Row 7: Analytics */}
        <AnalyticsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'analytics'}
          schoolId={profile.schoolId}
        />

        {/* Row 8: Settings */}
        <SchoolSettingsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'settings'}
          schoolId={profile.schoolId}
        />
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
