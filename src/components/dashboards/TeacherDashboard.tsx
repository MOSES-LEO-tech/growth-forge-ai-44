import type { Profile } from "@/integrations/supabase/types";
import { PendingApprovalsWidget } from "@/components/widgets/PendingApprovalsWidget";
import { SchoolAccessWidget } from "@/components/widgets/SchoolAccessWidget";
import { StudentDirectoryWidget } from "@/components/widgets/StudentDirectoryWidget";
import { TeacherStatsWidget } from "@/components/widgets/TeacherStatsWidget";
import { NotificationsWidget } from "@/components/widgets/NotificationsWidget";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";

const TeacherDashboard = ({ profile }: { profile: Profile }) => {
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
          <p className="editorial-kicker mb-2">Teacher workspace</p>
          <h1 className="text-3xl md:text-4xl">Welcome back, {profile.full_name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Manage classroom approvals, student records, and school event activity from one place.</p>
        </div>
        <div className="flat-icon h-12 w-12 shrink-0">
          <ClipboardCheck className="h-6 w-6" />
        </div>
      </section>

      <div className="dashboard-grid auto-rows-[minmax(190px,auto)]">
        <SchoolAccessWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'access' || activeWidget === 'code'}
          schoolId={profile.school_id}
          canManage={false}
        />

        {/* Row 1: Critical Actions & Stats */}
        <PendingApprovalsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'approvals'}
        />

        <TeacherStatsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'stats'}
        />

        {/* Row 2: Management Tools */}
        <StudentDirectoryWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'directory'}
        />

        <NotificationsWidget
          className="md:col-span-2 xl:col-span-2"
          defaultExpanded={activeWidget === 'notifications'}
        />
      </div>
    </div>
  );
};

export default TeacherDashboard;
