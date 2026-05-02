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
import { BookOpenCheck } from "lucide-react";

const StudentDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");
  const {
    achievementModalOpen, openAchievementModal, closeAchievementModal,
    projectModalOpen, openProjectModal, closeProjectModal,
    eventModalOpen, openEventModal, closeEventModal,
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
      <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="editorial-kicker mb-2">Student workspace</p>
          <h1 className="text-3xl md:text-4xl">Welcome back, {profile.full_name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Keep achievements, projects, media, scholarships, and recommendations in one polished portfolio.
          </p>
        </div>
        <div className="flat-icon h-12 w-12 shrink-0">
          <BookOpenCheck className="h-6 w-6" />
        </div>
      </section>

      <div className="dashboard-grid auto-rows-[minmax(190px,auto)]">
        {/* Row 1: Profile & Analytics */}
        <ProfileOverviewWidget
          className="md:col-span-1 xl:col-span-1"
          profile={profile}
          defaultExpanded={activeWidget === 'profile'}
        />

        <GrowthAnalyticsWidget
          className="md:col-span-2 xl:col-span-2"
          userId={profile.id}
          defaultExpanded={activeWidget === 'analytics'}
        />

        {/* Row 2: Achievements & Smart Buddy */}
        <AchievementsWidget
          className="md:col-span-2 xl:col-span-2"
          userId={profile.id}
          defaultExpanded={activeWidget === 'achievements' || achievementModalOpen}
          openAddExternal={achievementModalOpen}
          onOpenAddChange={(open) => {
            if (open) openAchievementModal();
            else closeAchievementModal();
          }}
        />

        <SmartBuddyWidget
          className="md:col-span-2 xl:col-span-2 row-span-2"
          defaultExpanded={activeWidget === 'buddy'}
        />

        {/* Row 3: Main Content Areas */}
        <ProjectsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'projects' || projectModalOpen}
          userId={profile.id}
          openAddExternal={projectModalOpen}
          onOpenAddChange={(open) => {
            if (open) openProjectModal();
            else closeProjectModal();
          }}
        />

        {/* Row 4: Gallery & Discovery */}
        <GalleryWidget
          className="md:col-span-2 xl:col-span-2"
          userId={profile.id}
          defaultExpanded={activeWidget === 'gallery' || eventModalOpen}
          openUploadExternal={eventModalOpen}
          onOpenUploadChange={(open) => {
            if (open) openEventModal();
            else closeEventModal();
          }}
        />

        <ScholarshipsWidget
          className="md:col-span-1 xl:col-span-1"
          defaultExpanded={activeWidget === 'scholarships'}
        />

        <RecommendationsWidget
          className="md:col-span-1 xl:col-span-1"
          defaultExpanded={activeWidget === 'recommendations'}
        />
      </div>
    </div>
  );
};

export default StudentDashboard;
