-- ============================================================
-- Migration 000009: Fix Cron Auth + Event Cleanup
-- ============================================================
-- PROBLEMI RISOLTI:
--   1. Il cron job (migration 000005) chiama la Edge Function SENZA
--      header Authorization → la funzione risponde 401 se CRON_SECRET
--      è configurato.
--   2. Manca una procedura di cleanup eventi scaduti.
--   3. ingestion_runs: manca policy INSERT per service role usage.
-- ============================================================

-- ============================================================
-- A. FIX CRON JOB — Aggiungi Authorization header
-- ============================================================

-- Rimuovi il vecchio cron job
SELECT cron.unschedule('ingest-events-hourly');

-- Ricrea con pg_net e header Authorization
-- NOTA: Il CRON_SECRET deve essere impostato come secret Supabase
-- (Dashboard → Settings → Edge Functions → Secrets)
-- Per il cron job usiamo http_post di pg_net con headers
SELECT cron.schedule(
  'ingest-events-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://gytrrdlkxizzbvuoswnq.supabase.co/functions/v1/ingest-events',
      body := '{}',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
      )
    );
  $$
);

-- ============================================================
-- B. CLEANUP EVENTI SCADUTI
-- ============================================================

-- Funzione che elimina eventi finiti da più di 30 giorni
-- (o con starts_at passato da 30+ giorni se ends_at è null)
CREATE OR REPLACE FUNCTION public.cleanup_old_events(days_old INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count BIGINT) AS $$
DECLARE
  cnt BIGINT;
BEGIN
  DELETE FROM public.events
  WHERE
    (ends_at IS NOT NULL AND ends_at < NOW() - (days_old || ' days')::INTERVAL)
    OR
    (ends_at IS NULL AND starts_at < NOW() - (days_old || ' days')::INTERVAL);

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN QUERY SELECT cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_events IS
  'Elimina eventi scaduti da più di N giorni (default 30). Restituisce il numero di eventi eliminati.';

-- Schedula cleanup giornaliero alle 3:00 AM
SELECT cron.schedule(
  'cleanup-old-events-daily',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_events(30); $$
);

-- ============================================================
-- C. FIX RLS: ingestion_runs INSERT per admin
-- ============================================================
-- La Edge Function usa il service_role, ma per completezza
-- permettiamo anche insert/update dalla dashboard admin

DROP POLICY IF EXISTS "Admin can view ingestion_runs" ON public.ingestion_runs;

CREATE POLICY "Admin can manage ingestion_runs"
  ON public.ingestion_runs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
