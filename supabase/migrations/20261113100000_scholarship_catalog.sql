-- Scholarship catalog — the data model behind a publishable, verifiable catalog.
--
-- Adds what a real scholarship needs (provider, source, award range, eligibility,
-- requirements) while keeping the legacy columns the public-data edge function
-- still reads (title, amount, deadline, requirements).
--
-- Publish rules are enforced in the database, not in the admin form: a listing
-- whose source cannot be cited must not become visible to students.

begin;

-- ---------------------------------------------------------------------------
-- 1. Extend scholarships
-- ---------------------------------------------------------------------------
alter table public.scholarships
  add column if not exists provider_name     text,
  add column if not exists provider_contact  text,
  add column if not exists category          text not null default 'merit',
  add column if not exists description       text,
  add column if not exists award_min         numeric,
  add column if not exists award_max         numeric,
  add column if not exists currency          text not null default 'UGX',
  add column if not exists award_type        text,
  add column if not exists application_mode  text not null default 'internal',
  add column if not exists application_url   text,
  add column if not exists eligibility_rules jsonb not null default '{}'::jsonb,
  add column if not exists steps             jsonb not null default '[]'::jsonb,
  add column if not exists renewal_terms     text,
  add column if not exists opens_at          timestamptz,
  add column if not exists closes_at         timestamptz,
  add column if not exists decision_by       timestamptz,
  add column if not exists source_url        text,
  add column if not exists verified_at       timestamptz,
  add column if not exists verified_by       uuid references public.profiles(id) on delete set null,
  add column if not exists status            text not null default 'draft',
  add column if not exists version           integer not null default 1,
  add column if not exists created_by        uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by        uuid references public.profiles(id) on delete set null;

-- Backfill the closing timestamp from the legacy date column so existing rows
-- stay consistent if any reappear.
update public.scholarships
set closes_at = (deadline::timestamp + time '23:59') at time zone 'Africa/Kampala'
where closes_at is null and deadline is not null;

alter table public.scholarships
  add constraint scholarships_category_check check (
    category in ('merit','stem','arts_sport','bursary','leadership','inclusion','school_internal','external')
  ) not valid;

alter table public.scholarships
  add constraint scholarships_status_check check (status in ('draft','published','archived')) not valid;

alter table public.scholarships
  add constraint scholarships_mode_check check (application_mode in ('internal','external')) not valid;

alter table public.scholarships
  add constraint scholarships_award_range_check check (
    award_min is null or award_max is null or award_min <= award_max
  ) not valid;

create index if not exists scholarships_status_closes_idx
  on public.scholarships (status, closes_at);
create index if not exists scholarships_category_idx
  on public.scholarships (category);

comment on column public.scholarships.source_url is
  'Where the terms were read. Required to publish — the catalog may not contain unciteable offers.';
comment on column public.scholarships.verified_at is
  'When the source was last checked against the provider''s own call.';

-- ---------------------------------------------------------------------------
-- 2. Publish guard
-- ---------------------------------------------------------------------------
create or replace function app_private.validate_scholarship_publish()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if coalesce(new.source_url, '') = '' or new.verified_at is null then
    raise exception 'A published scholarship needs a source URL and a verification date.';
  end if;

  if coalesce(new.provider_name, '') = '' or coalesce(new.provider_contact, '') = '' then
    raise exception 'A published scholarship needs a provider name and a contact.';
  end if;

  if new.closes_at is null or new.closes_at <= now() then
    raise exception 'A published scholarship must close in the future.';
  end if;

  if new.award_min is null and new.award_max is null and coalesce(new.award_type, '') = '' then
    raise exception 'State the award (min, max or type) before publishing.';
  end if;

  return new;
end
$$;

drop trigger if exists scholarships_validate_publish on public.scholarships;
create trigger scholarships_validate_publish
  before insert or update on public.scholarships
  for each row execute function app_private.validate_scholarship_publish();

-- ---------------------------------------------------------------------------
-- 3. Requirements as rows, not prose
-- ---------------------------------------------------------------------------
create table if not exists public.scholarship_requirements (
  id            uuid primary key default gen_random_uuid(),
  scholarship_id uuid not null references public.scholarships(id) on delete cascade,
  key           text not null,
  label         text not null,
  why           text,
  example       text,
  doc_type      text not null default 'either' check (doc_type in ('pdf','image','either','none')),
  required      boolean not null default true,
  applies_when  jsonb not null default '{}'::jsonb,
  max_files     integer not null default 1 check (max_files between 1 and 3),
  sensitivity   text not null default 'normal' check (sensitivity in ('normal','financial','identity')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (scholarship_id, key)
);

create index if not exists scholarship_requirements_scholarship_idx
  on public.scholarship_requirements (scholarship_id, sort_order);

alter table public.scholarship_requirements enable row level security;

drop policy if exists scholarship_requirements_read on public.scholarship_requirements;
create policy scholarship_requirements_read on public.scholarship_requirements
  for select using (
    app_private.current_user_is_super_admin()
    or exists (
      select 1 from public.scholarships s
      where s.id = scholarship_id and s.status = 'published'
    )
  );

drop policy if exists scholarship_requirements_admin on public.scholarship_requirements;
create policy scholarship_requirements_admin on public.scholarship_requirements
  for all to authenticated
  using (app_private.current_user_is_super_admin())
  with check (app_private.current_user_is_super_admin());

-- ---------------------------------------------------------------------------
-- 4. Catalog audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.catalog_events (
  id             uuid primary key default gen_random_uuid(),
  scholarship_id uuid references public.scholarships(id) on delete cascade,
  actor_id       uuid references public.profiles(id) on delete set null,
  action         text not null,
  field          text,
  before         jsonb,
  after          jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists catalog_events_scholarship_idx
  on public.catalog_events (scholarship_id, created_at desc);

alter table public.catalog_events enable row level security;

drop policy if exists catalog_events_admin_read on public.catalog_events;
create policy catalog_events_admin_read on public.catalog_events
  for select to authenticated
  using (app_private.current_user_is_super_admin());

create or replace function app_private.log_catalog_change()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.catalog_events (scholarship_id, actor_id, action, after)
    values (new.id, auth.uid(), 'created', to_jsonb(new) - 'created_at' - 'updated_at');
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into public.catalog_events (scholarship_id, actor_id, action, before, after)
    values (
      new.id,
      auth.uid(),
      case when new.status is distinct from old.status then 'status_changed' else 'updated' end,
      jsonb_build_object(
        'status', old.status, 'title', old.title, 'closes_at', old.closes_at,
        'award_min', old.award_min, 'award_max', old.award_max, 'source_url', old.source_url
      ),
      jsonb_build_object(
        'status', new.status, 'title', new.title, 'closes_at', new.closes_at,
        'award_min', new.award_min, 'award_max', new.award_max, 'source_url', new.source_url
      )
    );
    return new;
  end if;

  return new;
end
$$;

drop trigger if exists scholarships_catalog_events on public.scholarships;
create trigger scholarships_catalog_events
  after insert or update on public.scholarships
  for each row execute function app_private.log_catalog_change();

-- ---------------------------------------------------------------------------
-- 5. RLS: publishing is platform-admin work
-- ---------------------------------------------------------------------------
-- The legacy policy allowed role = 'admin' only, which excluded super_admin —
-- the very role that runs the catalog. Replace it with an explicit rule.
drop policy if exists "Only admins can modify scholarships" on public.scholarships;

drop policy if exists super_admin_scholarships_all on public.scholarships;
create policy super_admin_scholarships_all on public.scholarships
  for all to authenticated
  using (app_private.current_user_is_super_admin())
  with check (app_private.current_user_is_super_admin());

-- Students and the public see published entries only.
drop policy if exists scholarships_select_public on public.scholarships;
create policy scholarships_select_public on public.scholarships
  for select using (status = 'published');

-- Keep the older open-read policy from exposing drafts: replace it.
drop policy if exists "Anyone authenticated can view scholarships" on public.scholarships;

commit;
