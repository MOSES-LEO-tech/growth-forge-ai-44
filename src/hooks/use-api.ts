import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, Project, Achievement, Scholarship, School } from '@/integrations/supabase/types';

const DEFAULT_STALE_TIME = 5 * 60 * 1000;

function createQueryKeys<T extends string>(resource: T) {
  return {
    all: [resource] as const,
    lists: () => [...createQueryKeys(resource).all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...createQueryKeys(resource).lists(), filters] as const,
    details: () => [...createQueryKeys(resource).all, 'detail'] as const,
    detail: (id: string) => [...createQueryKeys(resource).details(), id] as const,
  };
}

const profilesKeys = createQueryKeys('profiles');
const projectsKeys = createQueryKeys('projects');
const achievementsKeys = createQueryKeys('achievements');
const scholarshipsKeys = createQueryKeys('scholarships');
const schoolsKeys = createQueryKeys('schools');

export const queryKeys = {
  profiles: profilesKeys,
  projects: projectsKeys,
  achievements: achievementsKeys,
  scholarships: scholarshipsKeys,
  schools: schoolsKeys,
};

interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

async function fetchWithCursorPagination<T extends { id: string }>(
  table: string,
  params: CursorPaginationParams,
  options: { orderBy?: string; ascending?: boolean } = {}
): Promise<CursorPaginatedResult<T>> {
  const { cursor, limit = 20 } = params;
  
  let query = supabase
    .from(table)
    .select('*')
    .order(options.orderBy || 'created_at', { ascending: options.ascending ?? false })
    .limit(limit + 1);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;
  
  if (error) throw error;

  const items = data as T[];
  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, -1) : items;
  const nextCursor = hasMore ? result[result.length - 1]?.created_at : undefined;

  return { data: result, nextCursor, hasMore };
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: profilesKeys.detail(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      return data as Profile;
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!userId,
  });
}

export function useProfiles(params: CursorPaginationParams = {}) {
  return useQuery({
    queryKey: profilesKeys.list(params),
    queryFn: () => fetchWithCursorPagination<Profile>('profiles', params),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(profilesKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: profilesKeys.lists() });
    },
  });
}

export function useProjects(ownerId?: string, params: CursorPaginationParams = {}) {
  return useQuery({
    queryKey: projectsKeys.list({ ownerId, ...params }),
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit((params.limit || 20) + 1);

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = data as Project[];
      return {
        data: items.slice(0, params.limit || 20),
        nextCursor: items.length > (params.limit || 20) ? items[items.length - 1]?.id : undefined,
        hasMore: items.length > (params.limit || 20),
      };
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!ownerId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(projectsKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: projectsKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useAchievements(userId?: string) {
  return useQuery({
    queryKey: achievementsKeys.list({ userId: userId || 'all' }),
    queryFn: async () => {
      let query = supabase
        .from('achievements')
        .select('*')
        .order('date_earned', { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Achievement[];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useScholarships(params: CursorPaginationParams = {}) {
  return useQuery({
    queryKey: scholarshipsKeys.list(params),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .order('deadline', { ascending: true })
        .limit((params.limit || 20) + 1);

      if (error) throw error;

      const items = data as Scholarship[];
      return {
        data: items.slice(0, params.limit || 20),
        nextCursor: items.length > (params.limit || 20) ? items[items.length - 1]?.id : undefined,
        hasMore: items.length > (params.limit || 20),
      };
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSchools(params: CursorPaginationParams = {}) {
  return useQuery({
    queryKey: schoolsKeys.list(params),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true })
        .limit((params.limit || 20) + 1);

      if (error) throw error;

      const items = data as School[];
      return {
        data: items.slice(0, params.limit || 20),
        nextCursor: items.length > (params.limit || 20) ? items[items.length - 1]?.id : undefined,
        hasMore: items.length > (params.limit || 20),
      };
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}