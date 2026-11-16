-- STEP 1 - BACKUP. Run BEFORE anything destructive.
--
-- Snapshots every table the reset can touch into schema phase1_backup.
-- Dynamic on purpose: production does not contain every table this repo has
-- migrations for (cms_pages, school_connection_requests, academic_* ...), and a
-- hardcoded "create table ... as select * from public.missing_table" aborts the
-- whole backup before it writes anything.
--
-- "create table if not exists" + an existence guard per table means re-running
-- never overwrites the original snapshot with post-wipe state.

create schema if not exists phase1_backup;

do $$
declare
  t       text;
  skipped text[] := '{}';
begin
  foreach t in array array[
    'profiles','schools','parent_child_links','parent_student_links','link_events',
    'school_join_codes','school_connection_requests','school_announcements',
    'school_gallery_media','enrollments','academic_years','academic_classes','academic_subjects',
    'cms_pages','cms_news','cms_events','cms_resources','cms_content_versions',
    'projects','project_files','project_folders','project_tasks',
    'achievements','gallery_events','gallery_media','gallery_folders','comments',
    'messages','notifications','recommendations','smartbuddy_usage',
    'scholarship_applications','scholarships','admin_audit_logs','analytics_events',
    'settings','llm_config'
  ]
  loop
    if to_regclass('public.' || t) is null then
      skipped := skipped || t;
      continue;
    end if;
    execute format('create table if not exists phase1_backup.%I as select * from public.%I', t, t);
  end loop;

  raise notice 'tables absent from this database (not backed up): %', array_to_string(skipped, ', ');
end
$$;

do $do$
begin
  if to_regclass('phase1_backup.auth_users') is null then
    execute 'create table phase1_backup.auth_users as select * from auth.users';
  end if;
end
$do$;

select 'auth_users' as table_name, count(*) as n from phase1_backup.auth_users
union all select 'profiles', count(*) from phase1_backup.profiles
union all select 'schools', count(*) from phase1_backup.schools
union all select 'projects', count(*) from phase1_backup.projects
union all select 'achievements', count(*) from phase1_backup.achievements
union all select 'gallery_events', count(*) from phase1_backup.gallery_events
order by table_name;
