
-- Remove the existing 15-minute cron job if it exists
SELECT cron.unschedule('asana-periodic-sync');

-- Re-create with 3x/day schedule (every 8 hours: 00:00, 08:00, 16:00)
SELECT cron.schedule(
  'asana-periodic-sync',
  '0 */8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/asana-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := '{"action": "periodic_sync"}'::jsonb
  ) AS request_id;
  $$
);
