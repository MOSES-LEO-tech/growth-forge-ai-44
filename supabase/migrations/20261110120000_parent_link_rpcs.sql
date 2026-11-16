-- W5 — parent ↔ student link RPCs.
--
-- Replaces the consent-free `link_parent_to_student_by_email` behaviour: a parent
-- can no longer bind a child by typing an email. Every path goes through a state
-- machine (20261110110000_link_states.sql).
--
-- Rules (decisions D1/D2, 2026-11-10):
--   * student accepts a parent's request — UNLESS the student is a minor, in which
--     case the guardian link activates immediately (guardian-of-record).
--   * a student may invite a parent; the parent then accepts.
--   * decline/revoke is terminal; re-invite allowed after 24h.
--   * no client writes the table directly; these functions are the only path.

begin;

-- ---------------------------------------------------------------------------
-- Resolve a student account by email (never leaks whether a non-student exists)
-- ---------------------------------------------------------------------------
create or replace function app_private.resolve_student_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
  select p.id
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(coalesce(nullif(p.email, ''), u.email::text)) = lower(trim(p_email))
    and p.role = 'student'
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Parent → student
-- ---------------------------------------------------------------------------
create or replace function public.request_parent_link(p_student_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_parent uuid := auth.uid();
  v_student uuid;
  v_existing public.parent_student_links;
  v_minor boolean;
  v_link_id uuid;
begin
  if v_parent is null then
    raise exception 'You must be signed in.';
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_parent and p.role = 'parent') then
    raise exception 'Only a parent account can request a child link.';
  end if;

  v_student := app_private.resolve_student_by_email(p_student_email);
  if v_student is null then
    raise exception 'No student account matches that email.';
  end if;
  if v_student = v_parent then
    raise exception 'You cannot link to yourself.';
  end if;

  -- Lazy expiry: pg_cron is optional, so nothing sweeps stale requests. Without
  -- this, an expired row answers 'already_pending' forever and blocks a fresh one.
  update public.parent_student_links
  set state = 'expired', reason = 'Expired before it was accepted'
  where parent_id = v_parent and student_id = v_student
    and state in ('invited', 'pending') and expires_at < now();

  select * into v_existing
  from public.parent_student_links
  where parent_id = v_parent and student_id = v_student and state in ('invited', 'pending')
  limit 1;

  if found then
    return jsonb_build_object('status', 'already_pending', 'link_id', v_existing.id);
  end if;

  if exists (
    select 1 from public.parent_student_links
    where parent_id = v_parent and student_id = v_student and state = 'active'
  ) then
    return jsonb_build_object('status', 'already_linked');
  end if;

  if exists (
    select 1 from public.parent_student_links
    where parent_id = v_parent and student_id = v_student
      and state in ('declined', 'revoked')
      and updated_at > now() - interval '24 hours'
  ) then
    raise exception 'A recent attempt was declined or revoked. Try again in 24 hours.';
  end if;

  v_minor := app_private.is_minor(v_student);

  insert into public.parent_student_links
    (parent_id, student_id, state, initiated_by, consent_source, guardian_asserted_at, decided_at)
  values (
    v_parent, v_student,
    case when v_minor then 'active'::public.link_state else 'pending'::public.link_state end,
    v_parent,
    case when v_minor then 'guardian_minor' else null end,
    case when v_minor then now() else null end,
    case when v_minor then now() else null end
  )
  returning id into v_link_id;

  return jsonb_build_object(
    'status', case when v_minor then 'active' else 'pending' end,
    'link_id', v_link_id,
    'minor_auto_activated', v_minor
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Student → parent (invitation the parent must accept)
-- ---------------------------------------------------------------------------
create or replace function public.invite_parent_link(p_parent_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_student uuid := auth.uid();
  v_parent uuid;
  v_link_id uuid;
begin
  if v_student is null then
    raise exception 'You must be signed in.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_student and p.role = 'student') then
    raise exception 'Only a student account can invite a parent.';
  end if;

  select p.id into v_parent
  from public.profiles p
  left join auth.users u on u.id = p.id
  where lower(coalesce(nullif(p.email, ''), u.email::text)) = lower(trim(p_parent_email))
    and p.role = 'parent'
  limit 1;

  if v_parent is null then
    raise exception 'No parent account matches that email. Ask them to sign up first.';
  end if;
  if v_parent = v_student then
    raise exception 'You cannot link to yourself.';
  end if;

  if exists (
    select 1 from public.parent_student_links
    where parent_id = v_parent and student_id = v_student
      and state in ('invited', 'pending', 'active')
  ) then
    return jsonb_build_object('status', 'already_exists');
  end if;

  insert into public.parent_student_links
    (parent_id, student_id, state, initiated_by)
  values (v_parent, v_student, 'invited', v_student)
  returning id into v_link_id;

  return jsonb_build_object('status', 'invited', 'link_id', v_link_id);
end
$$;

-- ---------------------------------------------------------------------------
-- Accept — only the party who did NOT initiate
-- ---------------------------------------------------------------------------
create or replace function public.accept_parent_link(p_link_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_link public.parent_student_links;
begin
  select * into v_link from public.parent_student_links where id = p_link_id;
  if not found then
    raise exception 'Link not found.';
  end if;

  if v_user is null or (v_user <> v_link.parent_id and v_user <> v_link.student_id) then
    raise exception 'You are not part of this link.';
  end if;

  if v_user = v_link.initiated_by then
    raise exception 'The other party must accept this link.';
  end if;

  if v_link.state in ('invited', 'pending') and v_link.expires_at < now() then
    update public.parent_student_links
    set state = 'expired', reason = 'Expired before it was accepted'
    where id = p_link_id and state in ('invited', 'pending');
    raise exception 'This request expired before it was accepted. Ask for a new one.';
  end if;

  update public.parent_student_links
  set state = 'active',
      consent_source = case when v_user = v_link.student_id then 'student_accept' else 'parent_accept' end,
      decided_by = v_user
  where id = p_link_id and state in ('invited', 'pending');

  if not found then
    raise exception 'This link is no longer pending.';
  end if;

  return jsonb_build_object('status', 'active', 'link_id', p_link_id);
end
$$;

-- ---------------------------------------------------------------------------
-- Decline / revoke
-- ---------------------------------------------------------------------------
create or replace function public.decline_parent_link(p_link_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_link public.parent_student_links;
begin
  select * into v_link from public.parent_student_links where id = p_link_id;
  if not found then raise exception 'Link not found.'; end if;
  if v_user is null or (v_user <> v_link.parent_id and v_user <> v_link.student_id) then
    raise exception 'You are not part of this link.';
  end if;

  update public.parent_student_links
  set state = 'declined',
      reason = coalesce(nullif(trim(p_reason), ''), 'Declined by ' || case when v_user = v_link.parent_id then 'parent' else 'student' end),
      decided_by = v_user
  where id = p_link_id and state in ('invited', 'pending');

  if not found then raise exception 'This link is no longer pending.'; end if;
  return jsonb_build_object('status', 'declined', 'link_id', p_link_id);
end
$$;

create or replace function public.revoke_parent_link(p_link_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_link public.parent_student_links;
begin
  select * into v_link from public.parent_student_links where id = p_link_id;
  if not found then raise exception 'Link not found.'; end if;
  if v_user is null or (v_user <> v_link.parent_id and v_user <> v_link.student_id) then
    raise exception 'You are not part of this link.';
  end if;

  update public.parent_student_links
  set state = 'revoked',
      reason = coalesce(nullif(trim(p_reason), ''), 'Revoked by ' || case when v_user = v_link.parent_id then 'parent' else 'student' end),
      decided_by = v_user
  where id = p_link_id and state = 'active';

  if not found then raise exception 'Only an active link can be revoked.'; end if;
  return jsonb_build_object('status', 'revoked', 'link_id', p_link_id);
end
$$;

-- ---------------------------------------------------------------------------
-- Read both directions in one call
-- ---------------------------------------------------------------------------
create or replace function public.my_parent_links()
returns table (
  link_id uuid,
  direction text,
  counterparty_id uuid,
  counterparty_name text,
  counterparty_email text,
  state public.link_state,
  initiated_by_me boolean,
  can_accept boolean,
  can_revoke boolean,
  reason text,
  expires_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.id,
    case when l.parent_id = auth.uid() then 'child' else 'parent' end as direction,
    case when l.parent_id = auth.uid() then l.student_id else l.parent_id end as counterparty_id,
    cp.full_name,
    coalesce(nullif(cp.email, ''), cu.email::text),
    l.state,
    l.initiated_by = auth.uid() as initiated_by_me,
    (l.state in ('invited', 'pending') and l.initiated_by <> auth.uid()) as can_accept,
    (l.state = 'active') as can_revoke,
    l.reason,
    l.expires_at,
    l.updated_at
  from public.parent_student_links l
  left join public.profiles cp
    on cp.id = case when l.parent_id = auth.uid() then l.student_id else l.parent_id end
  left join auth.users cu on cu.id = cp.id
  where l.parent_id = auth.uid() or l.student_id = auth.uid()
  order by l.updated_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Legacy entry point: same name, safe behaviour.
-- Old clients calling link_parent_to_student_by_email now go through consent.
-- ---------------------------------------------------------------------------
create or replace function public.link_parent_to_student_by_email(p_student_email text)
returns jsonb
language sql
security definer
set search_path = public, app_private, pg_temp
as $$
  select public.request_parent_link(p_student_email);
$$;

revoke all on function public.request_parent_link(text) from anon;
revoke all on function public.invite_parent_link(text) from anon;
revoke all on function public.accept_parent_link(uuid) from anon;
revoke all on function public.decline_parent_link(uuid, text) from anon;
revoke all on function public.revoke_parent_link(uuid, text) from anon;
revoke all on function public.my_parent_links() from anon;

grant execute on function public.request_parent_link(text) to authenticated;
grant execute on function public.invite_parent_link(text) to authenticated;
grant execute on function public.accept_parent_link(uuid) to authenticated;
grant execute on function public.decline_parent_link(uuid, text) to authenticated;
grant execute on function public.revoke_parent_link(uuid, text) to authenticated;
grant execute on function public.my_parent_links() to authenticated;
grant execute on function public.link_parent_to_student_by_email(text) to authenticated;

commit;
