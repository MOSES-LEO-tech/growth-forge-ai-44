-- ============================================================================
-- QA fix: repair manually-seeded auth.users rows so GoTrue can load them.
--
-- GoTrue's User struct scans the token/email-change columns as non-nullable
-- strings. The qa_seed.sql direct inserts left them NULL, which breaks the
-- user lookup ("Database error querying schema" / "Database error loading
-- user"). Align them to empty strings, exactly like GoTrue-created users.
--
-- Targeted strictly by the fixed QA UUIDs. Idempotent; safe to re-apply.
-- ============================================================================

UPDATE auth.users
SET confirmation_token = '',
    recovery_token = '',
    email_change_token_current = '',
    email_change_token_new = '',
    email_change = '',
    phone_change = '',
    phone_change_token = '',
    reauthentication_token = '',
    updated_at = now()
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006'
);
