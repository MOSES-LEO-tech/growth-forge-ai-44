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
    .select("id, owner_id, title, description, status, start_date, end_date, skills_tracked, collaborators, created_at, updated_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const results: ProjectWithCollaboratorCount[] = (projects || []).map(p => ({
    ...(p as any),
    collaboratorCount: Array.isArray(p.collaborators) ? p.collaborators.length : 0
  }));
  
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
      
      // First get the project with its collaborators array
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("collaborators")
        .eq("id", projectId)
        .maybeSingle();
      
      if (projectError) throw projectError;
      if (!project || !Array.isArray(project.collaborators) || project.collaborators.length === 0) {
        return [];
      }
      
      // Then fetch the profiles for those collaborators
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", project.collaborators);
      
      if (profilesError) throw profilesError;
      
      return (profiles || []).map(profile => ({
        user_id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      }));
    },
    enabled: !!projectId,
  });
}

export function useAddCollaborator(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      // First get current collaborators
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("collaborators")
        .eq("id", projectId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const currentCollaborators = Array.isArray(project?.collaborators) ? project.collaborators : [];
      
      // Add new collaborator if not already present
      if (!currentCollaborators.includes(userId)) {
        const { error } = await supabase
          .from("projects")
          .update({ collaborators: [...currentCollaborators, userId] })
          .eq("id", projectId);
        
        if (error) throw error;
      }
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
      // First get current collaborators
      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("collaborators")
        .eq("id", projectId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const currentCollaborators = Array.isArray(project?.collaborators) ? project.collaborators : [];
      
      // Remove collaborator
      const { error } = await supabase
        .from("projects")
        .update({ 
          collaborators: currentCollaborators.filter(id => id !== userId) 
        })
        .eq("id", projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-collaborators", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}


