-- Performance Optimization Indexes
-- Run this migration to add performance-critical indexes

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_status ON public.projects(owner_id, status);

-- Achievements indexes  
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_date_earned ON public.achievements(date_earned DESC);

-- Scholarships indexes
CREATE INDEX IF NOT EXISTS idx_scholarships_school_id ON public.scholarships(school_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON public.scholarships(deadline ASC);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline_active ON public.scholarships(deadline ASC) WHERE deadline >= CURRENT_DATE;

-- Student levels indexes
CREATE INDEX IF NOT EXISTS idx_student_levels_user_id ON public.student_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_student_levels_points ON public.student_levels(points DESC);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON public.recommendations(type);
CREATE INDEX IF NOT EXISTS idx_recommendations_created_at ON public.recommendations(created_at DESC);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON public.events(is_public) WHERE is_public = true;

-- Scholarship applications indexes
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_user_id ON public.scholarship_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_scholarship_id ON public.scholarship_applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_status ON public.scholarship_applications(status);

-- Analysis function for slow queries
CREATE OR REPLACE FUNCTION public.analyze_slow_queries(min_duration_ms INTEGER DEFAULT 1000)
RETURNS TABLE(
  queryid BIGINT,
  calls BIGINT,
  total_time NUMERIC,
  mean_time NUMERIC,
  query TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.queryid,
    q.calls::BIGINT,
    q.total_time::NUMERIC,
    q.mean_time::NUMERIC,
    q.query::TEXT
  FROM pg_stat_statements q
  WHERE q.mean_time > min_duration_ms
  ORDER BY q.mean_time DESC
  LIMIT 20;
END;
$$;

-- Auto-vaccuum settings (run these as superuser)
ALTER TABLE public.profiles SET (autovacuum_vacuum_threshold = 1000);
ALTER TABLE public.projects SET (autovacuum_vacuum_threshold = 500);
ALTER TABLE public.achievements SET (autovacuum_vacuum_threshold = 500);

-- Analyze tables for query optimizer
ANALYZE public.profiles;
ANALYZE public.projects;
ANALYZE public.achievements;
ANALYZE public.scholarships;
ANALYZE public.student_levels;