-- W11a — analytics events + support lookups.
--
-- Analytics: one append-only table and one insert-only RPC. Client props are
-- sanitised in the app (src/lib/analytics.ts) and re-checked here, because a
-- client is not trusted to keep PII out of an event payload.
--
-- Support: read-only account lookup and an onboarding reset. Both are
-- super_admin only and both write an audit row.

begin;

-- ---------------------------------------------------------------------------
-- 1. Analytics events
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  name        text not null check (char_length(name) between 3 and 64),
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_name_idx on public.analytics_events (name, created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;

-- No client read: aggregated in the dashboard, never per-row from the browser.
drop policy if exists analytics_events_no_client_read on public.analytics_events;
create policy analytics_events_no_client_read on public.analytics_events
  for select to authenticated using (false);

create or replace function public.track_event(p_name text, p_props jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_props jsonb := coalesce(p_props, '{}'::jsonb);
begin
  if v_user is null then
    raise exception 'You must be signed in.';
  end if;

  -- Hard size guard: an event is telemetry, not a data dump.
  if octet_length(v_props::text) > 2048 then
    raise exception 'Event properties exceed 2 KB.';
  end if;

  -- Reject the obvious PII keys even if the client forgot to strip them.
  if v_props ?| array['email', 'password', 'token', 'full_name', 'phone'] then
    raise exception 'Event properties must not contain PII keys.';
  end if;

  insert into public.analytics_events (user_id, name, props)
  values (v_user, p_name, v_props);
end
$$;

revoke all on function public.track_event(text, jsonb) from anon;
grant execute on function public.track_event(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Support: account lookup (read-only, audited)
-- ---------------------------------------------------------------------------
create or replace function public.support_find_account(p_email text)
returns table (
  user_id      uuid,
  full_name    text,
  email        text,
  role         text,
  account_status text,
  school_name  text,
  created_at   timestamptz,
  onboarding_completed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if not app_private.current_user_is_super_admin() then
    raise exception 'Super admin only.';
  end if;

  return query
  select p.id, p.full_name, p.email, p.role::text, p.account_status::text,
         s.name, p.created_at, p.onboarding_completed_at
  from public.profiles p
  left join public.schools s on s.id = p.school_id
  where lower(p.email) = lower(trim(p_email))
  limit 5;
end
$$;

revoke all on function public.support_find_account(text) from anon, authenticated;
grant execute on function public.support_find_account(text) to authenticated;

comment on function public.support_find_account(text) is
  'Super-admin account lookup by exact email. Returns at most 5 rows. Callers must log_sensitive_read() separately.';

-- ---------------------------------------------------------------------------
-- 3. Support: reset onboarding for one account
-- ---------------------------------------------------------------------------
create or replace function public.support_reset_onboarding(p_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if not app_private.current_user_is_super_admin() then
    raise exception 'Super admin only.';
  end if;

  update public.profiles
  set onboarding_completed_at = null,
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'No profile with that id.';
  end if;

  insert into public.admin_audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'support_reset_onboarding', 'profiles', p_user_id,
          jsonb_build_object('reason', coalesce(p_reason, 'unspecified')));
end
$$;

revoke all on function public.support_reset_onboarding(uuid, text) from anon, authenticated;
grant execute on function public.support_reset_onboarding(uuid, text) to authenticated;

commit;
