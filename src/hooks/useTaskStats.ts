import { useQuery } from '@tanstack/react-query';
import { getTaskStatsForProjects } from '@/lib/supabase/projectTasks';
import type { TaskStats } from '@/lib/supabase/projectTasks';

/**
 * Loads per-project task completion stats for a list of projects in one query.
 * Returns a Map keyed by project id (empty Map while loading / when no ids).
 */
export const useTaskStats = (projectIds: string[]) => {
  return useQuery<Map<string, TaskStats>>({
    queryKey: ['task-stats', projectIds],
    queryFn: () => getTaskStatsForProjects(projectIds),
    enabled: projectIds.length > 0,
    staleTime: 30 * 1000,
  });
};
