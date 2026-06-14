-- Background downtime alert subscriptions (FCM push when tab is closed)
create table if not exists public.monitoring_alerts (
  id uuid primary key default gen_random_uuid(),
  fcm_token text not null,
  url text not null,
  enabled boolean not null default true,
  last_status text,
  last_response_time integer,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fcm_token, url)
);

create index if not exists monitoring_alerts_enabled_idx
  on public.monitoring_alerts (enabled)
  where enabled = true;

alter table public.monitoring_alerts enable row level security;

-- Edge functions use service role; block direct client access
create policy "No direct client access"
  on public.monitoring_alerts
  for all
  using (false)
  with check (false);

create or replace function public.set_monitoring_alerts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists monitoring_alerts_updated_at on public.monitoring_alerts;
create trigger monitoring_alerts_updated_at
  before update on public.monitoring_alerts
  for each row
  execute function public.set_monitoring_alerts_updated_at();
