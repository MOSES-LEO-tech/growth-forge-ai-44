import { useState, useEffect, useCallback } from "react";
import { getChildren, getPlan } from "@/lib/supabase/parent";
import { useAuth } from "@/contexts/AuthContext";
import { ChildOverviewWidget } from "@/components/widgets/ChildOverviewWidget";
import { ProjectsMonitoringWidget } from "@/components/widgets/ProjectsMonitoringWidget";
import { AchievementsMonitoringWidget } from "@/components/widgets/AchievementsMonitoringWidget";
import { AnalyticsWidget } from "@/components/widgets/AnalyticsWidget";
import { AIGuidanceWidget } from "@/components/widgets/AIGuidanceWidget";
import { MessagingWidget } from "@/components/widgets/MessagingWidget";
import { NotificationsWidget } from "@/components/widgets/NotificationsWidget";
import { SubscriptionWidget } from "@/components/widgets/SubscriptionWidget";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronDown, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

type LinkedChild = {
  id: number;
  full_name: string;
  email: string;
  avatar_url: string | null;
  grade: string | null;
  school_name: string | null;
  projects_count: number;
  achievements_count: number;
  verified_achievements_count: number;
};

type ParentPlan = { tier: string; features: string[]; updatedAt: string | null };

// ─── Main Component ───────────────────────────────────────────────────────────

export function ParentDashboard({ profile }: { profile?: any }) {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [plan, setPlan] = useState<any | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked children + parent plan in parallel
  // Note: This must be defined BEFORE any early returns to comply with Rules of Hooks
  const fetchInitialData = useCallback(async () => {
    if (!user || !profile) return;
    try {
      setLoadingChildren(true);
      setError(null);
      const [kids, parentPlan] = await Promise.all([
        getChildren(user.id),
        getPlan(user.id),
      ]);
      setChildren(kids);
      if (kids.length > 0) setSelectedChild(kids[0]);
      setPlan(parentPlan || { tier: 'basic', features: [], updatedAt: null });
    } catch (err: any) {
      setError(err?.message || 'Failed to load your dashboard. Please try again.');
    } finally {
      setLoadingChildren(false);
    }
  }, [user, profile]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Early return for missing profile - now AFTER hooks are called
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingChildren) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Unable to load Parent Dashboard</h2>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={fetchInitialData} variant="outline">Try Again</Button>
      </div>
    );
  }

  // ── No children linked ─────────────────────────────────────────────────────
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No children linked yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Your account has no student accounts linked to it. Ask your child's school administrator to create a parent–student link, or have your child link your account from their profile settings.
        </p>
        <Badge variant="outline">Error Code: PARENT_CHILD_NOT_LINKED</Badge>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parent Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor and support your child's academic journey
          </p>
        </div>

        {/* Child selector — shown only when 2+ children */}
        {children.length > 1 && selectedChild && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 min-w-[180px] max-w-[260px]">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedChild.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{selectedChild.full_name[0]}</AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 text-left">{selectedChild.full_name}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {children.map(child => (
                <DropdownMenuItem
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-3 ${selectedChild.id === child.id ? 'bg-muted' : ''}`}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={child.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{child.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{child.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{child.school_name || 'No school'}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Single child — compact pill */}
        {children.length === 1 && selectedChild && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/50 text-sm">
            <Avatar className="h-6 w-6">
              <AvatarImage src={selectedChild.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{selectedChild.full_name[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{selectedChild.full_name}</span>
            {selectedChild.school_name && <span className="text-muted-foreground text-xs">· {selectedChild.school_name}</span>}
          </div>
        )}
      </div>

      {/* Widget grid */}
      {selectedChild ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Row 1: Overview (spans full width on small, 2 cols on md) */}
          <div className="md:col-span-2 xl:col-span-2">
            <ChildOverviewWidget
              childId={selectedChild.id}
              childName={selectedChild.full_name}
            />
          </div>

          {/* Notifications — right side */}
          <NotificationsWidget />

          {/* Row 2 */}
          <ProjectsMonitoringWidget childId={selectedChild.id} />
          <AchievementsMonitoringWidget childId={selectedChild.id} />
          <AnalyticsWidget childId={selectedChild.id} />

          {/* Row 3 */}
          <div className="md:col-span-2">
            <AIGuidanceWidget
              childId={selectedChild.id}
              parentPlan={plan?.tier}
            />
          </div>
          <MessagingWidget />

          {/* Row 4 */}
          <SubscriptionWidget />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">Select a child to view their dashboard.</div>
      )}
    </div>
  );
}

export default ParentDashboard;