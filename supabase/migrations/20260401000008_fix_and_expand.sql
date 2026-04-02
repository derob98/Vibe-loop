-- ============================================================
-- Migration 000008: Fix CHECK constraints + Espansione sorgenti
-- ============================================================
-- PROBLEMA: Il CHECK su ingestion_runs.status accetta solo
-- ('running','completed','failed') ma la Edge Function scrive
-- 'success' e 'error' → ogni INSERT in ingestion_runs fallisce.
-- Stesso problema su ingestion_sources.kind.
-- ============================================================

-- A. Fix CHECK constraint su ingestion_runs.status
-- Il nome del constraint generato da PostgreSQL per CHECK inline è
-- {table}_{column}_check → ingestion_runs_status_check
ALTER TABLE public.ingestion_runs
  DROP CONSTRAINT IF EXISTS ingestion_runs_status_check;

ALTER TABLE public.ingestion_runs
  ADD CONSTRAINT ingestion_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'success', 'error'));

-- B. Fix CHECK constraint su ingestion_sources.kind
-- Il CHECK originale accetta solo ('rss','api','scraper','manual')
-- ma usiamo 'eventbrite','ticketmaster','songkick','meetup','opendata'
ALTER TABLE public.ingestion_sources
  DROP CONSTRAINT IF EXISTS ingestion_sources_kind_check;

ALTER TABLE public.ingestion_sources
  ADD CONSTRAINT ingestion_sources_kind_check
  CHECK (kind IN (
    'rss', 'api', 'scraper', 'manual',
    'eventbrite', 'ticketmaster', 'songkick', 'meetup', 'opendata'
  ));

-- C. Nuove sorgenti città (disattive, in attesa API keys)
-- Torino, Firenze, Napoli, Bologna
INSERT INTO public.ingestion_sources (id, name, kind, city, is_active, feed_url)
VALUES
  (gen_random_uuid(), 'Eventbrite Torino',    'eventbrite',   'Torino',  false, null),
  (gen_random_uuid(), 'Eventbrite Firenze',   'eventbrite',   'Firenze', false, null),
  (gen_random_uuid(), 'Eventbrite Napoli',    'eventbrite',   'Napoli',  false, null),
  (gen_random_uuid(), 'Eventbrite Bologna',   'eventbrite',   'Bologna', false, null),
  (gen_random_uuid(), 'Ticketmaster Torino',  'ticketmaster', 'Torino',  false, null),
  (gen_random_uuid(), 'Ticketmaster Firenze', 'ticketmaster', 'Firenze', false, null),
  (gen_random_uuid(), 'Ticketmaster Napoli',  'ticketmaster', 'Napoli',  false, null),
  (gen_random_uuid(), 'Ticketmaster Bologna', 'ticketmaster', 'Bologna', false, null)
ON CONFLICT DO NOTHING;

-- D. Sorgenti RSS gratuite (no API key richiesta)
-- Attivare dopo aver verificato che gli URL rispondono con XML valido.
-- Per ora is_active = false per sicurezza — abilitare da /admin dopo test.
INSERT INTO public.ingestion_sources (id, name, kind, city, is_active, feed_url)
VALUES
  -- eventiesagre.it: aggregatore sagre e fiere locali italiane
  (gen_random_uuid(), 'EventieSagre Nazionale', 'rss', null,     false, 'https://www.eventiesagre.it/feed/'),
  (gen_random_uuid(), 'EventieSagre Lombardia', 'rss', 'Milano', false, 'https://www.eventiesagre.it/feed/?cat=lombardia'),
  (gen_random_uuid(), 'EventieSagre Lazio',     'rss', 'Roma',   false, 'https://www.eventiesagre.it/feed/?cat=lazio'),
  -- 2night.it: eventi nightlife e locali italiani
  (gen_random_uuid(), '2night Milano',           'rss', 'Milano', false, 'https://www.2night.it/rss/eventi/milano/'),
  (gen_random_uuid(), '2night Roma',             'rss', 'Roma',   false, 'https://www.2night.it/rss/eventi/roma/')
ON CONFLICT DO NOTHING;

-- E. Attivare Songkick per Milano e Roma (richiedono SONGKICK_KEY)
-- Già inseriti in migration 000007 come is_active=false, li lasciamo tali.
-- L'utente li attiva da /admin una volta configurata la key.

-- Nota: per verificare i nomi dei constraint nel DB:
-- SELECT conname, consrc FROM pg_constraint
--   WHERE conrelid = 'public.ingestion_runs'::regclass AND contype = 'c';
-- SELECT conname, consrc FROM pg_constraint
--   WHERE conrelid = 'public.ingestion_sources'::regclass AND contype = 'c';
