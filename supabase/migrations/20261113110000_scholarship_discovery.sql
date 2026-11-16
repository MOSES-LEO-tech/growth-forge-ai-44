-- Online scholarship discovery — candidates found by web search.
--
-- Candidates are deliberately NOT scholarships. Nothing here is visible to
-- students as a listing: the widget shows a labelled "found online" link, and an
-- admin must promote a candidate into a draft, which still passes the publish
-- gate (source, provider, contact, closing date, award).

begin;

create table if not exists public.scholarship_candidates (
  id                     uuid primary key default gen_random_uuid(),
  url                    text not null,
  url_normalized         text not null unique,
  title                  text not null,
  domain                 text not null,
  snippet                text,
  query                  text,
  score                  integer not null default 0,
  status                 text not null default 'new'
                           check (status in ('new', 'promoted', 'dismissed', 'dead')),
  hits                   integer not null default 1,
  flagged_reason         text,
  promoted_scholarship_id uuid references public.scholarships(id) on delete set null,
  first_seen_at          timestamptz not null default now(),
  last_seen_at           timestamptz not null default now()
);

create index if not exists scholarship_candidates_status_idx
  on public.scholarship_candidates (status, score desc, last_seen_at desc);
create index if not exists scholarship_candidates_domain_idx
  on public.scholarship_candidates (domain);

-- One row per search a student triggered, so the API budget is visible.
create table if not exists public.scholarship_discovery_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  queries    text[] not null default '{}',
  results    integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists scholarship_discovery_runs_user_idx
  on public.scholarship_discovery_runs (user_id, created_at desc);

alter table public.scholarship_candidates enable row level security;
alter table public.scholarship_discovery_runs enable row level security;

-- Students never read candidates directly: the edge function returns a short,
-- filtered list. That keeps an unvetted page out of the client entirely.
drop policy if exists scholarship_candidates_admin_read on public.scholarship_candidates;
create policy scholarship_candidates_admin_read on public.scholarship_candidates
  for select to authenticated
  using (app_private.current_user_is_super_admin());

drop policy if exists scholarship_candidates_admin_write on public.scholarship_candidates;
create policy scholarship_candidates_admin_write on public.scholarship_candidates
  for update to authenticated
  using (app_private.current_user_is_super_admin())
  with check (app_private.current_user_is_super_admin());

drop policy if exists scholarship_discovery_runs_admin_read on public.scholarship_discovery_runs;
create policy scholarship_discovery_runs_admin_read on public.scholarship_discovery_runs
  for select to authenticated
  using (app_private.current_user_is_super_admin() or user_id = auth.uid());

comment on table public.scholarship_candidates is
  'Unverified leads from web search. Never rendered as a scholarship; promote to a draft scholarship to publish.';
comment on column public.scholarship_candidates.score is
  'Coarse relevance (level/region/deadline mentions, official domain). Not a match score.';

commit;
