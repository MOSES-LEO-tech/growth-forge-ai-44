-- W6 — schedule the link expiry sweep.
--
-- `public.expire_stale_links()` already exists (20261110110000_link_states.sql)
-- and is service-role only. Nothing called it, so an invite past its TTL stayed
-- 'pending' forever and a stale request could block a fresh one.
--
-- pg_cron is optional on Supabase; when it is absent this migration is a no-op
-- and only raises a notice. The fallback is documented in the runbook: call the
-- function from the Edge Function scheduler or any hourly cron.

begin;

do $outer$
declare
  has_cron boolean;
begin
  select exists (select 1 from pg_extension where extname = 'pg_cron') into has_cron;

  if not has_cron then
    raise notice 'pg_cron not installed: schedule public.expire_stale_links() externally (hourly).';
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
