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
  type: "project" | "achievement" | "recommendation" | "gallery";
  title: string;
  detail: string;
  created_at: string;
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
  users: PlatformUser[];
  schools: SchoolSummary[];
  projects: SuperAdminProject[];
  achievements: SuperAdminAchievement[];
  recommendations: SuperAdminRecommendation[];
  galleryEvents: SuperAdminGalleryEvent[];
  recentActivity: ActivityItem[];
  aiSettings: AiGovernanceSettings;
  generatedAt: string;
};

const DEFAULT_AI_SETTINGS: AiGovernanceSettings = {
  smartBuddy: true,
  recommendations: true,
  scholarshipMatching: true,
  essayReview: false,
};

const assertOk = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};

const countBy = <T extends string>(values: Array<T | null | undefined>, fallback: string) =>
  values.reduce<Record<string, number>>((acc, value) => {
    const key = value || fallback;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

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

export async function getSuperAdminDashboardData(): Promise<SuperAdminDashboardData> {
  const [profilesResult, schoolsResult, projectsResult, achievementsResult, recommendationsResult, galleryEventsResult, settingsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url,role,school_id,grade_level,class_name,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("schools").select("*").order("name").limit(1000),
      supabase
        .from("projects")
        .select("id,title,description,status,verified,user_id,owner_id,created_at,updated_at,deleted_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("achievements")
        .select("id,user_id,title,description,category,verified,certificate_url,date_earned,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("recommendations").select("id,user_id,type,content,created_at").order("created_at", { ascending: false }).limit(1000),
      supabase
        .from("gallery_events")
        .select("id,user_id,title,location,event_date,is_public,created_at,deleted_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("settings").select("value").eq("key", "ai_governance").maybeSingle(),
    ]);

  [
    profilesResult,
    schoolsResult,
    projectsResult,
    achievementsResult,
    recommendationsResult,
    galleryEventsResult,
    settingsResult,
  ].forEach(assertOk);

  const profiles = (profilesResult.data || []) as Profile[];
  const schools = (schoolsResult.data || []) as School[];
  const projects = (projectsResult.data || []) as SuperAdminProject[];
  const achievements = (achievementsResult.data || []) as SuperAdminAchievement[];
  const recommendations = (recommendationsResult.data || []) as SuperAdminRecommendation[];
  const galleryEvents = (galleryEventsResult.data || []) as SuperAdminGalleryEvent[];

  const schoolsById = new Map(schools.map((school) => [school.id, school]));
  const usersById = new Map(profiles.map((profile) => [profile.id, profile]));

  const getUserSchoolName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const user = usersById.get(userId);
    return user?.school_id ? schoolsById.get(user.school_id)?.name ?? null : null;
  };

  const users = profiles.map((profile) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
    school_id: profile.school_id,
    grade_level: profile.grade_level,
    class_name: profile.class_name,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    school_name: profile.school_id ? schoolsById.get(profile.school_id)?.name ?? null : null,
    project_count: projects.filter((project) => project.user_id === profile.id || project.owner_id === profile.id).length,
    achievement_count: achievements.filter((achievement) => achievement.user_id === profile.id).length,
    recommendation_count: recommendations.filter((recommendation) => recommendation.user_id === profile.id).length,
    gallery_count: galleryEvents.filter((event) => event.user_id === profile.id).length,
  }));

  const enrichedProjects = projects.map((project) => {
    const owner = usersById.get(project.user_id || project.owner_id || "");
    return {
      ...project,
      student_name: owner?.full_name || owner?.email || "Unknown user",
      school_name: owner?.school_id ? schoolsById.get(owner.school_id)?.name ?? null : null,
    };
  });

  const enrichedAchievements = achievements.map((achievement) => {
    const owner = usersById.get(achievement.user_id || "");
    return {
      ...achievement,
      student_name: owner?.full_name || owner?.email || "Unknown user",
      school_name: owner?.school_id ? schoolsById.get(owner.school_id)?.name ?? null : null,
    };
  });

  const enrichedRecommendations = recommendations.map((recommendation) => {
    const owner = usersById.get(recommendation.user_id || "");
    return {
      ...recommendation,
      user_name: owner?.full_name || owner?.email || "Unknown user",
      school_name: getUserSchoolName(recommendation.user_id),
    };
  });

  const enrichedGalleryEvents = galleryEvents.map((event) => {
    const owner = usersById.get(event.user_id || "");
    return {
      ...event,
      owner_name: owner?.full_name || owner?.email || "Unknown user",
      school_name: getUserSchoolName(event.user_id),
    };
  });

  const schoolSummaries = schools
    .map((school) => {
      const schoolUsers = profiles.filter((profile) => profile.school_id === school.id);
      const schoolUserIds = new Set(schoolUsers.map((profile) => profile.id));
      const schoolProjects = projects.filter((project) => schoolUserIds.has(project.user_id || "") || schoolUserIds.has(project.owner_id || ""));
      const schoolAchievements = achievements.filter((achievement) => schoolUserIds.has(achievement.user_id || ""));

      return {
        ...school,
        total_users: schoolUsers.length,
        students: schoolUsers.filter((profile) => profile.role === "student").length,
        teachers: schoolUsers.filter((profile) => profile.role === "teacher").length,
        parents: schoolUsers.filter((profile) => profile.role === "parent").length,
        admins: schoolUsers.filter((profile) => profile.role === "admin").length,
        projects: schoolProjects.length,
        achievements: schoolAchievements.length,
        engagement_score: schoolUsers.length + schoolProjects.length * 2 + schoolAchievements.length,
      };
    })
    .sort((a, b) => b.engagement_score - a.engagement_score);

  const recentActivity: ActivityItem[] = [
    ...enrichedProjects.map((project) => ({
      id: project.id,
      type: "project" as const,
      title: project.title,
      detail: `${project.student_name || "Unknown user"} submitted a project`,
      created_at: project.created_at,
    })),
    ...enrichedAchievements.map((achievement) => ({
      id: achievement.id,
      type: "achievement" as const,
      title: achievement.title,
      detail: `${achievement.student_name || "Unknown user"} added an achievement`,
      created_at: achievement.created_at || new Date(0).toISOString(),
    })),
    ...enrichedRecommendations.map((recommendation) => ({
      id: recommendation.id,
      type: "recommendation" as const,
      title: `${recommendation.type || "guidance"} request`,
      detail: `${recommendation.user_name || "Unknown user"} received guidance`,
      created_at: recommendation.created_at,
    })),
    ...enrichedGalleryEvents.map((event) => ({
      id: event.id,
      type: "gallery" as const,
      title: event.title,
      detail: `${event.owner_name || "Unknown user"} created a gallery event`,
      created_at: event.created_at || new Date(0).toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const roleCounts = ROLE_OPTIONS.reduce<Record<UserRole, number>>((acc, role) => {
    acc[role] = profiles.filter((profile) => profile.role === role).length;
    return acc;
  }, {} as Record<UserRole, number>);

  return {
    stats: {
      totalUsers: profiles.length,
      activeStudents: roleCounts.student,
      admins: roleCounts.admin + roleCounts.super_admin,
      partnerSchools: schools.length,
      totalProjects: projects.length,
      pendingProjects: projects.filter((project) => (project.status || "").toLowerCase() === "pending").length,
      verifiedAchievements: achievements.filter((achievement) => achievement.verified).length,
      pendingAchievements: achievements.filter((achievement) => !achievement.verified).length,
      guidanceRequests: recommendations.length,
      publicEvents: galleryEvents.filter((event) => event.is_public).length,
    },
    roleCounts,
    projectStatusCounts: countBy(
      projects.map((project) => project.status),
      "unknown"
    ),
    recommendationTypeCounts: countBy(
      recommendations.map((recommendation) => recommendation.type),
      "unknown"
    ),
    users,
    schools: schoolSummaries,
    projects: enrichedProjects,
    achievements: enrichedAchievements,
    recommendations: enrichedRecommendations,
    galleryEvents: enrichedGalleryEvents,
    recentActivity,
    aiSettings: parseAiSettings(settingsResult.data?.value),
    generatedAt: new Date().toISOString(),
  };
}

export async function updatePlatformUserRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function updatePlatformUserSchool(userId: string, schoolId: string | null) {
  const { error } = await supabase
    .from("profiles")
    .update({ school_id: schoolId, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}

export async function createPlatformSchool(input: { name: string; location?: string; description?: string }) {
  const { error } = await supabase.from("schools").insert({
    name: input.name.trim(),
    location: input.location?.trim() || null,
    description: input.description?.trim() || null,
  });

  if (error) throw error;
}

export async function updateProjectModeration(projectId: string, input: { status?: string; verified?: boolean }) {
  const { error } = await supabase
    .from("projects")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) throw error;
}

export async function updateAchievementVerification(achievementId: string, verified: boolean) {
  const { error } = await supabase
    .from("achievements")
    .update({ verified })
    .eq("id", achievementId);

  if (error) throw error;
}

export async function updateGalleryEventVisibility(eventId: string, isPublic: boolean) {
  const { error } = await supabase.from("gallery_events").update({ is_public: isPublic }).eq("id", eventId);

  if (error) throw error;
}

export async function updateAiGovernanceSettings(settings: AiGovernanceSettings) {
  const { error } = await supabase.from("settings").upsert({
    key: "ai_governance",
    value: settings as unknown as Json,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
