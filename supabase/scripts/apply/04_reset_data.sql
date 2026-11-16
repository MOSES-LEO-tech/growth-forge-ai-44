-- DATA RESET — keep ONLY the super_admin account.
--
-- Scope (confirmed 2026-11-10): remove every school, student, parent, teacher,
-- admin, portfolio, project, achievement, gallery item, CMS page, scholarship,
-- notification, message, audit row and QA fixture. Keep:
--   * profiles + auth.users rows for role = 'super_admin'  (exactly one expected)
--   * public.settings      (platform config, not content)
--   * public.llm_config    (AI routing config, not content)
--
-- IRREVERSIBLE. Run apply/03_backup.sql first.
--
-- REHEARSE: change the final `commit;` to `rollback;`, run, read the report, then
-- restore `commit;` and run again. The rehearsal changes nothing.
--
-- BEFORE RUNNING, read the "real logins" block this script prints. Two accounts
-- that look like ordinary people (marklot001@gmail.com, devis001@gmail.com) are
-- inside the deletion set because the instruction is super-admin-only.
--
-- Storage files are NOT deleted by SQL (Postgres only holds metadata). Empty the
-- five buckets in Dashboard → Storage after running this.

begin;

-- ---------------------------------------------------------------------------
-- 0. Guard: exactly one super_admin, or abort before touching anything
-- ---------------------------------------------------------------------------
do $$
declare
  keep_count int;
begin
  select count(*) into keep_count from public.profiles where role = 'super_admin';
  if keep_count <> 1 then
    raise exception 'Aborting: expected exactly 1 super_admin profile, found %.', keep_count;
  end if;
  if (select count(*) from auth.users u join public.profiles p on p.id = u.id where p.role = 'super_admin') <> 1 then
    raise exception 'Aborting: the super_admin profile has no matching auth.users row.';
  end if;
end
$$;

create temporary table _keep on commit drop as
select id from public.profiles where role = 'super_admin';

-- ---------------------------------------------------------------------------
-- 1. Show what is about to disappear (appears in the rehearsal output)
-- ---------------------------------------------------------------------------
select 'REAL-LOOKING LOGINS BEING DELETED' as warning, u.email, p.role, s.name as school
from auth.users u
join public.profiles p on p.id = u.id
left join public.schools s on s.id = p.school_id
where p.id not in (select id from _keep)
  and u.email not ilike '%@example.com'
  and u.email not ilike 'test%@school.com'
  and u.email not ilike 'pending-%'
  and u.email not ilike '%qa%'
order by u.email;

-- ---------------------------------------------------------------------------
-- 2. Delete children first (guarded: only if the table exists yet)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'notifications','messages','comments','smartbuddy_usage','recommendations',
    'scholarship_applications','parent_child_links','enrollments',
    'project_tasks','project_files','project_folders','projects',
    'gallery_media','gallery_events','gallery_folders',
    'achievements','admin_audit_logs',
    'cms_content_versions','cms_pages','cms_news','cms_events','cms_resources',
    'school_announcements','school_gallery_media',
    'academic_classes','academic_subjects','academic_years',
    'school_connection_requests','school_join_codes',
    'parent_student_links','link_events','analytics_events',
    'scholarships'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I', t);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Detach, then drop schools and every non-super_admin identity
-- ---------------------------------------------------------------------------
update public.profiles set school_id = null where school_id is not null;

delete from public.schools;

delete from public.profiles where id not in (select id from _keep);

delete from auth.users where id not in (select id from _keep);

-- ---------------------------------------------------------------------------
-- 4. Keep platform config clean: brand the contact address correctly
-- ---------------------------------------------------------------------------
update public.settings
set value = '"support@milestone.app"'::jsonb
where key = 'app.contact_email';

-- ---------------------------------------------------------------------------
-- 5. Report (this is what to read in the rehearsal)
-- ---------------------------------------------------------------------------
select 'profiles_remaining' as metric, count(*) as n from public.profiles
union all select 'super_admins', count(*) from public.profiles where role = 'super_admin'
union all select 'auth_users_remaining', count(*) from auth.users
union all select 'schools', count(*) from public.schools
union all select 'projects', count(*) from public.projects
union all select 'achievements', count(*) from public.achievements
union all select 'gallery_events', count(*) from public.gallery_events
union all select 'cms_pages', count(*) from public.cms_pages
union all select 'scholarships', count(*) from public.scholarships
union all select 'notifications', count(*) from public.notifications
union all select 'settings', count(*) from public.settings
union all select 'llm_config', count(*) from public.llm_config
order by metric;

commit;
