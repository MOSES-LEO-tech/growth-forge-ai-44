import { supabase } from '@/integrations/supabase/client';

export const getTeacherAnalytics = async (teacherId: string) => {
  // 1. Get teacher's school_id
  const { data: teacherProfile, error: teacherError } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', teacherId)
    .single();

  if (teacherError) throw teacherError;
  const schoolId = teacherProfile.school_id;

  if (!schoolId) {
    return {
      totalStudents: 0,
      totalClasses: 0,
      pendingProjects: 0,
      pendingAchievements: 0,
      averageCompletionRate: 0,
      recentActivity: []
    };
  }

  // 2. Get all students in that school
  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'student');

  if (studentsError) throw studentsError;
  const studentIds = students.map(s => s.id);

  if (studentIds.length === 0) {
    return {
      totalStudents: 0,
      totalClasses: 0,
      pendingProjects: 0,
      pendingAchievements: 0,
      averageCompletionRate: 0,
      recentActivity: []
    };
  }

  // 3. Get pending counts and activity
  const [
    { count: pendingProjects, error: projectsError },
    { count: pendingAchievements, error: achievementsError },
    { data: recentProjects, error: recentProjectsError },
    { data: recentAchievements, error: recentAchievementsError }
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).in('user_id', studentIds).eq('status', 'pending'),
    supabase.from('achievements').select('*', { count: 'exact', head: true }).in('user_id', studentIds).eq('verified', false),
    supabase.from('projects').select('id, title, created_at, user_id, profiles(full_name)').in('user_id', studentIds).order('created_at', { ascending: false }).limit(5),
    supabase.from('achievements').select('id, title, created_at, user_id, profiles(full_name)').in('user_id', studentIds).order('created_at', { ascending: false }).limit(5)
  ]);

  if (projectsError) throw projectsError;
  if (achievementsError) throw achievementsError;
  if (recentProjectsError) throw recentProjectsError;
  if (recentAchievementsError) throw recentAchievementsError;

  // 4. Combine and format recent activity
  const activity = [
    ...(recentProjects || []).map(p => ({
      type: 'project',
      id: p.id,
      title: p.title,
      student_name: (p.profiles as any)?.full_name || 'Unknown',
      created_at: p.created_at
    })),
    ...(recentAchievements || []).map(a => ({
      type: 'achievement',
      id: a.id,
      title: a.title,
      student_name: (a.profiles as any)?.full_name || 'Unknown',
      created_at: a.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return {
    totalStudents: studentIds.length,
    totalClasses: 1, // Mocked for now
    pendingProjects: pendingProjects || 0,
    pendingAchievements: pendingAchievements || 0,
    averageCompletionRate: 75, // Mocked for now
    recentActivity: activity
  };
};

export const getStudentsBySchool = async (teacherId: string) => {
  const { data: teacherProfile, error: teacherError } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', teacherId)
    .single();

  if (teacherError) throw teacherError;
  const schoolId = teacherProfile.school_id;

  if (!schoolId) return [];

  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('*, projects(count), achievements(count)')
    .eq('school_id', schoolId)
    .eq('role', 'student');

  if (studentsError) throw studentsError;

  return students.map(s => ({
    ...s,
    project_count: (s.projects as any)?.[0]?.count || 0,
    achievement_count: (s.achievements as any)?.[0]?.count || 0
  }));
};
