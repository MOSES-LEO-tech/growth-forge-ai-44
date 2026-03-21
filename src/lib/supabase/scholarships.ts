import { supabase } from '@/integrations/supabase/client';
import type { Scholarship } from '@/integrations/supabase/types';

export const getScholarships = async () => {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .order('deadline');

  if (error) throw error;
  return data as Scholarship[];
};

export const getScholarship = async (id: string) => {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Scholarship;
};
