import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectSummary = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  skills_tracked: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectWithCollaboratorCount = ProjectSummary & {
  collaboratorCount: number;
};

export type Collaborator = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
};

async function fetchUserProjectsWithCounts(userId: string): Promise<ProjectWithCollaboratorCount[]> {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, owner_id, title, description, status, start_date, end_date, skills_tracked, created_at, updated_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const results: ProjectWithCollaboratorCount[] = [];
  for (const p of projects || []) {
    const { count } = await supabase
      .from("project_collaborators")
      .select("id", { count: "exact", head: true })
      .eq("project_id", p.id);
    results.push({ ...(p as ProjectSummary), collaboratorCount: count || 0 });
  }
  return results;
}

export function useUserProjects(userId?: string) {
  return useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      if (!userId) return [] as ProjectWithCollaboratorCount[];
      return await fetchUserProjectsWithCounts(userId);
    },
    enabled: !!userId,
  });
}

export function useProjectCollaborators(projectId?: string) {
  return useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: async (): Promise<Collaborator[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_collaborators")
        .select("user_id, profiles:profiles!inner(full_name, avatar_url)")
        .eq("project_id", projectId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        user_id: row.user_id,
        full_name: row.profiles.full_name,
        avatar_url: row.profiles.avatar_url,
      }));
    },
    enabled: !!projectId,
  });
}

export function useAddCollaborator(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("project_collaborators")
        .insert([{ project_id: projectId, user_id: userId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-collaborators", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveCollaborator(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("project_collaborators")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-collaborators", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}


