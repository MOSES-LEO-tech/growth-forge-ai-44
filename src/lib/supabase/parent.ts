import { supabase } from '@/integrations/supabase/client';

export const getChildren = async (parentId: string) => {
  const { data, error } = await supabase
    .from('parent_student_relationships')
    .select('student_id, profiles!parent_student_relationships_student_id_fkey(id, full_name, avatar_url, grade_level, school_id)')
    .eq('parent_id', parentId);

  if (error) throw error;

  return (data || []).map(link => {
    const profile = link.profiles as any;
    return {
      id: profile?.id,
      full_name: profile?.full_name || 'Unknown',
      email: '',
      avatar_url: profile?.avatar_url,
      grade: profile?.grade_level,
      school_name: 'School'
    };
  });
};

export const getChildOverview = async (childId: string) => {
  const [
    { data: profile, error: profileError },
    { data: projects, error: projectsError },
    { data: achievements, error: achievementsError },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', childId).single(),
    supabase.from('projects').select('*').eq('owner_id', childId),
    supabase.from('achievements').select('*').eq('user_id', childId),
  ]);

  if (profileError) throw profileError;

  const projectsCount = projects?.length || 0;
  const projectsCompleted = projects?.filter(p => p.status === 'complete').length || 0;
  const achievementsCount = achievements?.length || 0;
  const verifiedAchievementsCount = achievements?.filter(a => a.verified).length || 0;

  const recentActivity = [
    ...(projects || []).map(p => ({
      type: 'project',
      label: p.title,
      status_text: p.status || 'pending',
      created_at: p.created_at
    })),
    ...(achievements || []).map(a => ({
      type: 'achievement',
      label: a.title,
      status_text: a.verified ? 'verified' : 'pending',
      created_at: a.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return {
    student: {
      id: profile!.id,
      fullName: profile!.full_name,
      email: '',
      avatarUrl: profile!.avatar_url || '',
      grade: profile!.grade_level || '',
      school: null
    },
    stats: {
      projectsCount,
      projectsCompleted,
      achievementsCount,
      verifiedAchievementsCount,
      level: 'basic',
      points: 0
    },
    recentActivity
  };
};

export const getChildProjects = async (childId: string | number) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', String(childId))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getChildAchievements = async (childId: string | number, params?: { category?: string }) => {
  let query = supabase
    .from('achievements')
    .select('*')
    .eq('user_id', String(childId));

  if (params?.category) {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query.order('date_earned', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getPlan = async (_parentId: string) => {
  return {
    tier: 'basic',
    features: ['basic_monitoring', 'messaging'],
    updatedAt: null
  };
};
