import { supabase } from '@/integrations/supabase/client';

// Recommendations don't have a dedicated table yet.
// The edge function generates them and we can cache in ai_response_cache.
export const getRecommendations = async (userId: string) => {
  const { data, error } = await supabase
    .from('ai_response_cache')
    .select('*')
    .eq('user_id', userId)
    .like('cache_key', 'recommendation_%')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(item => ({
    id: item.id,
    type: item.cache_key.replace('recommendation_', ''),
    content: item.response_data,
    created_at: item.created_at,
  }));
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
