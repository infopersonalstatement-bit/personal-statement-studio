-- ============================================================
-- MIGRAZIONE 012 — Protocolli (Glow-Up, Digital Identity) + Bundle
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Protocollo su prodotti singoli ───────────────────────────
ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS protocollo TEXT
  CHECK (protocollo IS NULL OR protocollo IN ('glow-up', 'digital-identity'));

COMMENT ON COLUMN public.prodotti.protocollo IS
  'Protocollo di appartenenza: glow-up | digital-identity';

CREATE INDEX IF NOT EXISTS prodotti_protocollo_idx ON public.prodotti (protocollo);

-- ── Bundle (vendita combinata di più prodotti) ───────────────
CREATE TABLE IF NOT EXISTS public.bundles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  descrizione       TEXT,
  anteprima         TEXT,
  prezzo            NUMERIC NOT NULL CHECK (prezzo > 0),
  prezzo_originale  NUMERIC,
  slug              TEXT UNIQUE,
  seo_titolo        TEXT,
  seo_descrizione   TEXT,
  seo_og_image      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bundle_prodotti (
  bundle_id   UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  prodotto_id UUID NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, prodotto_id)
);

CREATE INDEX IF NOT EXISTS bundle_prodotti_prodotto_idx ON public.bundle_prodotti (prodotto_id);

-- ── RLS bundles ──────────────────────────────────────────────
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_prodotti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundles_select_public" ON public.bundles
  FOR SELECT USING (true);

CREATE POLICY "bundles_admin_all" ON public.bundles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.utenti WHERE id = auth.uid() AND ruolo = 'admin')
  );

CREATE POLICY "bundle_prodotti_select_public" ON public.bundle_prodotti
  FOR SELECT USING (true);

CREATE POLICY "bundle_prodotti_admin_all" ON public.bundle_prodotti
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.utenti WHERE id = auth.uid() AND ruolo = 'admin')
  );
