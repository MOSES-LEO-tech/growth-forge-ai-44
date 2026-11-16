-- Phase 1 / 02 — PURGE QA + SEED DATA from production
--
-- Scope (confirmed with owner 2026-11-10):
--   * delete QA/test identities and their content
--   * delete seeded/duplicate schools
--   * KEEP the demo school (showcase) and the super_admin
--   * PROTECT every real identity. Authority is auth.users.email, NOT
--     profiles.email: two real accounts (devis001@gmail.com, marklot001@gmail.com)
--     have a NULL profiles.email. Keying protection on the profile column
--     deletes real people.
--   * Owner confirmed josh001@gmail.com and job@gmail.com are his own test
--     signups -> explicitly deletable despite real-domain emails.
--
-- Column names verified against information_schema on 2026-11-10:
--   comments(user_id, resource_type, resource_id)  -- NO project_id
--   gallery_events(user_id, folder_id, ...)        -- NO school_id
--   gallery_folders(user_id, name)                 -- NO school_id
--   cms_content_versions(entity_type, entity_id)   -- NO page_id
--
-- REHEARSE FIRST: replace the final `commit;` with `rollback;`, run, read the
-- metrics, then re-run with `commit;`.
--
-- REQUIRES 01_backup.sql to have run.

begin;

-- ---------------------------------------------------------------------------
-- 1. Kept school (showcase) — defined FIRST: its members are protected.
-- ---------------------------------------------------------------------------
create temporary table _kept_schools on commit drop as
select id from public.schools where name = 'QA Demo School';

-- Owner-confirmed deletions: real-domain emails that are test signups.
create temporary table _owner_confirmed on commit drop as
select id from public.profiles
where lower(email) in ('josh001@gmail.com', 'job@gmail.com');

-- ---------------------------------------------------------------------------
-- 2. Protected identities
--    protected = super_admin
--             OR (real-domain auth email AND not owner-confirmed)
--             OR member of the kept school
-- ---------------------------------------------------------------------------
create temporary table _protected_users on commit drop as
select p.id
from public.profiles p
left join auth.users u on u.id = p.id
where p.role = 'super_admin'
   or p.school_id in (select id from _kept_schools)
   or (
        p.id not in (select id from _owner_confirmed)
    and coalesce(u.email, p.email) is not null
    and coalesce(u.email, p.email) not ilike '%@example.com'
    and coalesce(u.email, p.email) not ilike 'test%@school.com'
    and coalesce(u.email, p.email) not ilike 'pending-%'
    and coalesce(u.email, p.email) not ilike '%qa+%'
    and coalesce(u.email, p.email) not ilike '%qa-%'
   );

-- Schools to purge: no protected member.
create temporary table _purged_schools on commit drop as
select s.id
from public.schools s
where s.id not in (select id from _kept_schools)
  and not exists (
    select 1 from public.profiles p
    join _protected_users pu on pu.id = p.id
    where p.school_id = s.id
  );

-- Identities to purge: unprotected, QA/test fingerprint, owner-confirmed,
-- or attached to a purged school.
create temporary table _purged_users on commit drop as
select p.id
from public.profiles p
left join auth.users u on u.id = p.id
where p.id not in (select id from _protected_users)
  and p.role <> 'super_admin'
  and (
       p.id in (select id from _owner_confirmed)
    or p.school_id in (select id from _purged_schools)
    or coalesce(u.email, p.email) is null
    or coalesce(u.email, p.email) ilike '%@example.com'
    or coalesce(u.email, p.email) ilike 'test%@school.com'
    or coalesce(u.email, p.email) ilike 'pending-%'
    or coalesce(u.email, p.email) ilike '%qa+%'
    or coalesce(u.email, p.email) ilike '%qa-%'
  );

-- Content ids hanging off the purged identities/schools.
create temporary table _purged_projects on commit drop as
select id from public.projects where user_id in (select id from _purged_users);

create temporary table _purged_events on commit drop as
select id from public.gallery_events where user_id in (select id from _purged_users);

create temporary table _purged_cms on commit drop as
select id from public.cms_pages      where school_id in (select id from _purged_schools)
union select id from public.cms_news     where school_id in (select id from _purged_schools)
union select id from public.cms_events   where school_id in (select id from _purged_schools)
union select id from public.cms_resources where school_id in (select id from _purged_schools);

-- ---------------------------------------------------------------------------
-- 3. Delete child rows first
-- ---------------------------------------------------------------------------
delete from public.notifications where user_id in (select id from _purged_users);
delete from public.messages
 where sender_id in (select id from _purged_users)
    or receiver_id in (select id from _purged_users);
delete from public.smartbuddy_usage where user_id in (select id from _purged_users);
delete from public.recommendations where user_id in (select id from _purged_users);
delete from public.scholarship_applications where user_id in (select id from _purged_users);
delete from public.parent_child_links
 where parent_id in (select id from _purged_users)
    or child_id  in (select id from _purged_users);
delete from public.enrollments
 where student_id in (select id from _purged_users)
    or school_id  in (select id from _purged_schools);

delete from public.project_tasks   where project_id in (select id from _purged_projects);
delete from public.project_files   where project_id in (select id from _purged_projects);
delete from public.project_folders where project_id in (select id from _purged_projects);
delete from public.comments
 where user_id in (select id from _purged_users)
    or resource_id in (select id from _purged_projects);
delete from public.projects where id in (select id from _purged_projects);

delete from public.gallery_media   where event_id in (select id from _purged_events);
delete from public.gallery_events  where id in (select id from _purged_events);
delete from public.gallery_folders where user_id in (select id from _purged_users);

delete from public.achievements     where user_id in (select id from _purged_users);
delete from public.admin_audit_logs where actor_id in (select id from _purged_users);

-- School-scoped content
delete from public.cms_content_versions where entity_id in (select id from _purged_cms);
delete from public.cms_pages      where school_id in (select id from _purged_schools);
delete from public.cms_news       where school_id in (select id from _purged_schools);
delete from public.cms_events     where school_id in (select id from _purged_schools);
delete from public.cms_resources  where school_id in (select id from _purged_schools);
delete from public.school_connection_requests where school_id in (select id from _purged_schools);
delete from public.school_join_codes where school_id in (select id from _purged_schools);

-- ---------------------------------------------------------------------------
-- 4. Parents last
-- ---------------------------------------------------------------------------
update public.profiles
set school_id = null
where id in (select id from _protected_users)
  and school_id in (select id from _purged_schools);

update public.schools
set admin_id = null
where id in (select id from _purged_schools);

delete from public.schools  where id in (select id from _purged_schools);
delete from public.profiles where id in (select id from _purged_users);
delete from auth.users      where id not in (select id from _protected_users);

-- ---------------------------------------------------------------------------
-- 5. Showcase polish + credential containment
-- ---------------------------------------------------------------------------
update public.schools
set name = 'Milestone Demo School',
    location = 'Kampala',
    country = 'Uganda',
    description = 'A demonstration school showing portfolios, galleries, CMS content and announcements.'
where id in (select id from _kept_schools)
  and name = 'QA Demo School';

update public.profiles
set full_name = 'Demo School Admin',
    account_status = 'approved'
where role = 'admin'
  and school_id in (select id from _kept_schools);

-- The demo students keep their content (that is the showcase) but their logins
-- are disabled: their addresses are @example.com and their passwords appear in
-- supabase/migrations/qa_set_passwords.sql. Banned accounts cannot sign in.
update auth.users u
set banned_until = '2999-01-01'
where u.id in (
  select p.id from public.profiles p
  where p.school_id in (select id from _kept_schools)
    and p.role <> 'admin'
    and u.email ilike '%@example.com'
);

-- The demo admin's LOGIN address and password are changed in the dashboard
-- (runbook step 5). Never mirror a credential into this repo.

-- Report before committing.
select 'schools_deleted' as metric, count(*) as n from _purged_schools
union all select 'identities_deleted', count(*) from _purged_users
union all select 'projects_deleted', count(*) from _purged_projects
union all select 'events_deleted', count(*) from _purged_events
union all select 'protected', count(*) from _protected_users
union all select 'schools_remaining', count(*) from public.schools
union all select 'profiles_remaining', count(*) - (select count(*) from _purged_users) from public.profiles;

commit;
