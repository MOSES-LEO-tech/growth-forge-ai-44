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

export const generateRecommendations = async (
  type: 'scholarship' | 'profile' | 'actions' | 'all'
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return { success: false, error: 'No active session' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-recommendations', {
      body: { type },
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return { success: false, error: error.message || 'Failed to generate recommendations' };
  }
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
