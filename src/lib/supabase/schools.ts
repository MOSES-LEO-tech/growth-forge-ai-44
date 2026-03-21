import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type School = Tables<'schools'>;

export const getSchools = async () => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as School[];
};

export const getSchoolMetrics = async (schoolId: string) => {
  const [
    { count: students },
    { count: teachers },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
  ]);
  return { totalStudents: students || 0, totalTeachers: teachers || 0, totalParents: 0, totalProjects: 0, achievementCompletions: 0, aiUsageCount: 0, storageUsed: 0 };
};

export const getSchoolUsers = async (schoolId: string) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('school_id', schoolId);
  if (error) throw error;
  return {
    students: (data || []).filter(u => u.role === 'student'),
    teachers: (data || []).filter(u => u.role === 'teacher'),
    parents: (data || []).filter(u => u.role === 'parent'),
    admins: (data || []).filter(u => u.role === 'admin')
  };
};

export const getSchool = async (id: string) => {
  const { data, error } = await supabase.from('schools').select('*').eq('id', id).single();
  if (error) throw error;
  return data as School;
};
