import { supabase } from "@/integrations/supabase/client";
import type { Json, Profile, School, UserRole } from "@/integrations/supabase/types";

export const ROLE_OPTIONS: UserRole[] = ["student", "parent", "teacher", "admin", "super_admin"];

export type AiGovernanceSettings = {
  smartBuddy: boolean;
  recommendations: boolean;
  scholarshipMatching: boolean;
  essayReview: boolean;
};

export type PlatformUser = Pick<
  Profile,
  "id" | "email" | "full_name" | "avatar_url" | "role" | "school_id" | "grade_level" | "class_name" | "created_at" | "updated_at"
> & {
  school_name: string | null;
  project_count: number;
  achievement_count: number;
  recommendation_count: number;
  gallery_count: number;
};

export type SchoolSummary = School & {
  total_users: number;
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  projects: number;
  achievements: number;
  engagement_score: number;
};

export type PendingSchoolApplication = School & {
  admin_name: string | null;
  admin_email: string | null;
};

export type SuperAdminProject = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  verified: boolean | null;
  user_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string | null;
  student_name: string | null;
  school_name: string | null;
};

export type SuperAdminAchievement = {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  verified: boolean | null;
  certificate_url: string | null;
  date_earned: string | null;
  created_at: string | null;
  student_name: string | null;
  school_name: string | null;
};

export type SuperAdminRecommendation = {
  id: string;
  user_id: string | null;
  type: "scholarship" | "profile" | "actions" | null;
  content: Json | null;
  created_at: string;
  user_name: string | null;
  school_name: string | null;
};

export type SuperAdminSmartBuddyUsage = {
  id: string;
  user_id: string | null;
  model: string;
  provider: string;
  personality: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  cost_source: string;
  latency_ms: number | null;
  status: "success" | "error";
  error_code: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  school_name: string | null;
};

export type SuperAdminAuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: Json | null;
  after: Json | null;
  metadata: Json;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};

export type SuperAdminGalleryEvent = {
  id: string;
  user_id: string | null;
  title: string;
  location: string | null;
  event_date: string | null;
  is_public: boolean | null;
  created_at: string | null;
  owner_name: string | null;
  school_name: string | null;
};

export type ActivityItem = {
  id: string;
  type: "project" | "achievement" | "recommendation" | "smartbuddy" | "gallery";
  title: string;
  detail: string;
  created_at: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type SuperAdminDashboardQuery = {
  users?: { page?: number; pageSize?: number; search?: string; role?: UserRole | "all"; schoolId?: string | null };
  schools?: { page?: number; pageSize?: number; search?: string };
  projects?: { page?: number; pageSize?: number; search?: string };
  achievements?: { page?: number; pageSize?: number; search?: string };
  galleryEvents?: { page?: number; pageSize?: number; search?: string };
  smartBuddyUsage?: { page?: number; pageSize?: number; search?: string };
  auditLogs?: { page?: number; pageSize?: number; search?: string };
};

export type SuperAdminDashboardData = {
  stats: {
    totalUsers: number;
    activeStudents: number;
    admins: number;
    partnerSchools: number;
    totalProjects: number;
    pendingProjects: number;
    verifiedAchievements: number;
    pendingAchievements: number;
    guidanceRequests: number;
    publicEvents: number;
  };
  roleCounts: Record<UserRole, number>;
  projectStatusCounts: Record<string, number>;
  recommendationTypeCounts: Record<string, number>;
  smartBuddyStatusCounts: Record<string, number>;
  smartBuddyTotals: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  users: PlatformUser[];
  schools: SchoolSummary[];
  pendingSchoolApplications: PendingSchoolApplication[];
  projects: SuperAdminProject[];
  achievements: SuperAdminAchievement[];
  recommendations: SuperAdminRecommendation[];
  smartBuddyUsage: SuperAdminSmartBuddyUsage[];
  auditLogs: SuperAdminAuditLog[];
  galleryEvents: SuperAdminGalleryEvent[];
  recentActivity: ActivityItem[];
  aiSettings: AiGovernanceSettings;
  pagination: {
    users: Omit<PaginatedResult<PlatformUser>, "items">;
    schools: Omit<PaginatedResult<SchoolSummary>, "items">;
    projects: Omit<PaginatedResult<SuperAdminProject>, "items">;
    achievements: Omit<PaginatedResult<SuperAdminAchievement>, "items">;
    galleryEvents: Omit<PaginatedResult<SuperAdminGalleryEvent>, "items">;
    smartBuddyUsage: Omit<PaginatedResult<SuperAdminSmartBuddyUsage>, "items">;
    auditLogs: Omit<PaginatedResult<SuperAdminAuditLog>, "items">;
  };
  generatedAt: string;
};

const DEFAULT_AI_SETTINGS: AiGovernanceSettings = {
  smartBuddy: true,
  recommendations: true,
  scholarshipMatching: true,
  essayReview: false,
};

const parseAiSettings = (value: Json | null | undefined): AiGovernanceSettings => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return DEFAULT_AI_SETTINGS;
  }

  return {
    smartBuddy: typeof value.smartBuddy === "boolean" ? value.smartBuddy : DEFAULT_AI_SETTINGS.smartBuddy,
    recommendations: typeof value.recommendations === "boolean" ? value.recommendations : DEFAULT_AI_SETTINGS.recommendations,
    scholarshipMatching:
      typeof value.scholarshipMatching === "boolean" ? value.scholarshipMatching : DEFAULT_AI_SETTINGS.scholarshipMatching,
    essayReview: typeof value.essayReview === "boolean" ? value.essayReview : DEFAULT_AI_SETTINGS.essayReview,
  };
};

const defaultPage = <T>(pageSize = 50): PaginatedResult<T> => ({
  items: [],
  total: 0,
  page: 0,
  pageSize,
});

const pageMeta = <T>({ items: _items, ...meta }: PaginatedResult<T>) => meta;

const rpcJson = async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await (supabase as any).rpc(name, args);
  if (error) throw error;
  return data as T;
};

export async function getSuperAdminDashboardData(query: SuperAdminDashboardQuery = {}): Promise<SuperAdminDashboardData> {
  const usersQuery = query.users || {};
  const schoolsQuery = query.schools || {};
  const projectsQuery = query.projects || {};
  const achievementsQuery = query.achievements || {};
  const galleryQuery = query.galleryEvents || {};
  const usageQuery = query.smartBuddyUsage || {};
  const auditQuery = query.auditLogs || {};

  const [
    summary,
    usersPage,
    schoolsPage,
    projectsPage,
    achievementsPage,
    galleryPage,
    usagePage,
    auditPage,
  ] = await Promise.all([
    rpcJson<Record<string, any>>("super_admin_dashboard_summary"),
    rpcJson<PaginatedResult<PlatformUser>>("super_admin_list_users", {
      p_page: usersQuery.page ?? 0,
      p_page_size: usersQuery.pageSize ?? 50,
      p_search: usersQuery.search || null,
      p_role: usersQuery.role && usersQuery.role !== "all" ? usersQuery.role : null,
      p_school_id: usersQuery.schoolId || null,
      p_unassigned: usersQuery.schoolId === "unassigned",
    }),
    rpcJson<PaginatedResult<SchoolSummary>>("super_admin_list_schools", {
      p_page: schoolsQuery.page ?? 0,
      p_page_size: schoolsQuery.pageSize ?? 50,
      p_search: schoolsQuery.search || null,
    }),
    rpcJson<PaginatedResult<SuperAdminProject>>("super_admin_list_projects", {
      p_page: projectsQuery.page ?? 0,
      p_page_size: projectsQuery.pageSize ?? 50,
      p_search: projectsQuery.search || null,
    }),
    rpcJson<PaginatedResult<SuperAdminAchievement>>("super_admin_list_achievements", {
      p_page: achievementsQuery.page ?? 0,
      p_page_size: achievementsQuery.pageSize ?? 50,
      p_search: achievementsQuery.search || null,
    }),
    rpcJson<PaginatedResult<SuperAdminGalleryEvent>>("super_admin_list_gallery_events", {
      p_page: galleryQuery.page ?? 0,
      p_page_size: galleryQuery.pageSize ?? 50,
      p_search: galleryQuery.search || null,
    }),
    rpcJson<PaginatedResult<SuperAdminSmartBuddyUsage>>("super_admin_list_smartbuddy_usage", {
      p_page: usageQuery.page ?? 0,
      p_page_size: usageQuery.pageSize ?? 50,
      p_search: usageQuery.search || null,
    }),
    rpcJson<PaginatedResult<SuperAdminAuditLog>>("super_admin_list_audit_logs", {
      p_page: auditQuery.page ?? 0,
      p_page_size: auditQuery.pageSize ?? 50,
      p_search: auditQuery.search || null,
    }),
  ]);

  const normalizedUsers = usersPage || defaultPage<PlatformUser>();
  const normalizedSchools = schoolsPage || defaultPage<SchoolSummary>();
  const normalizedProjects = projectsPage || defaultPage<SuperAdminProject>();
  const normalizedAchievements = achievementsPage || defaultPage<SuperAdminAchievement>();
  const normalizedGallery = galleryPage || defaultPage<SuperAdminGalleryEvent>();
  const normalizedUsage = usagePage || defaultPage<SuperAdminSmartBuddyUsage>();
  const normalizedAudit = auditPage || defaultPage<SuperAdminAuditLog>();

  const roleCounts = ROLE_OPTIONS.reduce<Record<UserRole, number>>((acc, role) => {
    acc[role] = Number(summary.roleCounts?.[role] || 0);
    return acc;
  }, {} as Record<UserRole, number>);

  return {
    stats: {
      totalUsers: Number(summary.stats?.totalUsers || 0),
      activeStudents: Number(summary.stats?.activeStudents || 0),
      admins: Number(summary.stats?.admins || 0),
      partnerSchools: Number(summary.stats?.partnerSchools || 0),
      totalProjects: Number(summary.stats?.totalProjects || 0),
      pendingProjects: Number(summary.stats?.pendingProjects || 0),
      verifiedAchievements: Number(summary.stats?.verifiedAchievements || 0),
      pendingAchievements: Number(summary.stats?.pendingAchievements || 0),
      guidanceRequests: Number(summary.stats?.guidanceRequests || 0),
      publicEvents: Number(summary.stats?.publicEvents || 0),
    },
    roleCounts,
    projectStatusCounts: (summary.projectStatusCounts || {}) as Record<string, number>,
    recommendationTypeCounts: {},
    smartBuddyStatusCounts: (summary.smartBuddyStatusCounts || {}) as Record<string, number>,
    smartBuddyTotals: {
      requests: Number(summary.smartBuddyTotals?.requests || 0),
      promptTokens: Number(summary.smartBuddyTotals?.promptTokens || 0),
      completionTokens: Number(summary.smartBuddyTotals?.completionTokens || 0),
      totalTokens: Number(summary.smartBuddyTotals?.totalTokens || 0),
      costUsd: Number(summary.smartBuddyTotals?.costUsd || 0),
    },
    users: normalizedUsers.items,
    schools: normalizedSchools.items,
    pendingSchoolApplications: (summary.pendingSchoolApplications || []) as PendingSchoolApplication[],
    projects: normalizedProjects.items,
    achievements: normalizedAchievements.items,
    recommendations: [],
    smartBuddyUsage: normalizedUsage.items,
    auditLogs: normalizedAudit.items,
    galleryEvents: normalizedGallery.items,
    recentActivity: (summary.recentActivity || []) as ActivityItem[],
    aiSettings: parseAiSettings(summary.aiSettings),
    pagination: {
      users: pageMeta(normalizedUsers),
      schools: pageMeta(normalizedSchools),
      projects: pageMeta(normalizedProjects),
      achievements: pageMeta(normalizedAchievements),
      galleryEvents: pageMeta(normalizedGallery),
      smartBuddyUsage: pageMeta(normalizedUsage),
      auditLogs: pageMeta(normalizedAudit),
    },
    generatedAt: String(summary.generatedAt || new Date().toISOString()),
  };
}

export async function updatePlatformUserRole(userId: string, role: UserRole) {
  const { error } = await (supabase as any).rpc("super_admin_update_user_role", {
    p_user_id: userId,
    p_role: role,
  });

  if (error) throw error;
}

export async function updatePlatformUserSchool(userId: string, schoolId: string | null) {
  const { error } = await (supabase as any).rpc("super_admin_update_user_school", {
    p_user_id: userId,
    p_school_id: schoolId,
  });

  if (error) throw error;
}

export async function createPlatformSchool(input: { name: string; location?: string; description?: string }) {
  const { error } = await (supabase as any).rpc("super_admin_create_school", {
    p_name: input.name.trim(),
    p_location: input.location?.trim() || null,
    p_description: input.description?.trim() || null,
  });

  if (error) throw error;
}

export async function updateProjectModeration(projectId: string, input: { status?: string; verified?: boolean }) {
  const { error } = await (supabase as any).rpc("super_admin_update_project_moderation", {
    p_project_id: projectId,
    p_status: input.status || null,
    p_verified: typeof input.verified === "boolean" ? input.verified : null,
  });

  if (error) throw error;
}

export async function updateAchievementVerification(achievementId: string, verified: boolean) {
  const { error } = await (supabase as any).rpc("super_admin_update_achievement_verification", {
    p_achievement_id: achievementId,
    p_verified: verified,
  });

  if (error) throw error;
}

export async function updateGalleryEventVisibility(eventId: string, isPublic: boolean) {
  const { error } = await (supabase as any).rpc("super_admin_update_gallery_event_visibility", {
    p_event_id: eventId,
    p_is_public: isPublic,
  });

  if (error) throw error;
}

export async function updateAiGovernanceSettings(settings: AiGovernanceSettings) {
  const { error } = await (supabase as any).rpc("super_admin_update_ai_governance_settings", {
    p_settings: settings as unknown as Json,
  });

  if (error) throw error;
}
