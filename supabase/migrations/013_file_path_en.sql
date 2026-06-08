-- ============================================================
-- MIGRAZIONE 013 — Aggiunge colonna file_path_en alla tabella prodotti
-- Ogni prodotto può avere un PDF in italiano (file_path) e uno in inglese (file_path_en).
-- L'acquisto include entrambe le versioni.
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS file_path_en TEXT;
