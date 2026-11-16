-- Gallery organization: folders + tags
-- Adds a gallery_folders table and folder_id/tags columns to the gallery
-- event tables so students can organize their gallery content.

-- 1. gallery_folders table (owner-scoped)
CREATE TABLE IF NOT EXISTS public.gallery_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_folders_user_id_idx ON public.gallery_folders(user_id);

ALTER TABLE public.gallery_folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_folders' AND policyname = 'gallery_folders_owner_select') THEN
    CREATE POLICY "gallery_folders_owner_select" ON public.gallery_folders FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_folders' AND policyname = 'gallery_folders_owner_insert') THEN
    CREATE POLICY "gallery_folders_owner_insert" ON public.gallery_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_folders' AND policyname = 'gallery_folders_owner_update') THEN
    CREATE POLICY "gallery_folders_owner_update" ON public.gallery_folders FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gallery_folders' AND policyname = 'gallery_folders_owner_delete') THEN
    CREATE POLICY "gallery_folders_owner_delete" ON public.gallery_folders FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Add folder_id + tags to the canonical gallery_events table
ALTER TABLE public.gallery_events
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.gallery_folders(id) ON DELETE SET NULL;
ALTER TABLE public.gallery_events
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS gallery_events_folder_id_idx ON public.gallery_events(folder_id);
CREATE INDEX IF NOT EXISTS gallery_events_tags_gin_idx ON public.gallery_events USING GIN(tags);

-- 3. Keep the legacy events relation consistent
--    - If it's a real table, add the same columns.
--    - If it's the compatibility view over gallery_events, recreate it so the
--      new columns are visible to the dual-table fallback in the client lib.
DO $$
DECLARE
  relkind_value CHAR;
BEGIN
  SELECT c.relkind INTO relkind_value
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'events';

  IF relkind_value = 'r' THEN
    ALTER TABLE public.events
      ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.gallery_folders(id) ON DELETE SET NULL;
    ALTER TABLE public.events
      ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS events_folder_id_idx ON public.events(folder_id);
    CREATE INDEX IF NOT EXISTS events_tags_gin_idx ON public.events USING GIN(tags);
  ELSIF relkind_value = 'v' THEN
    CREATE OR REPLACE VIEW public.events AS
      SELECT id, user_id, title, description, location, event_date, is_public,
             created_at, deleted_at, folder_id, tags
      FROM public.gallery_events;
  END IF;
END $$;
