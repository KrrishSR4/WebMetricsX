-- Schedule background alert checks every minute.
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY before running in Supabase SQL Editor.
-- Dashboard → Project Settings → API → service_role key

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'webmetricsx-check-alerts';

select cron.schedule(
  'webmetricsx-check-alerts',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://rnaikbpzlctebypwjvnr.supabase.co/functions/v1/check-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
