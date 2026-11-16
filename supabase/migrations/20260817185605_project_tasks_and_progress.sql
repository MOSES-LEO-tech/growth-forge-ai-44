-- P2: Project tasks + real progress
-- Adds the project_tasks table (checklist-depth), owner-scoped RLS mirroring the
-- live projects policies, and a trigger that re-pends project approval whenever
-- tasks change (mirrors app_private.guard_project_approval_update).

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, position);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- Mirror the live projects owner policies (20260501010000_dashboard_schema_repair.sql):
-- read = owner OR user OR collaborator; write = owner OR user.
DROP POLICY IF EXISTS project_tasks_owner_select ON public.project_tasks;
CREATE POLICY project_tasks_owner_select ON public.project_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid() OR auth.uid() = ANY(COALESCE(p.collaborators, '{}')))
    )
  );

DROP POLICY IF EXISTS project_tasks_owner_insert ON public.project_tasks;
CREATE POLICY project_tasks_owner_insert ON public.project_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS project_tasks_owner_update ON public.project_tasks;
CREATE POLICY project_tasks_owner_update ON public.project_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS project_tasks_owner_delete ON public.project_tasks;
CREATE POLICY project_tasks_owner_delete ON public.project_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

-- Re-pend project approval whenever its tasks change. Runs as SECURITY DEFINER so it
-- can touch project approval fields; the existing BEFORE UPDATE guard on projects is
-- bypassed via the same app.content_approval_bypass knob used by the approval RPCs.
CREATE OR REPLACE FUNCTION app_private.pend_project_approval_on_task_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_project_id UUID;
BEGIN
  IF current_setting('app.content_approval_bypass', true) = 'on' THEN
    RETURN NULL;
  END IF;

  target_project_id := COALESCE(NEW.project_id, OLD.project_id);
  IF target_project_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM set_config('app.content_approval_bypass', 'on', true);
  UPDATE public.projects
     SET updated_at = now(),
         approval_status = 'pending',
         approved_by = NULL,
         approved_at = NULL,
         rejection_reason = NULL,
         verified = false
   WHERE id = target_project_id;
  PERFORM set_config('app.content_approval_bypass', 'off', true);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS project_tasks_pend_project_approval ON public.project_tasks;
CREATE TRIGGER project_tasks_pend_project_approval
  AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION app_private.pend_project_approval_on_task_change();
