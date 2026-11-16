-- STEP 2 of 4 — revoke anon/authenticated exposure, cap storage buckets.
-- Safe to run twice. Dashboard -> SQL Editor.

-- Phase 1 / 03 — SECURITY HARDENING (idempotent, non-destructive)
--
-- Closes the specific findings from Supabase's security advisors, verified on
-- 2026-11-10 against project tobclczszdikmgvkvngf:
--   * settings was readable by the anon role (feature flags, contact email)
--   * llm_config was readable by every signed-in user
--   * notify_school_connection_approved() was executable by anon + authenticated
--     (it is a trigger function; it must never be an RPC endpoint)
--   * four storage buckets had no size or MIME limits
--
-- NOT covered here (dashboard-only, see runbook step 6): leaked-password
-- protection in Authentication → Providers → Email.

begin;

-- 1. settings: platform config, never read by the client bundle.
revoke select on table public.settings from anon;
revoke select on table public.settings from authenticated;

-- 2. llm_config: AI routing (provider/model). Only service role + super-admin
--    RPCs (SECURITY DEFINER) need it.
revoke select on table public.llm_config from anon;
revoke select on table public.llm_config from authenticated;

-- 3. Trigger function must not be callable as an RPC.
revoke execute on function public.notify_school_connection_approved() from anon;
revoke execute on function public.notify_school_connection_approved() from authenticated;

-- 4. Storage limits. Buckets are capped so a single account cannot fill the
--    project quota; MIME allowlists stop arbitrary file hosting.
update storage.buckets
set file_size_limit = 5242880,   -- 5 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'avatars';

update storage.buckets
set file_size_limit = 26214400,  -- 25 MB (image + video evidence)
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
where id = 'gallery-media';

update storage.buckets
set file_size_limit = 52428800,  -- 50 MB
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm']
where id = 'project-media';

update storage.buckets
set file_size_limit = 26214400,  -- 25 MB
    allowed_mime_types = array['application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain','image/png','image/jpeg']
where id = 'project-documents';

-- 5. Document the deliberate public surface so a future audit does not re-flag
--    it as an accident. school_public_roster() is anon-callable BY DESIGN and
--    returns only (name, grade) for a school's enrolled students — the FERPA
--    posture tested in .trae/agent-log.md.
comment on function public.school_public_roster(uuid) is
  'Public school roster (name + grade only). Anon-executable by design; never add email, contact or enrolment-status columns to its return type.';

commit;

-- ---------------------------------------------------------------------------
-- Post-checks: expect 0 rows for the first three, 4 buckets updated.
-- ---------------------------------------------------------------------------
select 'settings readable by anon' as check, has_table_privilege('anon','public.settings','select') as should_be_false
union all
select 'llm_config readable by authenticated', has_table_privilege('authenticated','public.llm_config','select')
union all
select 'notify fn executable by anon', has_function_privilege('anon','public.notify_school_connection_approved()','execute');
