import { supabase } from '@/integrations/supabase/client';
import type { Recommendation } from '@/integrations/supabase/types';

export const getRecommendations = async (userId: string) => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Recommendation[];
};

export const getRecommendationsByType = async (userId: string, type: 'scholarship' | 'profile' | 'actions') => {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Recommendation[];
};
