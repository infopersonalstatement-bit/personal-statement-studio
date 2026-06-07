-- ============================================================
-- MIGRAZIONE 006 — Campi SEO per articoli e prodotti
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Articoli ─────────────────────────────────────────────────
ALTER TABLE public.articoli
  ADD COLUMN IF NOT EXISTS seo_titolo      TEXT,   -- override del <title> (max ~60 car)
  ADD COLUMN IF NOT EXISTS seo_descrizione TEXT,   -- meta description (max ~160 car)
  ADD COLUMN IF NOT EXISTS seo_og_image    TEXT;   -- URL immagine per social preview

-- ── Prodotti ─────────────────────────────────────────────────
ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS slug            TEXT UNIQUE, -- URL leggibile /shop/mio-prodotto
  ADD COLUMN IF NOT EXISTS seo_titolo      TEXT,
  ADD COLUMN IF NOT EXISTS seo_descrizione TEXT,
  ADD COLUMN IF NOT EXISTS seo_og_image    TEXT;

-- Indice per slug prodotto
CREATE UNIQUE INDEX IF NOT EXISTS prodotti_slug_idx ON public.prodotti (slug);
