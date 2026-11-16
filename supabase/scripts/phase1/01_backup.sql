-- Phase 1 / 01 — BACKUP (read-only, safe to re-run)
--
-- Snapshots every row the purge can touch into schema phase1_backup.
-- `create table if not exists` means re-running NEVER overwrites the original
-- snapshot with post-purge state. Run this FIRST, before 02_purge_qa.sql.
--
-- Rollback for the whole phase: see docs/operations/phase1-security-runbook.md
-- (restore-from-backup section).

create schema if not exists phase1_backup;

-- Identity surface
create table if not exists phase1_backup.auth_users      as select * from auth.users;
create table if not exists phase1_backup.profiles        as select * from public.profiles;
create table if not exists phase1_backup.parent_child_links as select * from public.parent_child_links;

-- School surface
create table if not exists phase1_backup.schools                 as select * from public.schools;
create table if not exists phase1_backup.school_join_codes       as select * from public.school_join_codes;
create table if not exists phase1_backup.school_connection_requests as select * from public.school_connection_requests;
create table if not exists phase1_backup.enrollments             as select * from public.enrollments;
create table if not exists phase1_backup.cms_pages               as select * from public.cms_pages;
create table if not exists phase1_backup.cms_news                as select * from public.cms_news;
create table if not exists phase1_backup.cms_events              as select * from public.cms_events;
create table if not exists phase1_backup.cms_resources           as select * from public.cms_resources;
create table if not exists phase1_backup.cms_content_versions    as select * from public.cms_content_versions;

-- Student work surface
create table if not exists phase1_backup.projects                as select * from public.projects;
create table if not exists phase1_backup.project_files           as select * from public.project_files;
create table if not exists phase1_backup.project_folders         as select * from public.project_folders;
create table if not exists phase1_backup.project_tasks           as select * from public.project_tasks;
create table if not exists phase1_backup.achievements            as select * from public.achievements;
create table if not exists phase1_backup.gallery_events          as select * from public.gallery_events;
create table if not exists phase1_backup.gallery_media           as select * from public.gallery_media;
create table if not exists phase1_backup.gallery_folders         as select * from public.gallery_folders;
create table if not exists phase1_backup.comments                as select * from public.comments;

-- Platform surface
create table if not exists phase1_backup.messages                as select * from public.messages;
create table if not exists phase1_backup.notifications           as select * from public.notifications;
create table if not exists phase1_backup.recommendations         as select * from public.recommendations;
create table if not exists phase1_backup.scholarship_applications as select * from public.scholarship_applications;
create table if not exists phase1_backup.smartbuddy_usage        as select * from public.smartbuddy_usage;
create table if not exists phase1_backup.admin_audit_logs        as select * from public.admin_audit_logs;

-- Sanity: report snapshot sizes so the runbook's expected counts can be checked.
select 'auth_users' as table_name, count(*) from phase1_backup.auth_users
union all select 'profiles', count(*) from phase1_backup.profiles
union all select 'schools', count(*) from phase1_backup.schools
union all select 'enrollments', count(*) from phase1_backup.enrollments
order by table_name;
