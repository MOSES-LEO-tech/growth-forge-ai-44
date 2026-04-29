import { type Profile } from "@/integrations/supabase/types";
import { AchievementsWidget } from "@/components/widgets/AchievementsWidget";
import { ProjectsWidget } from "@/components/widgets/ProjectsWidget";
import { GalleryWidget } from "@/components/widgets/GalleryWidget";
import { ScholarshipsWidget } from "@/components/widgets/ScholarshipsWidget";
import { RecommendationsWidget } from "@/components/widgets/RecommendationsWidget";
import { SmartBuddyWidget } from "@/components/widgets/SmartBuddyWidget";
import { GrowthAnalyticsWidget } from "@/components/widgets/GrowthAnalyticsWidget";
import { ProfileOverviewWidget } from "@/components/widgets/ProfileOverviewWidget";
import { useSearchParams } from "react-router-dom";
import { useDashboard } from "@/contexts/DashboardContext";

const StudentDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");
  const {
    achievementModalOpen, closeAchievementModal,
    projectModalOpen, closeProjectModal,
    eventModalOpen, closeEventModal,
  } = useDashboard();

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* Row 1: Profile & Analytics */}
        <ProfileOverviewWidget
          className="md:col-span-1 lg:col-span-1"
          profile={profile}
          defaultExpanded={activeWidget === 'profile'}
        />

        <GrowthAnalyticsWidget
          className="md:col-span-2 lg:col-span-2"
          userId={profile.id}
          defaultExpanded={activeWidget === 'analytics'}
        />

        {/* Row 2: Achievements & AI Buddy */}
        <AchievementsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'achievements' || achievementModalOpen}
          openAddExternal={achievementModalOpen}
          onOpenAddChange={(open) => { if (!open) closeAchievementModal(); }}
        />

        <SmartBuddyWidget
          className="md:col-span-2 lg:col-span-2 row-span-2"
          defaultExpanded={activeWidget === 'buddy'}
        />

        {/* Row 3: Main Content Areas */}
        <ProjectsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'projects' || projectModalOpen}
          userId={profile.id}
          openAddExternal={projectModalOpen}
          onOpenAddChange={(open) => { if (!open) closeProjectModal(); }}
        />

        {/* Row 4: Gallery & Discovery */}
        <GalleryWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'gallery' || eventModalOpen}
          openUploadExternal={eventModalOpen}
          onOpenUploadChange={(open) => { if (!open) closeEventModal(); }}
        />

        <ScholarshipsWidget
          className="md:col-span-1 lg:col-span-1"
          defaultExpanded={activeWidget === 'scholarships'}
        />

        <RecommendationsWidget
          className="md:col-span-1 lg:col-span-1"
          defaultExpanded={activeWidget === 'recommendations'}
        />
      </div>
    </div>
  );
};

export default StudentDashboard;
