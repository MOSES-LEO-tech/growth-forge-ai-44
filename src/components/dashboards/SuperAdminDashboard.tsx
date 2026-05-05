import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Compass,
  Eye,
  EyeOff,
  FolderRoot,
  Image,
  Loader2,
  Plus,
  RefreshCw,
  School,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { approveSchoolApplication, rejectSchoolApplication } from "@/lib/supabase/schoolSystem";
import type { Profile, UserRole } from "@/integrations/supabase/types";
import {
  createPlatformSchool,
  getSuperAdminDashboardData,
  ROLE_OPTIONS,
  updateAchievementVerification,
  updateAiGovernanceSettings,
  updateGalleryEventVisibility,
  updatePlatformUserRole,
  updatePlatformUserSchool,
  updateProjectModeration,
  type ActivityItem,
  type AiGovernanceSettings,
  type PlatformUser,
  type SuperAdminAchievement,
  type SuperAdminGalleryEvent,
  type SuperAdminProject,
} from "@/lib/supabase/superAdmin";

interface SuperAdminDashboardProps {
  profile: Profile;
}

const DASHBOARD_QUERY_KEY = ["super-admin-dashboard"];

const formatNumber = (value: number) => new Intl.NumberFormat().format(value);

const formatDate = (value: string | null | undefined) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const roleLabel = (role: string) =>
  role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const statusLabel = (status: string | null | undefined) => roleLabel(status || "unknown");

const statusClasses = (status: string | null | undefined) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "bg-amber-500/10 text-amber-700 border-amber-200";
    case "ongoing":
    case "in_progress":
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    case "complete":
    case "approved":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
    case "needs_review":
      return "bg-red-500/10 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const activityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "project":
      return <FolderRoot className="h-4 w-4 text-blue-600" />;
    case "achievement":
      return <Award className="h-4 w-4 text-amber-600" />;
    case "recommendation":
    case "smartbuddy":
      return <Compass className="h-4 w-4 text-emerald-600" />;
    case "gallery":
      return <Image className="h-4 w-4 text-pink-600" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const EmptyState = ({ icon: Icon, title }: { icon: typeof Activity; title: string }) => (
  <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
    <Icon className="h-8 w-8 opacity-50" />
    <p className="text-sm">{title}</p>
  </div>
);

type PageMeta = { total: number; page: number; pageSize: number };

const PageControls = ({ meta, onPageChange }: { meta: PageMeta; onPageChange: (page: number) => void }) => {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  const start = meta.total === 0 ? 0 : meta.page * meta.pageSize + 1;
  const end = Math.min(meta.total, (meta.page + 1) * meta.pageSize);

  return (
    <div className="mt-4 flex flex-col gap-2 border-t pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {formatNumber(start)}-{formatNumber(end)} of {formatNumber(meta.total)}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(0, meta.page - 1))} disabled={meta.page <= 0}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="min-w-20 text-center">
          Page {formatNumber(meta.page + 1)} of {formatNumber(totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages - 1, meta.page + 1))}
          disabled={meta.page + 1 >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const SuperAdminDashboard = ({ profile }: SuperAdminDashboardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | "all">("all");
  const [userSchoolFilter, setUserSchoolFilter] = useState("all");
  const [contentSearch, setContentSearch] = useState("");
  const [userPage, setUserPage] = useState(0);
  const [schoolPage, setSchoolPage] = useState(0);
  const [projectPage, setProjectPage] = useState(0);
  const [achievementPage, setAchievementPage] = useState(0);
  const [galleryPage, setGalleryPage] = useState(0);
  const [smartBuddyPage, setSmartBuddyPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [smartBuddySearch, setSmartBuddySearch] = useState("");
  const [schoolForm, setSchoolForm] = useState({ name: "", location: "", description: "" });

  useEffect(() => {
    setUserPage(0);
  }, [userRoleFilter, userSchoolFilter, userSearch]);

  useEffect(() => {
    setProjectPage(0);
    setAchievementPage(0);
    setGalleryPage(0);
  }, [contentSearch]);

  useEffect(() => {
    setSmartBuddyPage(0);
  }, [smartBuddySearch]);

  useEffect(() => {
    setAuditPage(0);
  }, [auditSearch]);

  const dashboardQueryInput = useMemo(
    () => ({
      users: {
        page: userPage,
        pageSize: 50,
        search: userSearch,
        role: userRoleFilter,
        schoolId: userSchoolFilter === "all" ? null : userSchoolFilter,
      },
      schools: { page: schoolPage, pageSize: 100 },
      projects: { page: projectPage, pageSize: 25, search: contentSearch },
      achievements: { page: achievementPage, pageSize: 25, search: contentSearch },
      galleryEvents: { page: galleryPage, pageSize: 25, search: contentSearch },
      smartBuddyUsage: { page: smartBuddyPage, pageSize: 25, search: smartBuddySearch },
      auditLogs: { page: auditPage, pageSize: 25, search: auditSearch },
    }),
    [
      auditPage,
      auditSearch,
      achievementPage,
      contentSearch,
      galleryPage,
      projectPage,
      schoolPage,
      smartBuddyPage,
      smartBuddySearch,
      userPage,
      userRoleFilter,
      userSchoolFilter,
      userSearch,
    ]
  );

  const dashboardQuery = useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, dashboardQueryInput],
    queryFn: () => getSuperAdminDashboardData(dashboardQueryInput),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    const channel = supabase
      .channel("super-admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "schools" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "achievements" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "recommendations" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "gallery_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => updatePlatformUserRole(userId, role),
    onSuccess: () => {
      toast({ title: "Role updated", description: "The user role has been saved." });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "Role update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const userSchoolMutation = useMutation({
    mutationFn: ({ userId, schoolId }: { userId: string; schoolId: string | null }) => updatePlatformUserSchool(userId, schoolId),
    onSuccess: () => {
      toast({ title: "School assignment updated" });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "School update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const createSchoolMutation = useMutation({
    mutationFn: createPlatformSchool,
    onSuccess: () => {
      setSchoolForm({ name: "", location: "", description: "" });
      toast({ title: "School added", description: "The institution is now available for user assignment." });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "School creation failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const schoolApplicationMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? approveSchoolApplication(id) : rejectSchoolApplication(id),
    onSuccess: () => {
      toast({ title: "School application updated" });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "School approval failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const projectMutation = useMutation({
    mutationFn: ({ id, status, verified }: { id: string; status?: string; verified?: boolean }) =>
      updateProjectModeration(id, { status, verified }),
    onSuccess: () => {
      toast({ title: "Project updated" });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "Project update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const achievementMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => updateAchievementVerification(id, verified),
    onSuccess: () => {
      toast({ title: "Achievement updated" });
      void invalidateDashboard();
    },
    onError: (error) =>
      toast({ title: "Achievement update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const galleryMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) => updateGalleryEventVisibility(id, isPublic),
    onSuccess: () => {
      toast({ title: "Gallery visibility updated" });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "Gallery update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const aiMutation = useMutation({
    mutationFn: updateAiGovernanceSettings,
    onSuccess: () => {
      toast({ title: "Guidance settings saved" });
      void invalidateDashboard();
    },
    onError: (error) => toast({ title: "Settings update failed", description: String((error as Error).message), variant: "destructive" }),
  });

  const data = dashboardQuery.data;

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const term = userSearch.trim().toLowerCase();
    return data.users.filter((user) => {
      const matchesSearch =
        !term ||
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.school_name?.toLowerCase().includes(term);
      const matchesRole = userRoleFilter === "all" || user.role === userRoleFilter;
      const matchesSchool =
        userSchoolFilter === "all" ||
        (userSchoolFilter === "unassigned" && !user.school_id) ||
        user.school_id === userSchoolFilter;
      return matchesSearch && matchesRole && matchesSchool;
    });
  }, [data, userRoleFilter, userSchoolFilter, userSearch]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    const term = contentSearch.trim().toLowerCase();
    return data.projects.filter(
      (project) =>
        !term ||
        project.title.toLowerCase().includes(term) ||
        project.student_name?.toLowerCase().includes(term) ||
        project.school_name?.toLowerCase().includes(term)
    );
  }, [contentSearch, data]);

  const filteredAchievements = useMemo(() => {
    if (!data) return [];
    const term = contentSearch.trim().toLowerCase();
    return data.achievements.filter(
      (achievement) =>
        !term ||
        achievement.title.toLowerCase().includes(term) ||
        achievement.student_name?.toLowerCase().includes(term) ||
        achievement.school_name?.toLowerCase().includes(term)
    );
  }, [contentSearch, data]);

  const filteredGalleryEvents = useMemo(() => {
    if (!data) return [];
    const term = contentSearch.trim().toLowerCase();
    return data.galleryEvents.filter(
      (event) =>
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.owner_name?.toLowerCase().includes(term) ||
        event.school_name?.toLowerCase().includes(term)
    );
  }, [contentSearch, data]);

  const statCards = [
    { label: "Total Users", value: data?.stats.totalUsers ?? 0, detail: `${formatNumber(data?.stats.activeStudents ?? 0)} students`, icon: Users },
    { label: "Partner Schools", value: data?.stats.partnerSchools ?? 0, detail: "Registered institutions", icon: School },
    {
      label: "Total Projects",
      value: data?.stats.totalProjects ?? 0,
      detail: `${formatNumber(data?.stats.pendingProjects ?? 0)} pending review`,
      icon: FolderRoot,
    },
    {
      label: "Guidance Requests",
      value: data?.stats.guidanceRequests ?? 0,
      detail: "SmartBuddy and recommendations",
      icon: Compass,
    },
  ];

  const handleCreateSchool = () => {
    if (schoolForm.name.trim().length < 2) {
      toast({ title: "School name required", description: "Enter at least two characters.", variant: "destructive" });
      return;
    }
    createSchoolMutation.mutate(schoolForm);
  };

  const handleRoleChange = (user: PlatformUser, role: UserRole) => {
    if (user.id === profile.id && role !== "super_admin") {
      toast({ title: "Action blocked", description: "You cannot remove your own Super Admin role here.", variant: "destructive" });
      return;
    }
    roleMutation.mutate({ userId: user.id, role });
  };

  const renderLoading = () => (
    <div className="flex min-h-96 items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Loading platform data...</span>
      </div>
    </div>
  );

  const renderError = () => (
    <Card className="luxury-card">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">Super Admin data could not load</h2>
          <p className="mt-2 text-sm text-muted-foreground">{String((dashboardQuery.error as Error)?.message || "Unknown error")}</p>
        </div>
        <Button onClick={() => dashboardQuery.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="editorial-kicker mb-2">Platform workspace</p>
          <h1 className="text-3xl md:text-4xl">Platform Mission Control</h1>
          <p className="mt-2 text-sm text-muted-foreground">Global overview and management for the Milestone platform.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => dashboardQuery.refetch()} disabled={dashboardQuery.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${dashboardQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <div className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <ShieldAlert className="h-4 w-4" />
            Super Admin Access
          </div>
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        renderLoading()
      ) : dashboardQuery.error ? (
        renderError()
      ) : data ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="luxury-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(stat.value)}</div>
                  <p className="text-xs text-muted-foreground">{stat.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="overview">Platform Overview</TabsTrigger>
              <TabsTrigger value="approvals">
                Approvals
                {data.pendingSchoolApplications.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{data.pendingSchoolApplications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="content">Content Moderation</TabsTrigger>
              <TabsTrigger value="ai">Guidance Usage</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="luxury-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      System Activity
                    </CardTitle>
                    <CardDescription>Live telemetry from Supabase</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Admins</p>
                        <p className="text-xl font-semibold">{formatNumber(data.stats.admins)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Pending Achievements</p>
                        <p className="text-xl font-semibold">{formatNumber(data.stats.pendingAchievements)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Verified Awards</p>
                        <p className="text-xl font-semibold">{formatNumber(data.stats.verifiedAchievements)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Public Events</p>
                        <p className="text-xl font-semibold">{formatNumber(data.stats.publicEvents)}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {ROLE_OPTIONS.map((role) => {
                        const count = data.roleCounts[role];
                        const width = data.stats.totalUsers ? Math.max(8, (count / data.stats.totalUsers) * 100) : 0;
                        return (
                          <div key={role} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{roleLabel(role)}</span>
                              <span>{formatNumber(count)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="luxury-card">
                  <CardHeader>
                    <CardTitle>Top Performing Schools</CardTitle>
                    <CardDescription>Ranked by users, projects, and achievements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.schools.length === 0 ? (
                      <EmptyState icon={School} title="No schools have been added yet." />
                    ) : (
                      <div className="space-y-3">
                        {data.schools.slice(0, 5).map((school, index) => (
                          <div key={school.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {index + 1}. {school.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(school.total_users)} users · {formatNumber(school.projects)} projects ·{" "}
                                {formatNumber(school.achievements)} achievements
                              </p>
                            </div>
                            <Badge variant="secondary">{formatNumber(school.engagement_score)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Platform Activity
                  </CardTitle>
                  <CardDescription>Latest projects, achievements, guidance records, and gallery events</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.recentActivity.length === 0 ? (
                    <EmptyState icon={Activity} title="No recent platform activity yet." />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {data.recentActivity.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="mt-1">{activityIcon(item.type)}</div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.detail}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle>School Admin Approvals</CardTitle>
                  <CardDescription>Approve new school registrations before admins can access their workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.pendingSchoolApplications.length === 0 ? (
                    <EmptyState icon={Clock} title="No school admin applications are pending." />
                  ) : (
                    data.pendingSchoolApplications.map((school) => (
                      <div key={school.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{school.name}</h3>
                            <Badge variant="outline">Pending</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {[school.location, school.country].filter(Boolean).join(", ") || "No location"} · Admin:{" "}
                            {school.admin_name || school.admin_email || "Unknown admin"}
                          </p>
                          {school.description && <p className="mt-2 text-sm text-muted-foreground">{school.description}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={schoolApplicationMutation.isPending}
                            onClick={() => schoolApplicationMutation.mutate({ id: school.id, action: "approve" })}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={schoolApplicationMutation.isPending}
                            onClick={() => schoolApplicationMutation.mutate({ id: school.id, action: "reject" })}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schools" className="space-y-4">
              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Onboard School
                  </CardTitle>
                  <CardDescription>Create an institution and assign users to it immediately.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1.4fr_auto]">
                    <Input
                      placeholder="School name"
                      value={schoolForm.name}
                      onChange={(event) => setSchoolForm((current) => ({ ...current, name: event.target.value }))}
                    />
                    <Input
                      placeholder="Location"
                      value={schoolForm.location}
                      onChange={(event) => setSchoolForm((current) => ({ ...current, location: event.target.value }))}
                    />
                    <Input
                      placeholder="Description"
                      value={schoolForm.description}
                      onChange={(event) => setSchoolForm((current) => ({ ...current, description: event.target.value }))}
                    />
                    <Button onClick={handleCreateSchool} disabled={createSchoolMutation.isPending}>
                      {createSchoolMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle>Institutional Management</CardTitle>
                  <CardDescription>Live school directory with engagement metrics.</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.schools.length === 0 ? (
                    <EmptyState icon={School} title="School directory is empty." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Teachers</TableHead>
                          <TableHead>Projects</TableHead>
                          <TableHead>Achievements</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.schools.map((school) => (
                          <TableRow key={school.id}>
                            <TableCell>
                              <div className="font-medium">{school.name}</div>
                              <div className="text-xs text-muted-foreground">{school.location || "No location"}</div>
                            </TableCell>
                            <TableCell>{formatNumber(school.total_users)}</TableCell>
                            <TableCell>{formatNumber(school.students)}</TableCell>
                            <TableCell>{formatNumber(school.teachers)}</TableCell>
                            <TableCell>{formatNumber(school.projects)}</TableCell>
                            <TableCell>{formatNumber(school.achievements)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <PageControls meta={data.pagination.schools} onPageChange={setSchoolPage} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Search, assign schools, and change roles across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users, email, or school..."
                        className="pl-9"
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                      />
                    </div>
                    <Select value={userRoleFilter} onValueChange={(value) => setUserRoleFilter(value as UserRole | "all")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        {ROLE_OPTIONS.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={userSchoolFilter} onValueChange={setUserSchoolFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="School" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All schools</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {data.schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredUsers.length === 0 ? (
                    <EmptyState icon={Users} title="No users match those filters." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>School</TableHead>
                          <TableHead>Portfolio</TableHead>
                          <TableHead>Updated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="font-medium">{user.full_name || user.email || "Unnamed user"}</div>
                              <div className="text-xs text-muted-foreground">{user.email || user.id}</div>
                            </TableCell>
                            <TableCell>
                              <Select value={user.role} onValueChange={(value) => handleRoleChange(user, value as UserRole)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {roleLabel(role)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.school_id || "none"}
                                onValueChange={(value) =>
                                  userSchoolMutation.mutate({ userId: user.id, schoolId: value === "none" ? null : value })
                                }
                              >
                                <SelectTrigger className="w-56">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No school</SelectItem>
                                  {data.schools.map((school) => (
                                    <SelectItem key={school.id} value={school.id}>
                                      {school.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                {formatNumber(user.project_count)} projects · {formatNumber(user.achievement_count)} achievements
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(user.updated_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <PageControls meta={data.pagination.users} onPageChange={setUserPage} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle>Content Moderation</CardTitle>
                  <CardDescription>Approve, reject, verify, and publish portfolio content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search projects, achievements, gallery, users, or schools..."
                      className="pl-9"
                      value={contentSearch}
                      onChange={(event) => setContentSearch(event.target.value)}
                    />
                  </div>

                  <Tabs defaultValue="projects" className="space-y-4">
                    <TabsList className="h-auto flex-wrap justify-start">
                      <TabsTrigger value="projects">Projects ({formatNumber(data.pagination.projects.total)})</TabsTrigger>
                      <TabsTrigger value="achievements">Achievements ({formatNumber(data.pagination.achievements.total)})</TabsTrigger>
                      <TabsTrigger value="gallery">Gallery ({formatNumber(data.pagination.galleryEvents.total)})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="projects">
                      {filteredProjects.length === 0 ? (
                        <EmptyState icon={FolderRoot} title="No projects match the current search." />
                      ) : (
                        <div className="space-y-3">
                          {filteredProjects.map((project: SuperAdminProject) => (
                            <div key={project.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">{project.title}</h3>
                                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClasses(project.status)}`}>
                                    {statusLabel(project.status)}
                                  </span>
                                  {project.verified && <Badge variant="secondary">Verified</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {project.student_name || "Unknown user"} · {project.school_name || "No school"} · {formatDate(project.created_at)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => projectMutation.mutate({ id: project.id, status: "ongoing", verified: true })}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => projectMutation.mutate({ id: project.id, status: "needs_review", verified: false })}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Needs Review
                                </Button>
                              </div>
                            </div>
                          ))}
                          <PageControls meta={data.pagination.projects} onPageChange={setProjectPage} />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="achievements">
                      {filteredAchievements.length === 0 ? (
                        <EmptyState icon={Award} title="No achievements match the current search." />
                      ) : (
                        <div className="space-y-3">
                          {filteredAchievements.map((achievement: SuperAdminAchievement) => (
                            <div key={achievement.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">{achievement.title}</h3>
                                  <Badge variant={achievement.verified ? "secondary" : "outline"}>
                                    {achievement.verified ? "Verified" : "Pending"}
                                  </Badge>
                                  {achievement.category && <Badge variant="outline">{achievement.category}</Badge>}
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {achievement.student_name || "Unknown user"} · {achievement.school_name || "No school"} ·{" "}
                                  {formatDate(achievement.created_at)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => achievementMutation.mutate({ id: achievement.id, verified: true })}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => achievementMutation.mutate({ id: achievement.id, verified: false })}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Unverify
                                </Button>
                              </div>
                            </div>
                          ))}
                          <PageControls meta={data.pagination.achievements} onPageChange={setAchievementPage} />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="gallery">
                      {filteredGalleryEvents.length === 0 ? (
                        <EmptyState icon={Image} title="No gallery events match the current search." />
                      ) : (
                        <div className="space-y-3">
                          {filteredGalleryEvents.map((event: SuperAdminGalleryEvent) => (
                            <div key={event.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">{event.title}</h3>
                                  <Badge variant={event.is_public ? "secondary" : "outline"}>
                                    {event.is_public ? "Public" : "Private"}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {event.owner_name || "Unknown user"} · {event.school_name || "No school"} · {formatDate(event.event_date || event.created_at)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => galleryMutation.mutate({ id: event.id, isPublic: !event.is_public })}
                              >
                                {event.is_public ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                                {event.is_public ? "Make Private" : "Publish"}
                              </Button>
                            </div>
                          ))}
                          <PageControls meta={data.pagination.galleryEvents} onPageChange={setGalleryPage} />
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
                <Card className="luxury-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Guidance Governance
                    </CardTitle>
                    <CardDescription>Feature toggles backed by the platform settings table.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(data.aiSettings).map(([key, enabled]) => {
                      const labelMap: Record<keyof AiGovernanceSettings, string> = {
                        smartBuddy: "SmartBuddy Chat",
                        recommendations: "Project Recommendations",
                        scholarshipMatching: "Scholarship Matching",
                        essayReview: "Essay Review",
                      };
                      const settingKey = key as keyof AiGovernanceSettings;
                      return (
                        <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{labelMap[settingKey]}</p>
                            <p className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
                          </div>
                          <Switch
                            checked={enabled}
                            disabled={aiMutation.isPending}
                            onCheckedChange={(checked) => aiMutation.mutate({ ...data.aiSettings, [settingKey]: checked })}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="luxury-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      SmartBuddy Telemetry
                    </CardTitle>
                    <CardDescription>Live token and cost telemetry from AI chat requests.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Requests</p>
                        <p className="text-xl font-semibold">{formatNumber(data.smartBuddyTotals.requests)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Tokens</p>
                        <p className="text-xl font-semibold">{formatNumber(data.smartBuddyTotals.totalTokens)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="text-xl font-semibold">${data.smartBuddyTotals.costUsd.toFixed(4)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Errors</p>
                        <p className="text-xl font-semibold">{formatNumber(data.smartBuddyStatusCounts.error || 0)}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users, school, model, or personality..."
                        className="pl-9"
                        value={smartBuddySearch}
                        onChange={(event) => setSmartBuddySearch(event.target.value)}
                      />
                    </div>
                    {data.smartBuddyUsage.length === 0 ? (
                      <EmptyState icon={Compass} title="No SmartBuddy usage has been logged yet." />
                    ) : (
                      <div className="space-y-3">
                        {data.smartBuddyUsage.map((usage) => (
                          <div key={usage.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                            <div className="min-w-0">
                              <p className="font-medium">{usage.user_name || usage.user_email || "Unknown user"}</p>
                              <p className="text-xs text-muted-foreground">
                                {usage.model} · {usage.personality} · {usage.school_name || "No school"}
                              </p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{formatNumber(usage.total_tokens)} tokens · ${Number(usage.total_cost_usd).toFixed(4)}</p>
                              <p>{formatDate(usage.created_at)}</p>
                            </div>
                          </div>
                        ))}
                        <PageControls meta={data.pagination.smartBuddyUsage} onPageChange={setSmartBuddyPage} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
              <Card className="luxury-card">
                <CardHeader>
                  <CardTitle>Super Admin Audit Logs</CardTitle>
                  <CardDescription>Mutation-only audit trail for privileged platform actions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative max-w-xl">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search action, actor, or entity..."
                      className="pl-9"
                      value={auditSearch}
                      onChange={(event) => setAuditSearch(event.target.value)}
                    />
                  </div>

                  {data.auditLogs.length === 0 ? (
                    <EmptyState icon={ShieldAlert} title="No Super Admin actions have been logged yet." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-xs text-muted-foreground">{log.id}</div>
                            </TableCell>
                            <TableCell>
                              <div>{log.actor_name || log.actor_email || "Unknown actor"}</div>
                              <div className="text-xs text-muted-foreground">{log.actor_email || log.actor_id || "No actor id"}</div>
                            </TableCell>
                            <TableCell>
                              <div>{log.entity_type}</div>
                              <div className="text-xs text-muted-foreground">{log.entity_id || "No entity id"}</div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <PageControls meta={data.pagination.auditLogs} onPageChange={setAuditPage} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}
    </div>
  );
};

export default SuperAdminDashboard;
