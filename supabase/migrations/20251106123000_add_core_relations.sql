-- Strengthen core relations between schools, events, projects, achievements
-- and normalize project collaborators. Backwards-compatible, additive only.

-- ========== Events → Schools ==========
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_school_id ON public.events(school_id);

-- ========== Projects → Schools ==========
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_school_id ON public.projects(school_id);

-- ========== Achievements → Schools (optional attribution) ==========
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS school_id TEXT REFERENCES public.schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_achievements_school_id ON public.achievements(school_id);

-- ========== Project Collaborators (normalized) ==========
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- Allow owners/collaborators to view; admins can view all
CREATE POLICY IF NOT EXISTS "Project collaborators: view where user is member or owner"
  ON public.project_collaborators FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR auth.uid() = ANY(p.collaborators))
    )
  );

-- Allow project owners to add; users can add themselves; admins manage all
CREATE POLICY IF NOT EXISTS "Project collaborators: insert"
  ON public.project_collaborators FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- Allow owners to remove; users can remove themselves; admins manage all
CREATE POLICY IF NOT EXISTS "Project collaborators: delete"
  ON public.project_collaborators FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin') OR
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON public.project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON public.project_collaborators(user_id);

-- ========== Helpful uniqueness/indexes ==========
CREATE INDEX IF NOT EXISTS idx_parent_student_parent ON public.parent_student_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student ON public.parent_student_relationships(student_id);


