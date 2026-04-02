-- ============================================================
-- Migration: Admin e Preferred City
-- Aggiunge campi is_admin e preferred_city a profiles
-- Aggiorna RLS per permettere admin di gestire ingestion
-- ============================================================

-- Aggiunge campo is_admin a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Aggiunge campo preferred_city a profiles (per ingestion personalizzata)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_city TEXT;

-- Indice per query admin efficienti
CREATE INDEX IF NOT EXISTS idx_profiles_admin
  ON public.profiles(is_admin)
  WHERE is_admin = TRUE;

-- Indice per preferred_city (per query ingestion per città)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_city
  ON public.profiles(preferred_city)
  WHERE preferred_city IS NOT NULL;

-- ============================================================
-- AGGIORNAMENTO RLS POLICIES
-- ============================================================

-- Policy per ingestion_sources - admin può gestire
DROP POLICY IF EXISTS "Service role only for ingestion_sources" ON public.ingestion_sources;
DROP POLICY IF EXISTS "Admin can manage ingestion_sources" ON public.ingestion_sources;

CREATE POLICY "Admin can manage ingestion_sources"
  ON public.ingestion_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Policy per ingestion_runs - admin può vedere
DROP POLICY IF EXISTS "Service role only for ingestion_runs" ON public.ingestion_runs;
DROP POLICY IF EXISTS "Admin can view ingestion_runs" ON public.ingestion_runs;

CREATE POLICY "Admin can view ingestion_runs"
  ON public.ingestion_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Nota: Gli utenti normali non vedono ingestion_runs (nessuna policy SELECT per loro)

-- ============================================================
-- FUNCTION HELPER: is_admin()
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commento sulla funzione
COMMENT ON FUNCTION public.is_admin IS 'Controlla se un utente è admin';
