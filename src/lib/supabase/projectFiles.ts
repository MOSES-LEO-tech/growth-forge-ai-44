import { supabase } from '@/integrations/supabase/client';
import type { ProjectFile, ProjectFolder } from '@/integrations/supabase/types';

const DOCUMENTS_BUCKET = 'project-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_BUFFER_MS = 60 * 1000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// MIME types students commonly need for academic material.
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const sanitizeFileName = (name: string) => {
  const base = name.replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '-').toLowerCase();
  return base || 'file';
};

export const isAllowedDocumentType = (file: File) => ALLOWED_FILE_TYPES.has(file.type);

export const validateDocumentFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 50MB limit.');
  }
  if (!isAllowedDocumentType(file)) {
    throw new Error(`File type "${file.type || 'unknown'}" is not supported.`);
  }
};

// ---------- Folders ----------

export const getProjectFolders = async (projectId: string) => {
  const { data, error } = await supabase
    .from('project_folders')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as ProjectFolder[];
};

export const createProjectFolder = async (projectId: string, name: string, parentId?: string | null) => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const { data, error } = await supabase
    .from('project_folders')
    .insert({ project_id: projectId, name: trimmed, parent_id: parentId || null })
    .select()
    .single();

  if (error) throw error;
  return data as ProjectFolder;
};

export const renameProjectFolder = async (id: string, name: string) => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const { data, error } = await supabase
    .from('project_folders')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectFolder;
};

export const deleteProjectFolder = async (id: string) => {
  const { error } = await supabase.from('project_folders').delete().eq('id', id);
  if (error) throw error;
};

// ---------- Files ----------

export const getProjectFiles = async (projectId: string) => {
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as ProjectFile[];
};

/** Upload a file to the private documents bucket and record its metadata. */
export const uploadProjectDocument = async (
  projectId: string,
  file: File,
  options: { folderId?: string | null; tags?: string[] }
) => {
  validateDocumentFile(file);

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const safeName = sanitizeFileName(file.name);
  const filePath = `${user.id}/${projectId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      folder_id: options.folderId || null,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      tags: options.tags || [],
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    // Best-effort cleanup of the orphaned storage object.
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
    throw error;
  }

  return data as ProjectFile;
};

export const updateProjectFile = async (
  id: string,
  updates: Partial<Pick<ProjectFile, 'file_name' | 'folder_id' | 'tags'>>
) => {
  const { data, error } = await supabase
    .from('project_files')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectFile;
};

export const deleteProjectFile = async (id: string) => {
  const { data: row } = await supabase.from('project_files').select('file_path').eq('id', id).single();
  const { error } = await supabase.from('project_files').delete().eq('id', id);
  if (error) throw error;

  if (row?.file_path) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([row.file_path]);
  }
};

// ---------- Signed URLs ----------

export const getProjectFileUrl = async (filePath: string) => {
  const trimmed = filePath.replace(/^\/+/, '');
  const cacheKey = `${DOCUMENTS_BUCKET}:${trimmed}`;
  const cached = signedUrlCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn(`Unable to sign document URL for ${trimmed}`, error);
    return '';
  }

  signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 });
  return data.signedUrl;
};

export const getProjectFilePreviewUrl = async (filePath: string) => {
  const url = await getProjectFileUrl(filePath);
  return url ? `${url}` : '';
};

// ---------- Formatting helpers ----------

export const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export type FileCategory = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text' | 'image' | 'archive' | 'other';

export const getFileCategory = (fileType: string, fileName?: string): FileCategory => {
  const name = fileName?.toLowerCase() || '';
  if (fileType === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (fileType.includes('word') || /\.(docx?)$/.test(name)) return 'word';
  if (fileType.includes('excel') || /\.xlsx?$/.test(name) || name.endsWith('.csv')) return 'excel';
  if (fileType.includes('presentation') || /\.pptx?$/.test(name)) return 'powerpoint';
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('text/') || /\.(md|txt)$/.test(name)) return 'text';
  if (fileType.includes('zip') || /\.(zip|rar|7z)$/.test(name)) return 'archive';
  return 'other';
};
