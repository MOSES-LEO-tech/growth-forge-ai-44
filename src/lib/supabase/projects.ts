import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/integrations/supabase/types';

export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Project[];
};

export const createProject = async (data: Partial<Project>) => {
  const { data: project, error } = await supabase
    .from('projects')
    .insert(data)
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
    .select('*, profiles(full_name)')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(item => ({
    ...item,
    student_name: (item.profiles as any)?.full_name
  })) as (Project & { student_name: string })[];
};

export const verifyProject = async (id: string) => {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'ongoing' }) // Moving from pending to ongoing upon verification
    .eq('id', id);

  if (error) throw error;
};

export const getProjectDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, comments(*, profiles(full_name, avatar_url))')
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...data,
    feedback: (data.comments || []).map(c => ({
      id: c.id,
      reviewer_name: (c.profiles as any)?.full_name || 'Unknown',
      reviewer_avatar: (c.profiles as any)?.avatar_url,
      comment: c.content,
      rating: 5, // Mocked rating
      created_at: c.created_at
    })),
    media: (data.media_urls || []).map((url, idx) => ({
      id: idx,
      media_url: url,
      media_type: url.endsWith('.pdf') ? 'pdf' : url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image',
      file_name: `File ${idx + 1}`
    }))
  };
};

export const uploadProjectMedia = async (projectId: string, file: File) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${projectId}/${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('project-media')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('project-media')
    .getPublicUrl(filePath);

  // Get current media_urls
  const { data: project } = await supabase.from('projects').select('media_urls').eq('id', projectId).single();
  const currentUrls = project?.media_urls || [];

  const { error: dbError } = await supabase
    .from('projects')
    .update({ media_urls: [...currentUrls, publicUrl] })
    .eq('id', projectId);

  if (dbError) throw dbError;
  return publicUrl;
};
