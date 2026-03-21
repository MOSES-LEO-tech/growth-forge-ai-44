import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/integrations/supabase/types';

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
    .select()
    .single();

  if (error) throw error;
  return profile as Profile;
};

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (dbError) throw dbError;
  return profile as Profile;
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
