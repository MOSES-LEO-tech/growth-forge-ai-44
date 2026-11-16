import { describe, it, expect, vi, beforeEach } from 'vitest';

// The data layer talks to Supabase through a fluent, thenable builder:
//   supabase.from(t).select(...).eq(...).order(...).limit(n)   // awaited directly
//   supabase.from(t).select(...).eq(...).single()              // one row
// The stub below answers each `from()` call with the next queued result and
// swallows chained methods, so we can assert on the numbers the function
// derives rather than on how it spells its queries.
type Result = { data?: unknown; error?: unknown; count?: number | null };

const queue: Result[] = [];

function chain(result: Result) {
  const q: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'not', 'is', 'order', 'limit', 'single', 'maybeSingle']) {
    q[method] = () => q;
  }
  q.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const next = queue.shift();
      if (!next) throw new Error('stub queue exhausted — the function made more queries than the test queued');
      return chain(next);
    },
  },
}));

// Imported after the mock is registered.
const { getTeacherAnalytics } = await import('@/lib/supabase/teacher');

const SCHOOL = 'school-1';

/** Queue the two lookups every call makes before Promise.all. */
function queuePreamble(studentIds: string[]) {
  queue.push({ data: { school_id: SCHOOL }, error: null });
  queue.push({ data: studentIds.map(id => ({ id })), error: null });
}

describe('getTeacherAnalytics', () => {
  beforeEach(() => {
    queue.length = 0;
  });

  it('counts distinct, trimmed class names instead of a hardcoded 1', async () => {
    queuePreamble(['s1', 's2']);
    queue.push(
      { count: 2, error: null },            // pending projects
      { count: 1, error: null },            // pending achievements
      { data: [], error: null },            // recent projects
      { data: [], error: null },            // recent achievements
      { data: [                             // class rows
          { class_name: 'Grade 9' },
          { class_name: 'Grade 9' },
          { class_name: ' Grade 10 ' },
          { class_name: null },
          { class_name: '' },
        ], error: null },
      { count: 4, error: null },            // total projects
      { count: 1, error: null },            // completed projects
    );

    const result = await getTeacherAnalytics('teacher-1');

    expect(result.totalStudents).toBe(2);
    expect(result.totalClasses).toBe(2);              // was hardcoded 1
    expect(result.averageCompletionRate).toBe(25);    // was hardcoded 75
    expect(result.pendingProjects).toBe(2);
    expect(result.pendingAchievements).toBe(1);
  });

  it('reports 0% (not 75%) when the students have no projects', async () => {
    queuePreamble(['s1']);
    queue.push(
      { count: 0, error: null },
      { count: 0, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    );

    const result = await getTeacherAnalytics('teacher-1');

    expect(result.averageCompletionRate).toBe(0);
    expect(result.totalClasses).toBe(0);
  });

  it('returns zeros without further queries when the teacher has no school', async () => {
    queue.push({ data: { school_id: null }, error: null });

    const result = await getTeacherAnalytics('teacher-1');

    expect(result).toEqual({
      totalStudents: 0,
      totalClasses: 0,
      pendingProjects: 0,
      pendingAchievements: 0,
      averageCompletionRate: 0,
      recentActivity: [],
    });
    expect(queue).toHaveLength(0); // no wasted queries
  });

  it('surfaces a query error instead of returning plausible numbers', async () => {
    queuePreamble(['s1']);
    queue.push(
      { count: null, error: new Error('boom') }, // pending projects fails
      { count: 0, error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    );

    await expect(getTeacherAnalytics('teacher-1')).rejects.toThrow('boom');
  });
});
