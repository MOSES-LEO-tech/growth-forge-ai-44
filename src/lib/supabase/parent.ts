import { supabase } from '@/integrations/supabase/client';

export const getChildren = async (parentId: string) => {
  const { data, error } = await supabase
    .from('parent_child_links')
    .select('child_id, profiles!parent_child_links_child_id_fkey(*, schools(name))')
    .eq('parent_id', parentId);

  if (error) throw error;

  return data.map(link => {
    const profile = link.profiles as any;
    return {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      grade: profile.grade_level,
      school_name: profile.schools?.name || 'No school'
    };
  });
};

export const getChildOverview = async (childId: string) => {
  const [
    { data: profile, error: profileError },
    { data: projects, error: projectsError },
    { data: achievements, error: achievementsError },
    { data: level, error: levelError }
  ] = await Promise.all([
    supabase.from('profiles').select('*, schools(*)').eq('id', childId).single(),
    supabase.from('projects').select('*').eq('user_id', childId).is('deleted_at', null),
    supabase.from('achievements').select('*').eq('user_id', childId),
    supabase.from('student_levels').select('*').eq('user_id', childId).single()
  ]);

  if (profileError) throw profileError;
  if (projectsError) throw projectsError;
  if (achievementsError) throw achievementsError;

  const projectsCount = projects?.length || 0;
  const projectsCompleted = projects?.filter(p => p.status === 'complete').length || 0;
  const achievementsCount = achievements?.length || 0;
  const verifiedAchievementsCount = achievements?.filter(a => a.verified).length || 0;

  // Combine recent activity
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
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      grade: profile.grade_level,
      school: profile.schools
    },
    stats: {
      projectsCount,
      projectsCompleted,
      achievementsCount,
      verifiedAchievementsCount,
      level: level?.level || 1,
      points: level?.points || 0
    },
    recentActivity
  };
};

export const getChildProjects = async (childId: string | number) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, comments(count)')
    .eq('user_id', childId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(p => ({
    ...p,
    files_count: (p.media_urls as any)?.length || 0,
    my_comments_count: (p.comments as any)?.[0]?.count || 0
  }));
};

export const postProjectComment = async (projectId: string | number, content: string) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      resource_type: 'project',
      resource_id: String(projectId),
      content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getChildAchievements = async (childId: string | number, params?: { category?: string }) => {
  let query = supabase
    .from('achievements')
    .select('*')
    .eq('user_id', childId);

  if (params?.category) {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query.order('date_earned', { ascending: false });

  if (error) throw error;
  return data;
};

export const getPlan = async (parentId: string) => {
  // Mocked for now
  return {
    tier: 'basic',
    features: ['basic_monitoring', 'messaging'],
    updatedAt: null
  };
};
