import { supabase } from '@/integrations/supabase/client';
import type { School } from '@/integrations/supabase/types';

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
    { count: students, error: studentsError },
    { count: teachers, error: teachersError },
    { count: achievements, error: achievementsError },
    { count: projects, error: projectsError }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('role', 'teacher'),
    supabase.from('achievements').select('*, profiles!inner(school_id)', { count: 'exact', head: true }).eq('profiles.school_id', schoolId).eq('verified', true),
    supabase.from('projects').select('*, profiles!inner(school_id)', { count: 'exact', head: true }).eq('profiles.school_id', schoolId)
  ]);

  if (studentsError) throw studentsError;
  if (teachersError) throw teachersError;

  return {
    totalStudents: students || 0,
    totalTeachers: teachers || 0,
    totalParents: 0, // Not easily trackable without a join on parent_child_links
    totalProjects: projects || 0,
    achievementCompletions: achievements || 0,
    aiUsageCount: 0,
    storageUsed: 0
  };
};

export const getSchoolUsers = async (schoolId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('school_id', schoolId);

  if (error) throw error;

  return {
    students: data.filter(u => u.role === 'student'),
    teachers: data.filter(u => u.role === 'teacher'),
    parents: data.filter(u => u.role === 'parent'),
    admins: data.filter(u => u.role === 'admin')
  };
};

export const getSchool = async (id: string) => {
  const { data, error } = await supabase
    .from('schools')
    .select('*, profiles(count), projects(count)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    student_count: (data.profiles as any)?.[0]?.count || 0,
    project_count: (data.projects as any)?.[0]?.count || 0
  };
};
