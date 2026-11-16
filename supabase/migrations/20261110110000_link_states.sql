-- W1 — unified link states for parent↔student (and the vocabulary school links
-- already use implicitly).
--
-- Replaces the consent-free `parent_child_links` model. Decision D1 (2026-11-10):
-- a parent link is active only when the student accepts, EXCEPT when the student
-- is a minor — then the guardian-of-record link activates directly, because a
-- minor cannot be asked to authorise their own guardian.
--
-- Minor is derived from public.profiles.age (nullable). Missing age = treated as
-- adult, i.e. student acceptance required. That is the fail-safe direction: it
-- never grants a guardian more access than the student has consented to.
--
-- Write path: RPCs only (security definer). No client INSERT/UPDATE policy exists,
-- because a link a browser can create is not consent.

begin;

-- ---------------------------------------------------------------------------
-- 1. State vocabulary
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'link_state') then
    create type public.link_state as enum
      ('invited', 'pending', 'active', 'declined', 'expired', 'revoked');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Minor check (fail-safe: unknown age = not a minor)
-- ---------------------------------------------------------------------------
create or replace function app_private.is_minor(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
  select coalesce((select p.age < 18 from public.profiles p where p.id = p_profile_id), false);
$$;

-- ---------------------------------------------------------------------------
-- 3. Parent ↔ student links
-- ---------------------------------------------------------------------------
create table if not exists public.parent_student_links (
  id                 uuid primary key default gen_random_uuid(),
  parent_id          uuid not null references public.profiles(id) on delete cascade,
  student_id         uuid not null references public.profiles(id) on delete cascade,
  state              public.link_state not null default 'invited',
  initiated_by       uuid not null references public.profiles(id) on delete cascade,
  -- How consent was established:
  --   student_accept  — the student approved the link
  --   parent_accept   — the parent approved a student's invitation
  --   guardian_minor  — a guardian asserted while the student is a minor
  --   legacy_migrate  — carried over from parent_child_links (no consent record)
  consent_source     text check (consent_source in ('student_accept', 'parent_accept', 'guardian_minor', 'legacy_migrate')),
  guardian_asserted_at timestamptz,
  decided_by         uuid references public.profiles(id) on delete set null,
  decided_at         timestamptz,
  reason             text,
  expires_at         timestamptz not null default (now() + interval '14 days'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint parent_student_not_self check (parent_id <> student_id)
);

-- One OPEN link per pair (invited or pending), regardless of history.
create unique index if not exists parent_student_one_open_uidx
  on public.parent_student_links (parent_id, student_id)
  where state in ('invited', 'pending');

-- One ACTIVE link per pair.
create unique index if not exists parent_student_one_active_uidx
  on public.parent_student_links (parent_id, student_id)
  where state = 'active';

create index if not exists parent_student_parent_idx on public.parent_student_links (parent_id);
create index if not exists parent_student_student_idx on public.parent_student_links (student_id);
create index if not exists parent_student_expiry_idx
  on public.parent_student_links (expires_at) where state in ('invited', 'pending');

-- ---------------------------------------------------------------------------
-- 4. Audit trail for every transition
-- ---------------------------------------------------------------------------
create table if not exists public.link_events (
  id          uuid primary key default gen_random_uuid(),
  link_table  text not null,
  link_id     uuid not null,
  from_state  public.link_state,
  to_state    public.link_state not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now()
);

create index if not exists link_events_link_idx on public.link_events (link_table, link_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. State machine
-- ---------------------------------------------------------------------------
create or replace function public.enforce_link_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean;
begin
  if tg_op = 'INSERT' then
    -- Normal inserts start at invited/pending. Two exceptions carry existing
    -- consent: the legacy backfill, and the guardian-of-record path for a minor
    -- (a minor cannot authorise their own guardian).
    if new.state not in ('invited', 'pending')
       and not (new.state = 'active'
                and new.consent_source in ('legacy_migrate', 'guardian_minor')) then
      raise exception 'A link must start as invited or pending, got %', new.state;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  if new.state = old.state then
    new.updated_at := now();
    return new;
  end if;

  -- 'invited' means "waiting for the other party". Accepting an invitation
  -- activates the link, so invited -> active is legal. It was missing, which
  -- made a parent unable to accept a student's invitation at all.
  allowed := case old.state
    when 'invited' then new.state in ('active', 'pending', 'declined', 'expired', 'revoked')
    when 'pending' then new.state in ('active', 'declined', 'expired', 'revoked')
    when 'active'  then new.state in ('revoked')
    else false  -- declined, expired, revoked are terminal
  end;

  if not allowed then
    raise exception 'Illegal link transition % → %', old.state, new.state;
  end if;

  if new.state = 'active' and new.consent_source is null then
    raise exception 'Activating a link requires a consent source';
  end if;

  if new.state in ('declined', 'revoked') and new.reason is null then
    raise exception 'Declining or revoking a link requires a reason';
  end if;

  new.decided_by := coalesce(new.decided_by, auth.uid());
  new.decided_at := coalesce(new.decided_at, now());
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists parent_student_links_transition on public.parent_student_links;
create trigger parent_student_links_transition
  before insert or update on public.parent_student_links
  for each row execute function public.enforce_link_transition();

create or replace function public.log_link_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' or new.state is distinct from old.state then
    insert into public.link_events (link_table, link_id, from_state, to_state, actor_id, reason)
    values (
      'parent_student_links',
      new.id,
      case when tg_op = 'INSERT' then null else old.state end,
      new.state,
      auth.uid(),
      new.reason
    );
  end if;
  return new;
end
$$;

drop trigger if exists parent_student_links_audit on public.parent_student_links;
create trigger parent_student_links_audit
  after insert or update on public.parent_student_links
  for each row execute function public.log_link_event();

-- ---------------------------------------------------------------------------
-- 6. RLS — read your own side, write nothing directly
-- ---------------------------------------------------------------------------
alter table public.parent_student_links enable row level security;
alter table public.link_events          enable row level security;

drop policy if exists parent_student_links_self_read on public.parent_student_links;
create policy parent_student_links_self_read on public.parent_student_links
  for select to authenticated
  using (
    parent_id = auth.uid()
    or student_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

drop policy if exists link_events_self_read on public.link_events;
create policy link_events_self_read on public.link_events
  for select to authenticated
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.id = link_events.link_id
        and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- ---------------------------------------------------------------------------
-- 7. Expiry sweep (call from cron or on read)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_links()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  update public.parent_student_links
  set state = 'expired'
  where state in ('invited', 'pending')
    and expires_at < now();
  get diagnostics affected = row_count;
  return affected;
end
$$;

revoke all on function public.expire_stale_links() from anon, authenticated;
grant execute on function public.expire_stale_links() to service_role;

-- ---------------------------------------------------------------------------
-- 8. Carry over legacy links (guarded: the old table may already be dropped)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.parent_child_links') is not null then
    insert into public.parent_student_links
      (parent_id, student_id, state, initiated_by, consent_source, decided_at, reason)
    select l.parent_id, l.child_id, 'active', l.parent_id, 'legacy_migrate', l.created_at,
           'Migrated from parent_child_links (no consent record existed)'
    from public.parent_child_links l
    where l.parent_id is not null
      and l.child_id is not null
      and not exists (
        select 1 from public.parent_student_links x
        where x.parent_id = l.parent_id and x.student_id = l.child_id and x.state = 'active'
      );
  end if;
end
$$;

comment on table public.parent_student_links is
  'Guardian/student relationship with explicit consent state. Legacy rows carry consent_source=legacy_migrate and should be re-confirmed at next login.';

commit;
