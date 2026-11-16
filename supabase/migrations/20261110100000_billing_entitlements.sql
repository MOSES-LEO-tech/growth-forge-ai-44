-- Phase 5 — billing entitlements (forward migration, NOT yet applied)
--
-- Model: Paddle is the merchant of record. Paddle owns the money, tax and
-- invoices; we own a mirror of who is entitled to what.
--
-- Entitlement is evaluated per CALENDAR MONTH (UTC) because SmartBuddy usage is
-- metered monthly. Storage is a standing cap, not a monthly one.
--
-- Write path: only the paddle-webhook Edge Function (service role) writes to
-- these tables. Clients read their own rows. No client write policy exists on
-- purpose — an entitlement a client can grant itself is not an entitlement.
--
-- Requires: 20261110000000..00300 applied first (this file sorts after them).

begin;

-- ---------------------------------------------------------------------------
-- 1. Paddle customer mapping (one per paying identity)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_customers (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  paddle_customer_id text not null unique,
  email             text,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Subscriptions — one row per Paddle subscription
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references public.profiles(id) on delete cascade,
  school_id              uuid references public.schools(id) on delete cascade,
  paddle_subscription_id text not null unique,
  paddle_price_id        text not null,
  plan                   text not null check (plan in ('student_plus', 'school')),
  status                 text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled')),
  currency               text not null default 'UGX' check (currency in ('UGX', 'USD')),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint subscriptions_owner_chk check (user_id is not null or school_id is not null)
);

create index if not exists subscriptions_user_idx    on public.subscriptions (user_id) where user_id is not null;
create index if not exists subscriptions_school_idx  on public.subscriptions (school_id) where school_id is not null;
create index if not exists subscriptions_status_idx  on public.subscriptions (status);

-- ---------------------------------------------------------------------------
-- 3. Entitlements — the limits a plan grants for a billing period
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete cascade,
  school_id               uuid references public.schools(id) on delete cascade,
  plan                    text not null default 'free'
                            check (plan in ('free', 'student_plus', 'school')),
  period_start            timestamptz not null default date_trunc('month', (now() at time zone 'utc')),
  smartbuddy_messages_cap integer not null default 20,
  storage_bytes_cap       bigint  not null default 104857600,  -- 100 MB
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint entitlements_owner_chk check (user_id is not null or school_id is not null)
);

-- One entitlement row per owner per period.
create unique index if not exists entitlements_user_period_uidx
  on public.entitlements (user_id, period_start) where user_id is not null;
create unique index if not exists entitlements_school_period_uidx
  on public.entitlements (school_id, period_start) where school_id is not null;

-- ---------------------------------------------------------------------------
-- 4. Usage counters — incremented by the SmartBuddy function and by uploads
-- ---------------------------------------------------------------------------
create table if not exists public.usage_counters (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete cascade,
  school_id             uuid references public.schools(id) on delete cascade,
  period_start          timestamptz not null default date_trunc('month', (now() at time zone 'utc')),
  smartbuddy_messages   integer not null default 0 check (smartbuddy_messages >= 0),
  storage_bytes         bigint  not null default 0 check (storage_bytes >= 0),
  updated_at            timestamptz not null default now(),
  constraint usage_owner_chk check (user_id is not null or school_id is not null)
);

create unique index if not exists usage_user_period_uidx
  on public.usage_counters (user_id, period_start) where user_id is not null;
create unique index if not exists usage_school_period_uidx
  on public.usage_counters (school_id, period_start) where school_id is not null;

-- ---------------------------------------------------------------------------
-- 5. Webhook idempotency — Paddle retries; processing twice must be harmless
-- ---------------------------------------------------------------------------
create table if not exists public.billing_events (
  id                text primary key,           -- Paddle event_id
  event_type        text not null,
  payload           jsonb not null,
  processed_at      timestamptz,
  processing_error  text,
  received_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. RLS: read your own, write nothing
-- ---------------------------------------------------------------------------
alter table public.billing_customers enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.entitlements     enable row level security;
alter table public.usage_counters   enable row level security;
alter table public.billing_events   enable row level security;

drop policy if exists billing_customers_self_read on public.billing_customers;
create policy billing_customers_self_read on public.billing_customers
  for select to authenticated using (user_id = auth.uid());

drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
        and p.school_id = subscriptions.school_id
    )
  );

drop policy if exists entitlements_self_read on public.entitlements;
create policy entitlements_self_read on public.entitlements
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
        and p.school_id = entitlements.school_id
    )
  );

drop policy if exists usage_self_read on public.usage_counters;
create policy usage_self_read on public.usage_counters
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
        and p.school_id = usage_counters.school_id
    )
  );

-- billing_events deliberately has no client policy: service role only.

-- ---------------------------------------------------------------------------
-- 7. Effective entitlement for the caller (free tier when no row exists)
-- ---------------------------------------------------------------------------
create or replace function public.current_entitlement()
returns table (plan text, smartbuddy_messages_cap integer, storage_bytes_cap bigint,
               smartbuddy_messages_used integer, period_start timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with period as (select date_trunc('month', (now() at time zone 'utc')) as start),
  mine as (
    select e.plan, e.smartbuddy_messages_cap, e.storage_bytes_cap, e.period_start
    from public.entitlements e, period p
    where e.user_id = auth.uid() and e.period_start = p.start
    limit 1
  ),
  used as (
    select coalesce(u.smartbuddy_messages, 0) as n
    from public.usage_counters u, period p
    where u.user_id = auth.uid() and u.period_start = p.start
    limit 1
  )
  select coalesce(m.plan, 'free'),
         coalesce(m.smartbuddy_messages_cap, 20),
         coalesce(m.storage_bytes_cap, 104857600::bigint),
         coalesce((select n from used), 0),
         (select start from period)
  from (select 1) one
  left join mine m on true;
$$;

grant execute on function public.current_entitlement() to authenticated;

commit;
