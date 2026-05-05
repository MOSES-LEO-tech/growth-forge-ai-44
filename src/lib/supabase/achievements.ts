import { supabase } from '@/integrations/supabase/client';
import type { Achievement } from '@/integrations/supabase/types';

type PendingAchievementRow = Achievement & {
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export const getAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('date_earned', { ascending: false });

  if (error) throw error;
  return data as Achievement[];
};

export const createAchievement = async (data: Partial<Achievement>) => {
  const { data: achievement, error } = await supabase
    .from('achievements')
    .insert({ ...data, approval_status: data.approval_status || 'pending', verified: data.verified ?? false })
    .select()
    .single();

  if (error) throw error;
  return achievement as Achievement;
};

export const getPendingAchievements = async () => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*, profiles(full_name,email)')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data || []) as PendingAchievementRow[]).map(item => ({
    ...item,
    student_name: item.profiles?.full_name || null,
    student_email: item.profiles?.email || null
  })) as (Achievement & { student_name: string | null; student_email: string | null })[];
};

export const verifyAchievement = async (id: string) => {
  const { error } = await supabase.rpc('approve_student_achievement', { p_achievement_id: id });

  if (error) throw error;
};

export const rejectAchievement = async (id: string, reason?: string) => {
  const { error } = await supabase.rpc('reject_student_achievement', {
    p_achievement_id: id,
    p_reason: reason || null,
  });

  if (error) throw error;
};

export const deleteAchievement = async (id: string) => {
  const { error } = await supabase
    .from('achievements')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
