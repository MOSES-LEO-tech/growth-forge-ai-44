import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Award,
  BookOpenCheck,
  ChevronDown,
  GraduationCap,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getChildren } from "@/lib/supabase/parent";
import { ChildOverviewWidget } from "@/components/widgets/ChildOverviewWidget";
import { ProjectsMonitoringWidget } from "@/components/widgets/ProjectsMonitoringWidget";
import { AchievementsMonitoringWidget } from "@/components/widgets/AchievementsMonitoringWidget";
import { AIGuidanceWidget } from "@/components/widgets/AIGuidanceWidget";
import { NotificationsWidget } from "@/components/widgets/NotificationsWidget";

type LinkedChild = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  grade: string | null;
  school_name: string | null;
};

const ParentWorkspace = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { id: childIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const loadChildren = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const kids = (await getChildren(user.id)) as unknown as LinkedChild[];
      setChildren(kids);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load children.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === childIdParam) ?? children[0] ?? null,
    [children, childIdParam]
  );

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You have been signed out successfully" });
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader profile={profile} onSignOut={handleSignOut} onProfileUpdated={refreshProfile} />
      <main id="main-content" role="main" className="container mx-auto px-4 py-8">
        <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="editorial-kicker mb-2">Parent workspace</p>
            <h1 className="text-3xl md:text-4xl">Your children&apos;s journey</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Monitor projects, achievements, and guidance — one child at a time.
            </p>
          </div>

          {!loading && children.length > 1 && selectedChild && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex min-w-[200px] max-w-[280px] items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedChild.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{selectedChild.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-left">{selectedChild.full_name}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {children.map((child) => (
                  <DropdownMenuItem key={child.id} onClick={() => navigate(`/parent/children/${child.id}`)}>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={child.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{child.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="ml-2 min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{child.full_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {child.school_name || "No school"}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </section>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void loadChildren()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="flat-icon h-14 w-14">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-semibold">No children linked yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Ask your child to link you from their profile, or ask their school admin to create the
                parent–student link. You can also add a child from Settings.
              </p>
              <Button asChild size="sm">
                <Link to="/settings">Link a child</Link>
              </Button>
              <Badge variant="outline">PARENT_CHILD_NOT_LINKED</Badge>
            </CardContent>
          </Card>
        ) : (
          selectedChild && (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedChild.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                    {selectedChild.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold">{selectedChild.full_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedChild.grade ? `${selectedChild.grade} · ` : ""}
                    {selectedChild.school_name || "No school"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/parent/messages">
                      <MessageSquare className="mr-1.5 h-4 w-4" /> Messages
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/parent/subscription">
                      <Sparkles className="mr-1.5 h-4 w-4" /> Plan
                    </Link>
                  </Button>
                </div>
              </div>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="overview" className="gap-1.5">
                    <BookOpenCheck className="h-3.5 w-3.5" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" /> Projects
                  </TabsTrigger>
                  <TabsTrigger value="achievements" className="gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Achievements
                  </TabsTrigger>
                  <TabsTrigger value="guidance">Guidance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                      <ChildOverviewWidget childId={selectedChild.id} childName={selectedChild.full_name} />
                    </div>
                    <NotificationsWidget defaultExpanded />
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="mt-6">
                  <ProjectsMonitoringWidget childId={selectedChild.id} defaultExpanded />
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <AchievementsMonitoringWidget childId={selectedChild.id} defaultExpanded />
                </TabsContent>

                <TabsContent value="guidance" className="mt-6">
                  <AIGuidanceWidget childId={selectedChild.id as unknown as number} defaultExpanded />
                </TabsContent>
              </Tabs>
            </>
          )
        )}
      </main>
    </div>
  );
};

export default ParentWorkspace;
