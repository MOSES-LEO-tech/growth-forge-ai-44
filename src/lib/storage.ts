import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = 'portfolio-media';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'video/mp4', 
  'application/pdf'
];

interface UploadOptions {
  onProgress?: (progress: number) => void;
}

const validateFile = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 10MB limit.');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Supported types: JPG, PNG, WEBP, MP4, PDF.`);
  }
};

export const uploadProjectFile = async (
  file: File, 
  userId: string, 
  projectId: string,
  options?: UploadOptions
): Promise<string> => {
  validateFile(file);

  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const filePath = `${userId}/projects/${projectId}/${timestamp}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      // @ts-ignore - Supabase JS SDK types might not always reflect the latest onUploadProgress
      onUploadProgress: (progress) => {
        if (options?.onProgress) {
          const percentage = (progress.loaded / progress.total) * 100;
          options.onProgress(Math.round(percentage));
        }
      }
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
};

export const uploadProfileAvatar = async (
  file: File, 
  userId: string,
  options?: UploadOptions
): Promise<string> => {
  validateFile(file);

  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      // @ts-ignore
      onUploadProgress: (progress) => {
        if (options?.onProgress) {
          const percentage = (progress.loaded / progress.total) * 100;
          options.onProgress(Math.round(percentage));
        }
      }
    });

  if (error) {
    console.error('Avatar upload error:', error);
    throw new Error(`Avatar upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
};

export const deleteFile = async (path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }
};
