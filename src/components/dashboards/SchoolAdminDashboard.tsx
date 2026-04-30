import type { Profile } from "@/integrations/supabase/types";
import { SchoolOverviewWidget } from "@/components/widgets/SchoolOverviewWidget";
import { UserManagementWidget } from "@/components/widgets/UserManagementWidget";
import { AcademicStructureWidget } from "@/components/widgets/AcademicStructureWidget";
import { PortfolioModerationWidget } from "@/components/widgets/PortfolioModerationWidget";
import { AchievementControlWidget } from "@/components/widgets/AchievementControlWidget";
import { AIGovernanceWidget } from "@/components/widgets/AIGovernanceWidget";
import { AnalyticsWidget } from "@/components/widgets/AnalyticsWidget";
import { SchoolSettingsWidget } from "@/components/widgets/SchoolSettingsWidget";
import { useSearchParams } from "react-router-dom";
import { School } from "lucide-react";

const SchoolAdminDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="editorial-kicker mb-2">School admin workspace</p>
          <h1 className="text-3xl md:text-4xl">Welcome back, {profile.full_name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage users, approvals, academic structure, galleries, and reporting with one consistent workspace.</p>
        </div>
        <div className="flat-icon h-12 w-12 shrink-0">
          <School className="h-6 w-6" />
        </div>
      </section>

      <div className="dashboard-grid auto-rows-[minmax(190px,auto)]">
        {/* Row 1: School Overview */}
        <SchoolOverviewWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'overview'}
          schoolId={profile.school_id}
        />

        {/* Row 2: User Management */}
        <UserManagementWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'users'}
          schoolId={profile.school_id}
        />

        {/* Row 3: Academic Structure */}
        <AcademicStructureWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'academic'}
          schoolId={profile.school_id}
        />

        {/* Row 4: Portfolio Moderation */}
        <PortfolioModerationWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'portfolio'}
          schoolId={profile.school_id}
        />

        {/* Row 5: Achievement Control */}
        <AchievementControlWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'achievements'}
          schoolId={profile.school_id}
        />

        {/* Row 6: Guidance Governance */}
        <AIGovernanceWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'ai'}
          schoolId={profile.school_id}
        />

        {/* Row 7: Analytics */}
        <AnalyticsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'analytics'}
          schoolId={profile.school_id}
        />

        {/* Row 8: Settings */}
        <SchoolSettingsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'settings'}
          schoolId={profile.school_id}
        />
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
