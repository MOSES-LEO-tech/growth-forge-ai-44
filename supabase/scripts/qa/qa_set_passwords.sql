-- ============================================================================
-- QA: assign a known password to the 6 seeded QA student accounts.
--
-- The accounts in qa_seed.sql were created with an empty encrypted_password,
-- so they could not be used for password login. This sets a shared test
-- password (bcrypt via pgcrypto, matching GoTrue's storage format).
--
-- Targeted strictly by the fixed UUIDs from qa_seed.sql so no other users
-- can ever be affected. Idempotent; safe to re-apply.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE auth.users
SET encrypted_password = crypt('QaStudent!2026', gen_salt('bf', 10)),
    updated_at = now()
WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006'
);
