-- Cover content approval foreign keys added after the baseline index migration.

CREATE INDEX IF NOT EXISTS idx_projects_approved_by
  ON public.projects(approved_by);

CREATE INDEX IF NOT EXISTS idx_achievements_approved_by
  ON public.achievements(approved_by);

CREATE INDEX IF NOT EXISTS idx_gallery_events_approved_by
  ON public.gallery_events(approved_by);
