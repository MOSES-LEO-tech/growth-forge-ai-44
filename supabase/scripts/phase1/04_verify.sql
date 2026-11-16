-- Phase 1 / 04 — VERIFICATION (read-only)
--
-- Run after 02_purge_qa.sql. Every row below is an acceptance check for the
-- Phase 1 exit criteria in docs/operations/phase1-security-runbook.md.

-- A. Counts after purge (expect: 1 school, 1 admin, super_admin intact,
--    zero @example.com identities).
select 'schools' as metric, count(*) as n from public.schools
union all select 'profiles', count(*) from public.profiles
union all select 'admins', count(*) from public.profiles where role = 'admin'
union all select 'super_admins', count(*) from public.profiles where role = 'super_admin'
union all select 'qa_identities', count(*) from public.profiles where email ilike '%@example.com'
union all select 'auth_users', count(*) from auth.users
union all select 'auth_users_without_profile', count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)
order by metric;

-- B. Showcase school must be renamed and populated.
select s.name, s.location, s.approval_status,
       (select count(*) from public.profiles p where p.school_id = s.id) as profiles,
       (select count(*) from public.enrollments e where e.school_id = s.id) as enrolled,
       (select count(*) from public.cms_pages c where c.school_id = s.id) as cms_pages
from public.schools s;

-- C. Quarantine list: real-domain accounts that this phase deliberately KEPT.
--    Decide per row: real user (keep), or owner's own test account (delete).
select p.email, p.full_name, p.role, p.account_status, s.name as school, p.created_at::date
from public.profiles p
left join public.schools s on s.id = p.school_id
where p.email is null
   or (p.email not ilike '%@example.com'
       and p.email not ilike 'test%@school.com'
       and p.email not ilike 'pending-%'
       and p.email not ilike '%qa+%'
       and p.email not ilike '%qa-%')
order by p.role, p.created_at;

-- D. Orphans: any child row whose parent was purged (all must be 0).
select 'orphan_profiles' as check, count(*) as n from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id)
union all select 'orphan_school_cms', count(*) from public.cms_pages c where not exists (select 1 from public.schools s where s.id = c.school_id)
union all select 'orphan_enrollments', count(*) from public.enrollments e where not exists (select 1 from public.schools s where s.id = e.school_id)
union all select 'orphan_join_codes', count(*) from public.school_join_codes j where not exists (select 1 from public.schools s where s.id = j.school_id);

-- E. Storage still reachable after hardening (expect 5 rows, all with limits).
select id, public, file_size_limit, array_length(allowed_mime_types, 1) as mime_count
from storage.buckets order by id;
