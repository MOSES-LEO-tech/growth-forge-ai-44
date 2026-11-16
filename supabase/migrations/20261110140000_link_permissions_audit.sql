-- W7 — permissions for pending vs active links, plus sensitive-read auditing.
--
-- Decision D2 (2026-11-10): while a student's school connection is PENDING, a
-- school admin may see only name + grade — enough to recognise an enrolment,
-- nothing that constitutes a portfolio. The easiest way to guarantee that is to
-- never put pending students in a table-shaped read: expose exactly three
-- columns through one function, and leave `profiles` RLS untouched.
--
-- Also adds `log_sensitive_read()`, the single write path for audit rows that
-- record privileged reads (super_admin / support). W11's console calls it.

begin;

-- ---------------------------------------------------------------------------
-- 1. Pending roster for a school admin: name + grade + request date only
-- ---------------------------------------------------------------------------
create or replace function public.school_pending_students(p_school_id uuid)
returns table (
  full_name   text,
  grade_level text,
  requested_at timestamptz,
  request_id  uuid
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;

  if not (app_private.current_user_is_school_admin(p_school_id)
          or app_private.current_user_is_super_admin()) then
    raise exception 'Only this school''s admin can view pending students.';
  end if;

  return query
  select p.full_name,
         p.grade_level,
         r.requested_at,
         r.id
  from public.school_connection_requests r
  join public.profiles p on p.id = r.user_id
  where r.school_id = p_school_id
    and r.status = 'pending'
  order by r.requested_at asc;
end
$$;

revoke all on function public.school_pending_students(uuid) from anon;
grant execute on function public.school_pending_students(uuid) to authenticated;

comment on function public.school_pending_students(uuid) is
  'Pending school connections for one school: name, grade, request date. Deliberately excludes email, class, projects and achievements — a pending request is not consent to portfolio data (D2).';

-- ---------------------------------------------------------------------------
-- 2. Sensitive-read audit helper
-- ---------------------------------------------------------------------------
create or replace function public.log_sensitive_read(
  p_entity_type text,
  p_entity_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;

  -- Only privileged roles produce sensitive reads; anyone else is noise.
  if not (app_private.current_user_is_super_admin()
          or exists (select 1 from public.profiles p
                     where p.id = v_user and p.role = 'admin')) then
    raise exception 'Only an admin or super admin can record a sensitive read.';
  end if;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    v_user,
    'sensitive_read',
    p_entity_type,
    p_entity_id,
    jsonb_build_object('reason', coalesce(p_reason, 'unspecified'), 'at', now())
  );
end
$$;

revoke all on function public.log_sensitive_read(text, uuid, text) from anon;
grant execute on function public.log_sensitive_read(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Make the audit table append-only for clients
-- ---------------------------------------------------------------------------
-- Rows are written by SECURITY DEFINER functions and read by super_admin only;
-- there is no client INSERT/UPDATE/DELETE policy on purpose.

comment on table public.admin_audit_logs is
  'Append-only audit trail. Written exclusively by SECURITY DEFINER functions (approvals, sensitive reads). No client write policy.';

commit;

-- Post-check: the function must be callable but not anon-visible.
select
  has_function_privilege('authenticated', 'public.school_pending_students(uuid)', 'execute') as authenticated_can_call,
  has_function_privilege('anon', 'public.school_pending_students(uuid)', 'execute') as anon_can_call,
  has_function_privilege('anon', 'public.log_sensitive_read(text, uuid, text)', 'execute') as anon_can_log;
