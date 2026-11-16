-- ============================================================================
-- QA: assign a known password to the QA school admin account
-- (admin.qa+20260821@example.com, UUID 0069eda0-1ddb-4d28-b7c3-997b813c491c).
--
-- The account was created via UI signup, so its original password is an
-- unrecoverable bcrypt hash. This sets a known shared test password using the
-- same bcrypt format GoTrue stores (pgcrypto crypt/gen_salt bf 10).
--
-- Targeted strictly by id + email so no other user can be affected.
-- Idempotent; safe to re-apply.
-- ============================================================================

DO $$
DECLARE
  v_target_id UUID := '0069eda0-1ddb-4d28-b7c3-997b813c491c';
  v_target_email TEXT := 'admin.qa+20260821@example.com';
  v_updated INT;
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt('QaAdmin!2026', gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = v_target_id AND email = v_target_email;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'QA admin account not found (id=%, email=%)', v_target_id, v_target_email;
  END IF;

  RAISE NOTICE 'QA admin password set for %', v_target_email;
END $$;
