import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/integrations/supabase/types';
import { sanitizeProfileUpdate, strippedProtectedFields } from '@/lib/profileFields';
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
  // Mirrors app_private.guard_profile_sensitive_update(): privileged columns
  // (role, school_id, account_status, approved_*) are never sent. The database
  // would raise anyway; stripping here keeps the failure local and explicit.
  const payload = sanitizeProfileUpdate(data);
  const blocked = strippedProtectedFields(data);
  if (blocked.length > 0 && import.meta.env.DEV) {
    console.warn(`updateProfile dropped protected field(s): ${blocked.join(', ')}`);
  }
  if (Object.keys(payload).length === 0) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ ...payload, updated_at: new Date().toISOString() })
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

/**
 * Student invites a parent.
 *
 * Writes through invite_parent_link() instead of inserting into the retired
 * parent_child_links table: a link a browser can create is not consent, so the
 * parent must accept it (or the guardian rule applies for a minor).
 *
 * `studentId` is kept for call-site compatibility; the RPC acts as auth.uid().
 */
export const linkParent = async (_studentId: string, parentEmail: string) => {
  const { data, error } = await supabase.rpc('invite_parent_link', {
    p_parent_email: parentEmail.trim(),
  });

  if (error) throw error;
  return data as { status: string; link_id?: string };
};
