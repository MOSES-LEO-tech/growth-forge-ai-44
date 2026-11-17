import { supabase } from '@/integrations/supabase/client';
import { countCommentsByResource, countProjectFiles } from '@/lib/commentCounts';

/**
 * Children this parent holds an ACTIVE link to.
 *
 * Reads parent_student_links (the consent model), not the retired
 * parent_child_links table. Profile rows are readable because the
 * parent_reads_linked_child_profile policy grants an active parent the child's
 * profile — without it this function found the link, joined nothing, and the
 * dashboard claimed "No children linked yet" while the link existed.
 */
export const getChildren = async (parentId: string) => {
  const { data: links, error: linkError } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', parentId)
    .eq('state', 'active');

  if (linkError) throw linkError;

  const childIds = (links || [])
    .map(link => link.student_id)
    .filter((id): id is string => Boolean(id));

  if (childIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', childIds);

  if (profileError) throw profileError;

  const schoolIds = (profiles || [])
    .map(p => p.school_id)
    .filter((id): id is string => Boolean(id));

  const { data: schools } = schoolIds.length
    ? await supabase.from('schools').select('id, name').in('id', schoolIds)
    : { data: [] };

  const schoolNameById = new Map((schools || []).map(s => [s.id, s.name]));

  return (profiles || []).map(profile => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    avatar_url: profile.avatar_url,
    grade: profile.grade_level,
    school_name: schoolNameById.get(profile.school_id ?? '') || 'No school'
  }));
};

export const getChildOverview = async (childId: string) => {
  const [
    { data: profile, error: profileError },
    { data: projects, error: projectsError },
    { data: achievements, error: achievementsError }
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', childId).single(),
    supabase.from('projects').select('*').eq('user_id', childId).is('deleted_at', null),
    supabase.from('achievements').select('*').eq('user_id', childId)
  ]);

  if (profileError) throw profileError;
  if (projectsError) throw projectsError;
  if (achievementsError) throw achievementsError;

  let school: { name: string; location: string | null } | null = null;
  if (profile.school_id) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, location')
      .eq('id', profile.school_id)
      .maybeSingle();
    school = schoolData;
  }

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
      fullName: profile.full_name ?? '',
      email: profile.email ?? '',
      avatarUrl: profile.avatar_url ?? undefined,
      grade: profile.grade_level ?? undefined,
      school: school ? { name: school.name, location: school.location ?? undefined } : null
    },
    stats: {
      projectsCount,
      projectsCompleted,
      achievementsCount,
      verifiedAchievementsCount
    },
    recentActivity
  };
};

/**
 * A child's projects, with the counts the parent card shows.
 *
 * Comments are counted in a second query: `comments` is polymorphic
 * (resource_type/resource_id), so `comments(count)` cannot be embedded in a
 * projects select — asking for it returned "Could not find a relationship
 * between 'projects' and 'comments'". The count is the number the viewer sent,
 * which is what the card's "Encourage (N sent)" label claims.
 */
export const getChildProjects = async (childId: string | number) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', String(childId))
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const projects = data ?? [];
  const counts = await countViewerComments(projects.map((project) => String(project.id)));

  return projects.map((project) => ({
    ...project,
    files_count: countProjectFiles(project.media_urls),
    my_comments_count: counts[String(project.id)] ?? 0,
  }));
};

/** Comments this viewer left on the given projects. Failure is non-fatal. */
const countViewerComments = async (projectIds: string[]): Promise<Record<string, number>> => {
  if (projectIds.length === 0) return {};

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return {};

  const { data, error } = await supabase
    .from('comments')
    .select('resource_id')
    .eq('user_id', auth.user.id)
    .eq('resource_type', 'project')
    .in('resource_id', projectIds);

  if (error) return {};
  return countCommentsByResource(data ?? []);
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
    .eq('user_id', String(childId));

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
