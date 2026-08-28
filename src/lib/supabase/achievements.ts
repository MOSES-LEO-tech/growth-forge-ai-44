import { supabase } from '@/integrations/supabase/client';
import type { Achievement } from '@/integrations/supabase/types';

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
    .insert({ ...data, approval_status: data.approval_status || 'pending', verified: data.verified ?? false } as any)
    .select()
    .single();

  if (error) throw error;
  return achievement as Achievement;
};

export const getPendingAchievements = async (schoolId: string) => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*, profiles!inner(full_name, email, school_id)')
    .eq('approval_status', 'pending')
    .eq('profiles.school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const achievements = data || [];
  return achievements.map(item => {
    const profile = (item as any).profiles;
    return {
      ...item,
      student_name: profile?.full_name || null,
      student_email: profile?.email || null,
    };
  }) as (Achievement & { student_name: string | null; student_email: string | null })[];
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
