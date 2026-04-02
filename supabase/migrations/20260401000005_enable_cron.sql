-- Abilita le estensioni necessarie per pg_cron e http calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedula l'ingestion ogni ora
-- NOTA: la Edge Function URL è hardcoded con il project_id
-- Per ambienti diversi, aggiornare manualmente o usare vault.secrets
SELECT cron.schedule(
  'ingest-events-hourly',
  '0 * * * *',
  $$
  SELECT
    extensions.http_post(
      'https://gytrrdlkxizzbvuoswnq.supabase.co/functions/v1/ingest-events',
      '{}',
      'application/json'
    );
  $$
);
