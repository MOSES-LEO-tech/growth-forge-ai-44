import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/integrations/supabase/types';
import { uploadProfileAvatar as uploadToStorage } from '@/lib/storage';

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as Profile;
};

export const updateProfile = async (userId: string, data: Partial<Profile>) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select();

  if (error) throw error;
  return (profile && profile.length > 0) ? profile[0] as Profile : null;
};

export const uploadAvatar = async (userId: string, file: File) => {
  const publicUrl = await uploadToStorage(file, userId);

  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select();

  if (dbError) throw dbError;
  return (profile && profile.length > 0) ? profile[0] as Profile : null;
};

export const linkParent = async (studentId: string, parentEmail: string) => {
  // 1. Find parent by email
  const { data: parent, error: parentError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parentEmail)
    .eq('role', 'parent')
    .single();

  if (parentError) throw new Error('Parent not found with this email');

  // 2. Create link
  const { error: linkError } = await supabase
    .from('parent_child_links')
    .insert({
      parent_id: parent.id,
      child_id: studentId
    });

  if (linkError) throw linkError;
};
