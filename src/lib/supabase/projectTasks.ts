import { supabase } from '@/integrations/supabase/client';
import type { ProjectTask } from '@/integrations/supabase/types';

export type TaskStatus = ProjectTask['status'];

export interface TaskStats {
  total: number;
  done: number;
  inProgress: number;
}

export const getProjectTasks = async (projectId: string) => {
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectTask[];
};

export const createProjectTask = async (projectId: string, input: { title: string; due_date?: string | null }) => {
  const title = input.title.trim();
  if (!title) throw new Error('Task title is required');

  const { data: existing } = await supabase
    .from('project_tasks')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing && existing.length > 0 ? ((existing[0].position ?? 0) as number) + 1 : 0;

  const { data, error } = await supabase
    .from('project_tasks')
    .insert({ project_id: projectId, title, due_date: input.due_date || null, position })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectTask;
};

export const updateProjectTask = async (
  id: string,
  updates: Partial<Pick<ProjectTask, 'title' | 'status' | 'due_date' | 'position'>>
) => {
  const { data, error } = await supabase
    .from('project_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectTask;
};

export const deleteProjectTask = async (id: string) => {
  const { error } = await supabase.from('project_tasks').delete().eq('id', id);
  if (error) throw error;
};

/**
 * Fetch task stats for many projects in a single query and group them by
 * project id. Avoids N+1 requests when rendering project grids.
 */
export const getTaskStatsForProjects = async (projectIds: string[]): Promise<Map<string, TaskStats>> => {
  const stats = new Map<string, TaskStats>();
  if (projectIds.length === 0) return stats;

  const { data, error } = await supabase
    .from('project_tasks')
    .select('project_id, status')
    .in('project_id', projectIds);

  if (error) throw error;

  for (const projectId of projectIds) {
    stats.set(projectId, { total: 0, done: 0, inProgress: 0 });
  }

  for (const row of data || []) {
    const entry = stats.get(row.project_id);
    if (!entry) continue;
    entry.total += 1;
    if (row.status === 'done') entry.done += 1;
    if (row.status === 'in_progress') entry.inProgress += 1;
  }

  return stats;
};

export const computeTaskProgress = (stats?: TaskStats | null): number => {
  if (!stats || stats.total === 0) return 0;
  return Math.round((stats.done / stats.total) * 100);
};
