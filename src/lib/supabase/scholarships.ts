import { supabase } from '@/integrations/supabase/client';
import type { Scholarship } from '@/integrations/supabase/types';

export const getScholarships = async () => {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Scholarship[];
};

export const searchScholarships = async (query: string) => {
  const { data, error } = await supabase
    .from('scholarships')
    .select('*')
    .or(`title.ilike.%${query}%,requirements.ilike.%${query}%`)
    .order('created_at', { ascending: false });

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
