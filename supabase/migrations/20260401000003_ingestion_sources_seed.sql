-- Aggiunge i nuovi valori all'enum ingestion_source_kind
-- NOTA: ALTER TYPE ADD VALUE non può essere usato nella stessa transazione
-- dell'INSERT che usa il nuovo valore. Questa migration va in commit separato.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'eventbrite'
      AND enumtypid = 'ingestion_source_kind'::regtype
  ) THEN
    ALTER TYPE ingestion_source_kind ADD VALUE 'eventbrite';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ticketmaster'
      AND enumtypid = 'ingestion_source_kind'::regtype
  ) THEN
    ALTER TYPE ingestion_source_kind ADD VALUE 'ticketmaster';
  END IF;
END
$$;

-- Aggiunge i nuovi valori all'enum ingestion_run_status (se esiste)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_run_status') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'success'
        AND enumtypid = 'ingestion_run_status'::regtype
    ) THEN
      ALTER TYPE ingestion_run_status ADD VALUE 'success';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'error'
        AND enumtypid = 'ingestion_run_status'::regtype
    ) THEN
      ALTER TYPE ingestion_run_status ADD VALUE 'error';
    END IF;
  END IF;
END
$$;
