import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Achievement = Tables<'achievements'>;

export const getAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('date_earned', { ascending: false });

  if (error) throw error;
  return data as Achievement[];
};

export const createAchievement = async (input: {
  user_id: string;
  title: string;
  description?: string;
  category: string;
  date_earned: string;
}) => {
  const { data: achievement, error } = await supabase
    .from('achievements')
    .insert({
      user_id: input.user_id,
      title: input.title,
      description: input.description || null,
      category: input.category,
      date_earned: input.date_earned,
    })
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
  }));
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
