import { useEffect } from "react";
import type { Profile } from "@/types";
import { PendingApprovalsWidget } from "@/components/widgets/PendingApprovalsWidget";
import { SchoolGalleryWidget } from "@/components/widgets/SchoolGalleryWidget";
import { StudentDirectoryWidget } from "@/components/widgets/StudentDirectoryWidget";
import { TeacherStatsWidget } from "@/components/widgets/TeacherStatsWidget";
import { NotificationsWidget } from "@/components/widgets/NotificationsWidget";
import { useSearchParams } from "react-router-dom";

const TeacherDashboard = ({ profile }: { profile: Profile }) => {
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome Back, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Manage your classroom, approvals, and school events from one place.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
        {/* Row 1: Critical Actions & Stats */}
        <PendingApprovalsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'approvals'}
        />

        <TeacherStatsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'stats'}
        />

        {/* Row 2: Management Tools */}
        <StudentDirectoryWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'directory'}
        />

        <NotificationsWidget
          className="md:col-span-2 lg:col-span-2"
          defaultExpanded={activeWidget === 'notifications'}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;