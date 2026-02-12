import { useEffect } from "react";
import type { Profile } from "@/services/api";
import { AchievementsWidget } from "@/components/widgets/AchievementsWidget";
import { ProjectsWidget } from "@/components/widgets/ProjectsWidget";
import { GalleryWidget } from "@/components/widgets/GalleryWidget";
import { ScholarshipsWidget } from "@/components/widgets/ScholarshipsWidget";
import { RecommendationsWidget } from "@/components/widgets/RecommendationsWidget";
import { SmartBuddyWidget } from "@/components/widgets/SmartBuddyWidget";
import { useSearchParams } from "react-router-dom";

const StudentDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Customize your learning journey with your personal dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* Row 1: Key Stats & Quick Actions */}
        <AchievementsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'achievements'}
        />

        <SmartBuddyWidget
          className="md:col-span-2 lg:col-span-2 row-span-2"
          defaultExpanded={activeWidget === 'buddy'}
        />

        {/* Row 2: Main Content Areas */}
        <ProjectsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'projects'}
          userId={profile.id}
        />

        {/* Row 3: Gallery & Discovery */}
        <GalleryWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'gallery'}
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
