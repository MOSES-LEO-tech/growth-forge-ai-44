-- W10 — reconcile the links carried over from parent_child_links.
--
-- W1's backfill copied legacy rows as state='active', consent_source='legacy_migrate'
-- because the old table recorded no consent at all. That copy can contain rows the
-- new model forbids, so this migration cleans them and exposes what still needs a
-- human to re-confirm.
--
-- Idempotent: safe to run repeatedly.

begin;

-- ---------------------------------------------------------------------------
-- 1. Remove rows the new model forbids
-- ---------------------------------------------------------------------------
-- A profile cannot be its own parent.
delete from public.parent_student_links
where parent_id = student_id;

-- Revoke rows where either side no longer holds the expected role. We revoke
-- rather than delete so the history stays readable and the counterparty can see
-- why access ended.
update public.parent_student_links l
set state = 'revoked',
    reason = 'Role changed: this link no longer describes a parent/student pair',
    decided_at = coalesce(decided_at, now())
where l.state = 'active'
  and (
    not exists (select 1 from public.profiles p where p.id = l.parent_id and p.role = 'parent')
    or not exists (select 1 from public.profiles s where s.id = l.student_id and s.role = 'student')
  );

-- Duplicate active rows for the same pair: keep the oldest, revoke the rest.
-- (The partial unique index should prevent this; the cleanup covers rows created
-- before the index existed.)
with ranked as (
  select id,
         row_number() over (partition by parent_id, student_id order by created_at asc, id asc) as rn
  from public.parent_student_links
  where state = 'active'
)
update public.parent_student_links l
set state = 'revoked',
    reason = 'Duplicate active link; superseded by the earliest record',
    decided_at = coalesce(l.decided_at, now())
from ranked
where l.id = ranked.id
  and ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. What still needs a human to re-confirm
-- ---------------------------------------------------------------------------
create or replace view public.legacy_links_needing_reconfirmation as
select l.id as link_id,
       l.parent_id,
       parent.full_name  as parent_name,
       parent.email      as parent_email,
       l.student_id,
       student.full_name as student_name,
       student.email     as student_email,
       student.age,
       l.created_at
from public.parent_student_links l
join public.profiles parent  on parent.id  = l.parent_id
join public.profiles student on student.id = l.student_id
where l.consent_source = 'legacy_migrate'
  and l.state = 'active';

comment on view public.legacy_links_needing_reconfirmation is
  'Active links migrated from parent_child_links with no consent record. Support asks both parties to re-confirm; re-confirmation inserts a new row with student_accept/parent_accept and revokes this one.';

-- Support-only: the view reads across all families, so it must never be
-- reachable with the public or signed-in API key.
revoke all on public.legacy_links_needing_reconfirmation from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Report for the runbook
-- ---------------------------------------------------------------------------
create or replace function public.link_backfill_report()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'active_links',            (select count(*) from public.parent_student_links where state = 'active'),
    'legacy_active_links',     (select count(*) from public.parent_student_links
                                where state = 'active' and consent_source = 'legacy_migrate'),
    'revoked_duplicates',      (select count(*) from public.parent_student_links
                                where state = 'revoked' and reason like 'Duplicate active link%'),
    'revoked_role_mismatch',   (select count(*) from public.parent_student_links
                                where state = 'revoked' and reason like 'Role changed%'),
    'self_links_remaining',    (select count(*) from public.parent_student_links where parent_id = student_id),
    'needing_reconfirmation',  (select count(*) from public.legacy_links_needing_reconfirmation)
  );
$$;

revoke all on function public.link_backfill_report() from anon, authenticated;
grant execute on function public.link_backfill_report() to service_role;

commit;

-- Post-check (service role / SQL editor):
select public.link_backfill_report();
