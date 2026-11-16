-- School-scoped CMS: pages, news, events, resource library.
-- Reuses the app_private SECURITY DEFINER + public SECURITY INVOKER wrapper convention,
-- the review workflow mirrors the student-content approval pipeline, and every
-- save/publish is snapshotted into cms_content_versions for full version history.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum + tables
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cms_content_status') THEN
    CREATE TYPE public.cms_content_status AS ENUM ('draft', 'pending_review', 'published', 'rejected');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  hero_image_url TEXT,
  status public.cms_content_status NOT NULL DEFAULT 'draft',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_pages_school_slug_unique UNIQUE (school_id, slug)
);

CREATE TABLE IF NOT EXISTS public.cms_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'students', 'staff')),
  status public.cms_content_status NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT false,
  publish_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  audience TEXT NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'students', 'staff')),
  status public.cms_content_status NOT NULL DEFAULT 'draft',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.cms_content_status NOT NULL DEFAULT 'draft',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Version history: full JSONB snapshot per save/publish.
CREATE TABLE IF NOT EXISTS public.cms_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('cms_pages', 'cms_news', 'cms_events', 'cms_resources')),
  entity_id UUID NOT NULL,
  version INT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cms_content_versions_entity_version_unique UNIQUE (entity_type, entity_id, version)
);

CREATE INDEX IF NOT EXISTS cms_content_versions_lookup ON public.cms_content_versions (entity_type, entity_id, version DESC);
CREATE INDEX IF NOT EXISTS cms_pages_school ON public.cms_pages (school_id, status);
CREATE INDEX IF NOT EXISTS cms_news_school ON public.cms_news (school_id, status, publish_at DESC);
CREATE INDEX IF NOT EXISTS cms_events_school ON public.cms_events (school_id, status, event_date);
CREATE INDEX IF NOT EXISTS cms_resources_school ON public.cms_resources (school_id, status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content_versions ENABLE ROW LEVEL SECURITY;

-- cms_pages
DROP POLICY IF EXISTS "cms_pages_anon_published_select" ON public.cms_pages;
CREATE POLICY "cms_pages_anon_published_select" ON public.cms_pages
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "cms_pages_authenticated_select" ON public.cms_pages;
CREATE POLICY "cms_pages_authenticated_select" ON public.cms_pages
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

DROP POLICY IF EXISTS "cms_pages_school_insert" ON public.cms_pages;
CREATE POLICY "cms_pages_school_insert" ON public.cms_pages
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_pages_school_update" ON public.cms_pages;
CREATE POLICY "cms_pages_school_update" ON public.cms_pages
  FOR UPDATE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_pages_school_delete" ON public.cms_pages;
CREATE POLICY "cms_pages_school_delete" ON public.cms_pages
  FOR DELETE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

-- cms_news
DROP POLICY IF EXISTS "cms_news_anon_published_select" ON public.cms_news;
CREATE POLICY "cms_news_anon_published_select" ON public.cms_news
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "cms_news_authenticated_select" ON public.cms_news;
CREATE POLICY "cms_news_authenticated_select" ON public.cms_news
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

DROP POLICY IF EXISTS "cms_news_school_insert" ON public.cms_news;
CREATE POLICY "cms_news_school_insert" ON public.cms_news
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_news_school_update" ON public.cms_news;
CREATE POLICY "cms_news_school_update" ON public.cms_news
  FOR UPDATE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_news_school_delete" ON public.cms_news;
CREATE POLICY "cms_news_school_delete" ON public.cms_news
  FOR DELETE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

-- cms_events
DROP POLICY IF EXISTS "cms_events_anon_published_select" ON public.cms_events;
CREATE POLICY "cms_events_anon_published_select" ON public.cms_events
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "cms_events_authenticated_select" ON public.cms_events;
CREATE POLICY "cms_events_authenticated_select" ON public.cms_events
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

DROP POLICY IF EXISTS "cms_events_school_insert" ON public.cms_events;
CREATE POLICY "cms_events_school_insert" ON public.cms_events
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_events_school_update" ON public.cms_events;
CREATE POLICY "cms_events_school_update" ON public.cms_events
  FOR UPDATE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_events_school_delete" ON public.cms_events;
CREATE POLICY "cms_events_school_delete" ON public.cms_events
  FOR DELETE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

-- cms_resources
DROP POLICY IF EXISTS "cms_resources_anon_published_select" ON public.cms_resources;
CREATE POLICY "cms_resources_anon_published_select" ON public.cms_resources
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "cms_resources_authenticated_select" ON public.cms_resources;
CREATE POLICY "cms_resources_authenticated_select" ON public.cms_resources
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR app_private.current_user_is_teacher_for_school(school_id)
  );

DROP POLICY IF EXISTS "cms_resources_school_insert" ON public.cms_resources;
CREATE POLICY "cms_resources_school_insert" ON public.cms_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_resources_school_update" ON public.cms_resources;
CREATE POLICY "cms_resources_school_update" ON public.cms_resources
  FOR UPDATE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  )
  WITH CHECK (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

DROP POLICY IF EXISTS "cms_resources_school_delete" ON public.cms_resources;
CREATE POLICY "cms_resources_school_delete" ON public.cms_resources
  FOR DELETE TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR app_private.current_user_is_school_admin(school_id)
    OR (created_by = auth.uid() AND app_private.current_user_is_teacher_for_school(school_id))
  );

-- cms_content_versions: read-only via the cms_list_versions RPC; staff of the
-- owning school (or super admin) may read directly. Writes happen only through
-- the SECURITY DEFINER snapshot trigger (table owner bypasses RLS).
DROP POLICY IF EXISTS "cms_content_versions_school_staff_select" ON public.cms_content_versions;
CREATE POLICY "cms_content_versions_school_staff_select" ON public.cms_content_versions
  FOR SELECT TO authenticated
  USING (
    app_private.current_user_is_super_admin()
    OR (
      entity_type = 'cms_pages'
      AND EXISTS (
        SELECT 1 FROM public.cms_pages p
        WHERE p.id = entity_id
          AND (app_private.current_user_is_school_admin(p.school_id)
               OR app_private.current_user_is_teacher_for_school(p.school_id))
      )
    )
    OR (
      entity_type = 'cms_news'
      AND EXISTS (
        SELECT 1 FROM public.cms_news n
        WHERE n.id = entity_id
          AND (app_private.current_user_is_school_admin(n.school_id)
               OR app_private.current_user_is_teacher_for_school(n.school_id))
      )
    )
    OR (
      entity_type = 'cms_events'
      AND EXISTS (
        SELECT 1 FROM public.cms_events e
        WHERE e.id = entity_id
          AND (app_private.current_user_is_school_admin(e.school_id)
               OR app_private.current_user_is_teacher_for_school(e.school_id))
      )
    )
    OR (
      entity_type = 'cms_resources'
      AND EXISTS (
        SELECT 1 FROM public.cms_resources r
        WHERE r.id = entity_id
          AND (app_private.current_user_is_school_admin(r.school_id)
               OR app_private.current_user_is_teacher_for_school(r.school_id))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Keep updated_at fresh on every content change.
CREATE OR REPLACE FUNCTION app_private.cms_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Enforce the review workflow: only school admins (or super admin) may publish
-- directly. Anyone else who attempts to set status = 'published' is forced back
-- to 'pending_review' so a school admin must review it.
CREATE OR REPLACE FUNCTION app_private.cms_enforce_review_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF current_setting('app.cms_approval_bypass', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NOT (app_private.current_user_is_school_admin(NEW.school_id) OR app_private.current_user_is_super_admin()) THEN
    IF NEW.status = 'published' THEN
      NEW.status := 'pending_review';
      NEW.published_at := NULL;
      NEW.published_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Snapshot every insert/update into cms_content_versions (version = max + 1).
CREATE OR REPLACE FUNCTION app_private.cms_snapshot_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_version INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM public.cms_content_versions
  WHERE entity_type = TG_TABLE_NAME
    AND entity_id = NEW.id;

  INSERT INTO public.cms_content_versions (entity_type, entity_id, version, content, created_by)
  VALUES (TG_TABLE_NAME, NEW.id, v_version, to_jsonb(NEW), auth.uid());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cms_pages_touch_updated_at ON public.cms_pages;
CREATE TRIGGER cms_pages_touch_updated_at
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_touch_updated_at();
DROP TRIGGER IF EXISTS cms_pages_enforce_review_workflow ON public.cms_pages;
CREATE TRIGGER cms_pages_enforce_review_workflow
  BEFORE INSERT OR UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_enforce_review_workflow();
DROP TRIGGER IF EXISTS cms_pages_snapshot_version ON public.cms_pages;
CREATE TRIGGER cms_pages_snapshot_version
  AFTER INSERT OR UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_snapshot_version();

DROP TRIGGER IF EXISTS cms_news_touch_updated_at ON public.cms_news;
CREATE TRIGGER cms_news_touch_updated_at
  BEFORE UPDATE ON public.cms_news
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_touch_updated_at();
DROP TRIGGER IF EXISTS cms_news_enforce_review_workflow ON public.cms_news;
CREATE TRIGGER cms_news_enforce_review_workflow
  BEFORE INSERT OR UPDATE ON public.cms_news
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_enforce_review_workflow();
DROP TRIGGER IF EXISTS cms_news_snapshot_version ON public.cms_news;
CREATE TRIGGER cms_news_snapshot_version
  AFTER INSERT OR UPDATE ON public.cms_news
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_snapshot_version();

DROP TRIGGER IF EXISTS cms_events_touch_updated_at ON public.cms_events;
CREATE TRIGGER cms_events_touch_updated_at
  BEFORE UPDATE ON public.cms_events
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_touch_updated_at();
DROP TRIGGER IF EXISTS cms_events_enforce_review_workflow ON public.cms_events;
CREATE TRIGGER cms_events_enforce_review_workflow
  BEFORE INSERT OR UPDATE ON public.cms_events
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_enforce_review_workflow();
DROP TRIGGER IF EXISTS cms_events_snapshot_version ON public.cms_events;
CREATE TRIGGER cms_events_snapshot_version
  AFTER INSERT OR UPDATE ON public.cms_events
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_snapshot_version();

DROP TRIGGER IF EXISTS cms_resources_touch_updated_at ON public.cms_resources;
CREATE TRIGGER cms_resources_touch_updated_at
  BEFORE UPDATE ON public.cms_resources
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_touch_updated_at();
DROP TRIGGER IF EXISTS cms_resources_enforce_review_workflow ON public.cms_resources;
CREATE TRIGGER cms_resources_enforce_review_workflow
  BEFORE INSERT OR UPDATE ON public.cms_resources
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_enforce_review_workflow();
DROP TRIGGER IF EXISTS cms_resources_snapshot_version ON public.cms_resources;
CREATE TRIGGER cms_resources_snapshot_version
  AFTER INSERT OR UPDATE ON public.cms_resources
  FOR EACH ROW EXECUTE FUNCTION app_private.cms_snapshot_version();

-- ---------------------------------------------------------------------------
-- RPCs (app_private SECURITY DEFINER + public SECURITY INVOKER wrappers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_private.cms_entity_school(p_entity_type TEXT, p_entity_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  EXECUTE format('SELECT school_id FROM public.%I WHERE id = $1', p_entity_type)
    INTO v_school_id USING p_entity_id;
  RETURN v_school_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.cms_assert_valid_entity(p_entity_type TEXT)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
BEGIN
  IF p_entity_type NOT IN ('cms_pages', 'cms_news', 'cms_events', 'cms_resources') THEN
    RAISE EXCEPTION 'Invalid CMS entity type.';
  END IF;
END;
$$;

-- Author/teacher: draft -> pending_review.
CREATE OR REPLACE FUNCTION app_private.cms_submit_for_review(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM app_private.cms_assert_valid_entity(p_entity_type);

  v_school_id := app_private.cms_entity_school(p_entity_type, p_entity_id);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Content not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id)
          OR app_private.current_user_is_teacher_for_school(v_school_id)
          OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only school staff can submit content for review.';
  END IF;

  PERFORM set_config('app.cms_approval_bypass', 'on', true);
  EXECUTE format('UPDATE public.%I SET status = ''pending_review'', published_at = NULL, published_by = NULL, updated_at = now() WHERE id = $1', p_entity_type)
    USING p_entity_id;
  PERFORM set_config('app.cms_approval_bypass', 'off', true);

  PERFORM app_private.log_admin_action('cms_submit_for_review', p_entity_type, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'pending_review');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_submit_for_review(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.cms_submit_for_review(p_entity_type, p_entity_id);
$$;

-- School admin: pending_review/draft -> published.
CREATE OR REPLACE FUNCTION app_private.cms_publish(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM app_private.cms_assert_valid_entity(p_entity_type);

  v_school_id := app_private.cms_entity_school(p_entity_type, p_entity_id);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Content not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this school''s admin can publish content.';
  END IF;

  PERFORM set_config('app.cms_approval_bypass', 'on', true);
  EXECUTE format('UPDATE public.%I SET status = ''published'', published_at = now(), published_by = auth.uid(), reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = NULL, updated_at = now() WHERE id = $1', p_entity_type)
    USING p_entity_id;
  PERFORM set_config('app.cms_approval_bypass', 'off', true);

  PERFORM app_private.log_admin_action('cms_publish', p_entity_type, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'published');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_publish(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.cms_publish(p_entity_type, p_entity_id);
$$;

-- School admin: -> rejected with reason.
CREATE OR REPLACE FUNCTION app_private.cms_reject(p_entity_type TEXT, p_entity_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_reason TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM app_private.cms_assert_valid_entity(p_entity_type);

  v_school_id := app_private.cms_entity_school(p_entity_type, p_entity_id);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Content not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this school''s admin can reject content.';
  END IF;

  v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');

  PERFORM set_config('app.cms_approval_bypass', 'on', true);
  EXECUTE format('UPDATE public.%I SET status = ''rejected'', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = $2, updated_at = now() WHERE id = $1', p_entity_type)
    USING p_entity_id, v_reason;
  PERFORM set_config('app.cms_approval_bypass', 'off', true);

  PERFORM app_private.log_admin_action('cms_reject', p_entity_type, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id, 'reason', v_reason));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_reject(p_entity_type TEXT, p_entity_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.cms_reject(p_entity_type, p_entity_id, p_reason);
$$;

-- Version history (school staff read, DESC by version).
CREATE OR REPLACE FUNCTION app_private.cms_list_versions(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM app_private.cms_assert_valid_entity(p_entity_type);

  v_school_id := app_private.cms_entity_school(p_entity_type, p_entity_id);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Content not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id)
          OR app_private.current_user_is_teacher_for_school(v_school_id)
          OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only school staff can view version history.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'entity_type', entity_type,
      'entity_id', entity_id,
      'version', version,
      'content', content,
      'created_by', created_by,
      'created_at', created_at
    ) ORDER BY version DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.cms_content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_list_versions(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.cms_list_versions(p_entity_type, p_entity_id);
$$;

-- School admin: restore a historical snapshot onto the row (as a new draft revision).
CREATE OR REPLACE FUNCTION app_private.cms_restore_version(p_entity_type TEXT, p_entity_id UUID, p_version INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_snapshot JSONB;
  v_set TEXT := '';
  v_key TEXT;
  v_next_version INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  PERFORM app_private.cms_assert_valid_entity(p_entity_type);

  v_school_id := app_private.cms_entity_school(p_entity_type, p_entity_id);
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Content not found.';
  END IF;

  IF NOT (app_private.current_user_is_school_admin(v_school_id) OR app_private.current_user_is_super_admin()) THEN
    RAISE EXCEPTION 'Only this school''s admin can restore versions.';
  END IF;

  SELECT content INTO v_snapshot
  FROM public.cms_content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND version = p_version;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Version not found.';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(v_snapshot) LOOP
    IF v_key NOT IN ('id', 'school_id', 'status', 'published_at', 'published_by',
                     'reviewed_by', 'reviewed_at', 'rejection_reason',
                     'created_by', 'created_at', 'updated_at') THEN
      v_set := v_set || format('%I = v.%I, ', v_key, v_key);
    END IF;
  END LOOP;

  v_set := v_set || 'status = ''draft'', published_at = NULL, published_by = NULL,
    reviewed_by = NULL, reviewed_at = NULL, rejection_reason = NULL, updated_at = now()';

  PERFORM set_config('app.cms_approval_bypass', 'on', true);
  EXECUTE format(
    'UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I, $2) v WHERE t.id = $1',
    p_entity_type, v_set, p_entity_type
  ) USING p_entity_id, v_snapshot;
  PERFORM set_config('app.cms_approval_bypass', 'off', true);

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.cms_content_versions
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  PERFORM app_private.log_admin_action('cms_restore_version', p_entity_type, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id, 'version', p_version, 'new_version', v_next_version));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id,
    'status', 'draft', 'version', v_next_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.cms_restore_version(p_entity_type TEXT, p_entity_id UUID, p_version INT)
RETURNS JSONB
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, app_private, pg_temp
AS $$
  SELECT app_private.cms_restore_version(p_entity_type, p_entity_id, p_version);
$$;

GRANT EXECUTE ON FUNCTION public.cms_submit_for_review(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_publish(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_reject(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_list_versions(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cms_restore_version(TEXT, UUID, INT) TO authenticated;






