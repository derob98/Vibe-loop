-- Seed sorgenti di ingestion (separato dall'ALTER TYPE per evitare errore PostgreSQL
-- "unsafe use of new enum value in same transaction")

-- Prima rendi feed_url nullable se non lo è già
ALTER TABLE public.ingestion_sources
  ALTER COLUMN feed_url DROP NOT NULL;

INSERT INTO ingestion_sources (id, name, kind, city, is_active, feed_url)
VALUES
  (gen_random_uuid(), 'Eventbrite Milano', 'eventbrite', 'Milano', true, null),
  (gen_random_uuid(), 'Ticketmaster Milano', 'ticketmaster', 'Milano', true, null),
  (gen_random_uuid(), 'Eventbrite Roma', 'eventbrite', 'Roma', false, null),
  (gen_random_uuid(), 'Ticketmaster Roma', 'ticketmaster', 'Roma', false, null)
ON CONFLICT DO NOTHING;
