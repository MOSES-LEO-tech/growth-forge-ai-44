-- ============================================================================
-- CMS admin-audit fix (follow-up to school_cms.sql)
--
-- app_private.log_admin_action requires super admin, but the CMS review
-- workflow is exercised by school admins and teachers. A school admin calling
-- cms_publish/cms_reject/cms_restore_version (or a teacher calling
-- cms_submit_for_review) would hit that gate and the whole transaction would
-- roll back. These functions are recreated to route audit writes through the
-- school-scoped app_private.log_school_audit_action(...) helper instead.
-- ============================================================================

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

  PERFORM app_private.log_school_audit_action('cms_submit_for_review', p_entity_type, v_school_id, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'pending_review');
END;
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

  PERFORM app_private.log_school_audit_action('cms_publish', p_entity_type, v_school_id, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'published');
END;
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

  PERFORM app_private.log_school_audit_action('cms_reject', p_entity_type, v_school_id, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id, 'reason', v_reason));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'status', 'rejected');
END;
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

  PERFORM app_private.log_school_audit_action('cms_restore_version', p_entity_type, v_school_id, p_entity_id,
    NULL, NULL, jsonb_build_object('school_id', v_school_id, 'version', p_version, 'new_version', v_next_version));

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id,
    'status', 'draft', 'version', v_next_version);
END;
$$;
