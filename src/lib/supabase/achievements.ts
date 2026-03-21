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
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return achievement as Achievement;
};

export const getPendingAchievements = async () => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*, profiles(full_name)')
    .eq('verified', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(item => ({
    ...item,
    student_name: (item.profiles as any)?.full_name
  })) as (Achievement & { student_name: string })[];
};

export const verifyAchievement = async (id: string) => {
  const { error } = await supabase
    .from('achievements')
    .update({ verified: true })
    .eq('id', id);

  if (error) throw error;
};

export const deleteAchievement = async (id: string) => {
  const { error } = await supabase
    .from('achievements')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
