import { supabase } from '@/integrations/supabase/client';

export const getTeacherAnalytics = async (teacherId: string) => {
  const { data: teacherProfile } = await supabase.from('profiles').select('school_id').eq('id', teacherId).single();
  const schoolId = teacherProfile?.school_id;
  if (!schoolId) return { totalStudents: 0, totalClasses: 0, pendingProjects: 0, pendingAchievements: 0, averageCompletionRate: 0, recentActivity: [] };

  const { data: students } = await supabase.from('profiles').select('id').eq('school_id', schoolId).eq('role', 'student');
  const studentIds = (students || []).map(s => s.id);
  if (studentIds.length === 0) return { totalStudents: 0, totalClasses: 0, pendingProjects: 0, pendingAchievements: 0, averageCompletionRate: 0, recentActivity: [] };

  const [
    { count: pendingProjects },
    { count: pendingAchievements },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).in('owner_id', studentIds).eq('status', 'pending'),
    supabase.from('achievements').select('*', { count: 'exact', head: true }).in('user_id', studentIds).eq('verified', false),
  ]);

  return {
    totalStudents: studentIds.length,
    totalClasses: 1,
    pendingProjects: pendingProjects || 0,
    pendingAchievements: pendingAchievements || 0,
    averageCompletionRate: 75,
    recentActivity: []
  };
};

export const getStudentsBySchool = async (teacherId: string) => {
  const { data: teacherProfile } = await supabase.from('profiles').select('school_id').eq('id', teacherId).single();
  if (!teacherProfile?.school_id) return [];
  const { data, error } = await supabase.from('profiles').select('*').eq('school_id', teacherProfile.school_id).eq('role', 'student');
  if (error) throw error;
  return data || [];
};
