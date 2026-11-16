-- Enable pg_cron and schedule the parent-link expiry sweep.
--
-- 20261110130000_link_expiry_cron.sql only schedules the job *if* pg_cron is
-- already installed, and nothing installed it — so in production the sweep never
-- ran and stale invites sat in 'pending' until someone noticed. Requests now
-- sweep lazily on read, but the hourly job is still what expires rows nobody
-- ever opens again.
--
-- Idempotent: safe to re-run. If the extension cannot be created (a project with
-- extensions disabled), the DO block raises a notice and the app keeps working
-- on the lazy path.

begin;

create extension if not exists pg_cron;

do $outer$
declare
  has_cron   boolean;
  has_schema boolean;
begin
  select exists (select 1 from pg_extension where extname = 'pg_cron') into has_cron;
  select exists (select 1 from pg_namespace where nspname = 'cron') into has_schema;

  if not has_cron or not has_schema then
    raise notice 'pg_cron unavailable: link expiry falls back to the lazy sweep in request_parent_link().';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'expire-parent-links') then
    perform cron.unschedule('expire-parent-links');
  end if;

  perform cron.schedule(
    'expire-parent-links',
    '17 * * * *',                       -- hourly, off the top of the hour
    $job$select public.expire_stale_links();$job$
  );

  raise notice 'Scheduled expire-parent-links hourly.';
end
$outer$;

commit;

-- Post-check (SQL editor):
--   select jobid, jobname, schedule, active from cron.job where jobname = 'expire-parent-links';
