-- ============================================================
-- Attiva fonti RSS pubbliche (gratuite, no API key)
-- ============================================================

-- Attiva fonti EventieSagre (sagre e fiere locali italiane)
UPDATE public.ingestion_sources
SET is_active = true
WHERE kind = 'rss' AND name LIKE 'EventieSagre%';

-- Attiva fonti 2night (nightlife italiano)
UPDATE public.ingestion_sources
SET is_active = true
WHERE kind = 'rss' AND name LIKE '2night%';