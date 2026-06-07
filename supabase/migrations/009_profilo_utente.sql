-- ============================================================
-- MIGRAZIONE 009 — Aggiunge campi profilo alla tabella utenti
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Aggiungi colonne ───────────────────────────────────
ALTER TABLE public.utenti
  ADD COLUMN IF NOT EXISTS nome     TEXT,
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS lingua   TEXT NOT NULL DEFAULT 'it';

-- ── 2. Funzione helper SECURITY DEFINER ───────────────────
-- Controlla se l'utente corrente è admin senza innescare RLS
-- (SECURITY DEFINER esegue con i permessi del proprietario,
--  bypassando le row-level policies sulla stessa tabella)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid() AND ruolo = 'admin'
  );
$$;

-- ── 3. Rimuovi policy vecchie se esistono ─────────────────
DROP POLICY IF EXISTS "Utente legge il proprio profilo"    ON public.utenti;
DROP POLICY IF EXISTS "Utente aggiorna il proprio profilo" ON public.utenti;
DROP POLICY IF EXISTS "Admin può fare tutto sugli utenti"  ON public.utenti;
DROP POLICY IF EXISTS "Admin può leggere tutti gli utenti" ON public.utenti;

-- ── 4. Abilita RLS ────────────────────────────────────────
ALTER TABLE public.utenti ENABLE ROW LEVEL SECURITY;

-- ── 5. Policy corrette (senza ricorsione) ─────────────────

-- SELECT: proprio profilo oppure admin (usa la funzione, non query inline)
CREATE POLICY "Lettura utenti"
  ON public.utenti FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- UPDATE: solo il proprio profilo
CREATE POLICY "Aggiornamento proprio profilo"
  ON public.utenti FOR UPDATE
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: upsert del proprio record (necessario per creare il profilo la prima volta)
CREATE POLICY "Inserimento proprio profilo"
  ON public.utenti FOR INSERT
  WITH CHECK (id = auth.uid());
