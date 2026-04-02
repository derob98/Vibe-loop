---
name: Infrastruttura Edge Functions e Ingestion
description: Deploy ingest-events, schema ingestion_sources/runs, pg_cron setup per vibe-loop
type: project
---

Edge Function `ingest-events` deployata su Supabase project `gytrrdlkxizzbvuoswnq` (eu-west-1).

**Why:** Ingesta eventi da Eventbrite e Ticketmaster con de-dup via `normalized_hash` (SHA-256 di titolo+data+città).

**How to apply:** Quando si modifica la logica di fetching o si aggiungono nuove sorgenti, aggiornare `supabase/functions/ingest-events/index.ts` e fare `supabase functions deploy ingest-events`.

## Lezioni apprese (schema issues)

- `ingestion_sources.kind` usa un **enum PostgreSQL** (`ingestion_source_kind`), non un CHECK constraint. Per aggiungere valori: `ALTER TYPE ingestion_source_kind ADD VALUE 'nuovo_valore';` in migration separata dalla INSERT che lo usa (PostgreSQL non permette stesso tx).
- `ingestion_sources.feed_url` era NOT NULL sul remoto — reso nullable in migration `20260401000004`.
- `ingestion_runs.status` usa valori `'success'`/`'error'` nel codice TS — aggiunti via `ALTER TYPE` in `20260401000003`.

## pg_cron

- `pg_cron` e `pg_net` NON erano installati di default — abilitati in `20260401000005_enable_cron.sql`.
- Job schedulato: `ingest-events-hourly` ogni ora (`0 * * * *`) via `extensions.http_post`.
- URL hardcoded: `https://gytrrdlkxizzbvuoswnq.supabase.co/functions/v1/ingest-events`.

## Migrations applicate

- `20260401000003` — ALTER TYPE add eventbrite/ticketmaster/success/error
- `20260401000004` — feed_url nullable + seed ingestion_sources (Milano IT/Roma IT)
- `20260401000005` — CREATE EXTENSION pg_net/pg_cron + cron.schedule
