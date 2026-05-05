import type { Scholarship } from '@/integrations/supabase/types';
import { invokePublicData } from './publicData';

export const getScholarships = async () => {
  const { scholarships } = await invokePublicData<{ scholarships: Scholarship[] }>('scholarships');
  return scholarships;
};

export const searchScholarships = async (query: string) => {
  const { scholarships } = await invokePublicData<{ scholarships: Scholarship[] }>('scholarships', { search: query });
  return scholarships;
};

export const getScholarship = async (id: string) => {
  const { scholarship } = await invokePublicData<{ scholarship: Scholarship }>('scholarship_detail', { id });
  return scholarship;
};
