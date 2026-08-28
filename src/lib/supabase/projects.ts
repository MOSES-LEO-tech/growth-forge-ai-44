import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/integrations/supabase/types';
import { getMediaTypeFromUrl, resolveStorageMediaUrl } from './storageMedia';

type PendingProjectRow = Project & {
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

const buildProjectMedia = async (mediaUrls: string[] | null | undefined) =>
  Promise.all((mediaUrls || []).map(async (url: string, idx: number) => {
    const resolvedUrl = await resolveStorageMediaUrl(url, 'project-media');
    const mediaType = getMediaTypeFromUrl(url);

    return {
      id: idx,
      media_url: resolvedUrl,
      media_type: mediaType === 'document' ? 'pdf' : mediaType,
      file_name: `File ${idx + 1}`,
    };
  }));

export const getProjects = async (userId: string) => {
  const attempts = [
    { ownerColumn: 'owner_id', includeDeletedFilter: true },
    { ownerColumn: 'owner_id', includeDeletedFilter: false },
    { ownerColumn: 'user_id', includeDeletedFilter: true },
    { ownerColumn: 'user_id', includeDeletedFilter: false },
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    let query = (supabase as any)
      .from('projects')
      .select('*')
      .eq(attempt.ownerColumn, userId)
      .order('created_at', { ascending: false });

    if (attempt.includeDeletedFilter) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (!error) {
      return data as Project[];
    }

    lastError = error;
  }

  throw lastError;
};

export const createProject = async (data: Partial<Project>) => {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, approval_status: data.approval_status || 'pending' } as any)
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

/** Soft-delete a project: sets deleted_at so it drops out of every list view. */
export const deleteProject = async (id: string) => {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const getPendingProjects = async () => {
  const { data, error } = await (supabase as any)
    .from('projects')
    .select('*, profiles(full_name,email)')
    .eq('approval_status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as PendingProjectRow[]).map(item => ({
    ...item,
    student_name: item.profiles?.full_name || null,
    student_email: item.profiles?.email || null
  })) as (Project & { student_name: string | null; student_email: string | null })[];
};

export const verifyProject = async (id: string) => {
  const { error } = await supabase.rpc('approve_student_project', { p_project_id: id });

  if (error) throw error;
};

export const rejectProject = async (id: string, reason?: string) => {
  const { error } = await supabase.rpc('reject_student_project', {
    p_project_id: id,
    p_reason: reason || null,
  });

  if (error) throw error;
};

export const getProjectDetails = async (id: string) => {
  const { data, error } = await (supabase as any)
    .from('projects')
    .select('*, comments(*, profiles(full_name, avatar_url))')
    .eq('id', id)
    .single();

  if (error) {
    const { data: fallbackData, error: fallbackError } = await (supabase as any)
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (fallbackError) throw fallbackError;

    return {
      ...fallbackData,
      feedback: [],
      media: await buildProjectMedia(fallbackData.media_urls)
    };
  }

  return {
    ...data,
    feedback: (data.comments || []).map((c: any) => ({
      id: c.id,
      reviewer_name: (c.profiles as any)?.full_name || 'Unknown',
      reviewer_avatar: (c.profiles as any)?.avatar_url,
      comment: c.content,
      rating: 5, // Mocked rating
      created_at: c.created_at
    })),
    media: await buildProjectMedia(data.media_urls)
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

  // Get current media_urls
  const { data: project } = await supabase.from('projects').select('media_urls').eq('id', projectId).single();
  const currentUrls = project?.media_urls || [];

  const { error: dbError } = await supabase
    .from('projects')
    .update({ media_urls: [...currentUrls, filePath] })
    .eq('id', projectId);

  if (dbError) throw dbError;
  return filePath;
};
