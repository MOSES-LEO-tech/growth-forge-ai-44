import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;

export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Project[];
};

export const createProject = async (data: {
  owner_id: string;
  title: string;
  description?: string;
  start_date?: string;
  status?: string;
}) => {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      owner_id: data.owner_id,
      title: data.title,
      description: data.description || null,
      start_date: data.start_date || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return project as Project;
};

export const updateProject = async (id: string, data: Partial<Project>) => {
  const { data: project, error } = await supabase
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return project as Project;
};

export const getPendingProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, profiles!projects_owner_id_fkey(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(item => ({
    ...item,
    student_name: (item.profiles as any)?.full_name
  }));
};

export const verifyProject = async (id: string) => {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'ongoing' })
    .eq('id', id);

  if (error) throw error;
};

export const getProjectDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Project;
};
