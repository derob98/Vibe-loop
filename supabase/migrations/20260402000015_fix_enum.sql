-- ============================================================
-- Fix enum values for ingestion sources
-- ============================================================

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
END $$;
