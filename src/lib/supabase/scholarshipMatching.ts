import { supabase } from '@/integrations/supabase/client';

export interface ScholarshipMatch {
  id: string;
  title: string;
  description?: string | null;
  amount?: number | null;
  deadline?: string | null;
  organization?: string | null;
  application_url?: string | null;
  match_score: 'high' | 'medium' | 'low';
  match_reason: string;
  requirements?: string[] | string | null;
}

export const getScholarshipMatches = async (
  userId: string,
): Promise<{ matches: ScholarshipMatch[] }> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  const { data, error } = await supabase.functions.invoke('match-scholarships', {
    body: { userId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  return data as { matches: ScholarshipMatch[] };
};
