-- P3: Academic document organization
-- project_folders: nested folder hierarchy per project
-- project_files: file metadata (folder, tags, size, storage path) per project
-- project-documents: private storage bucket, owner-scoped by first path segment.

CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.project_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_folders_project ON public.project_folders(project_id, name);
CREATE INDEX IF NOT EXISTS idx_project_folders_parent ON public.project_folders(parent_id);

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_files_project ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_folder ON public.project_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_project_files_tags ON public.project_files USING GIN(tags);

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Folders RLS (mirror projects ownership: read = owner OR user OR collaborator;
-- write = owner OR user).
DROP POLICY IF EXISTS project_folders_select ON public.project_folders;
CREATE POLICY project_folders_select ON public.project_folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid() OR auth.uid() = ANY(COALESCE(p.collaborators, '{}')))
    )
  );

DROP POLICY IF EXISTS project_folders_insert ON public.project_folders;
CREATE POLICY project_folders_insert ON public.project_folders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS project_folders_update ON public.project_folders;
CREATE POLICY project_folders_update ON public.project_folders
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

DROP POLICY IF EXISTS project_folders_delete ON public.project_folders;
CREATE POLICY project_folders_delete ON public.project_folders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

-- Files RLS (same ownership semantics).
DROP POLICY IF EXISTS project_files_select ON public.project_files;
CREATE POLICY project_files_select ON public.project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid() OR auth.uid() = ANY(COALESCE(p.collaborators, '{}')))
    )
  );

DROP POLICY IF EXISTS project_files_insert ON public.project_files;
CREATE POLICY project_files_insert ON public.project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS project_files_update ON public.project_files;
CREATE POLICY project_files_update ON public.project_files
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

DROP POLICY IF EXISTS project_files_delete ON public.project_files;
CREATE POLICY project_files_delete ON public.project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.owner_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

-- Private storage bucket for academic documents.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can access own project documents'
  ) THEN
    CREATE POLICY "Users can access own project documents" ON storage.objects
      FOR ALL USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
