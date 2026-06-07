-- ============================================================
-- MIGRAZIONE 003 — Aggiunge la colonna anteprima alla tabella prodotti
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS anteprima TEXT;
