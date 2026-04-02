-- ============================================================
-- Migration: Nuove Fonti Ingestion
-- Aggiunge Songkick, Meetup, OpenData come fonti eventi
-- ============================================================

-- Aggiunge nuovi valori all'enum ingestion_source_kind
-- Nota: ALTER TYPE ADD VALUE IF NOT EXISTS non è supportato direttamente
-- Usiamo un DO block per sicurezza

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'songkick'
      AND enumtypid = 'ingestion_source_kind'::regtype
  ) THEN
    ALTER TYPE public.ingestion_source_kind ADD VALUE 'songkick';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'meetup'
      AND enumtypid = 'ingestion_source_kind'::regtype
  ) THEN
    ALTER TYPE public.ingestion_source_kind ADD VALUE 'meetup';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'opendata'
      AND enumtypid = 'ingestion_source_kind'::regtype
  ) THEN
    ALTER TYPE public.ingestion_source_kind ADD VALUE 'opendata';
  END IF;
END
$$;

-- ============================================================
-- SEED NUOVE FONTI
-- ============================================================

INSERT INTO public.ingestion_sources (id, name, kind, city, is_active, feed_url)
VALUES
  -- Songkick (concerti live)
  (gen_random_uuid(), 'Songkick Milano', 'songkick', 'Milano', false, null),
  (gen_random_uuid(), 'Songkick Roma', 'songkick', 'Roma', false, null),
  (gen_random_uuid(), 'Songkick Torino', 'songkick', 'Torino', false, null),
  (gen_random_uuid(), 'Songkick Bologna', 'songkick', 'Bologna', false, null),
  (gen_random_uuid(), 'Songkick Napoli', 'songkick', 'Napoli', false, null),

  -- Meetup (eventi social/gruppi)
  (gen_random_uuid(), 'Meetup Milano', 'meetup', 'Milano', false, null),
  (gen_random_uuid(), 'Meetup Roma', 'meetup', 'Roma', false, null),
  (gen_random_uuid(), 'Meetup Torino', 'meetup', 'Torino', false, null),

  -- OpenData (fonti dati pubblici italiani)
  (gen_random_uuid(), 'OpenData Comune Milano', 'opendata', 'Milano', false, 'https://dati.comune.milano.it/api/3/action/package_search?q=eventi'),
  (gen_random_uuid(), 'OpenData Comune Roma', 'opendata', 'Roma', false, 'https://dati.comune.roma.it/api/3/action/package_search?q=eventi')

ON CONFLICT DO NOTHING;

-- Aggiorna descrizioni fonti esistenti se necessario
UPDATE public.ingestion_sources
SET name = CASE
  WHEN kind = 'eventbrite' AND city = 'Milano' THEN 'Eventbrite Milano'
  WHEN kind = 'eventbrite' AND city = 'Roma' THEN 'Eventbrite Roma'
  WHEN kind = 'ticketmaster' AND city = 'Milano' THEN 'Ticketmaster Milano'
  WHEN kind = 'ticketmaster' AND city = 'Roma' THEN 'Ticketmaster Roma'
  ELSE name
END
WHERE kind IN ('eventbrite', 'ticketmaster');
