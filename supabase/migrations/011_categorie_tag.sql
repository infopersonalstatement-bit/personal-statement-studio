-- ============================================================
-- MIGRAZIONE 011 — Categorie e Tag per blog e shop
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabella categorie ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorie (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  slug         text NOT NULL UNIQUE,
  descrizione  text,
  tipo         text NOT NULL DEFAULT 'both' CHECK (tipo IN ('blog','shop','both')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Tabella tag ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tag (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  tipo        text NOT NULL DEFAULT 'both' CHECK (tipo IN ('blog','shop','both')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Colonna categoria_id su articoli e prodotti ────────────
ALTER TABLE public.articoli
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorie(id) ON DELETE SET NULL;

ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorie(id) ON DELETE SET NULL;

-- ── Tabelle di giunzione (many-to-many tag) ────────────────
CREATE TABLE IF NOT EXISTS public.articoli_tag (
  articolo_id uuid REFERENCES public.articoli(id)  ON DELETE CASCADE,
  tag_id      uuid REFERENCES public.tag(id)        ON DELETE CASCADE,
  PRIMARY KEY (articolo_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.prodotti_tag (
  prodotto_id uuid REFERENCES public.prodotti(id)  ON DELETE CASCADE,
  tag_id      uuid REFERENCES public.tag(id)        ON DELETE CASCADE,
  PRIMARY KEY (prodotto_id, tag_id)
);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.categorie    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articoli_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prodotti_tag ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere
CREATE POLICY "categorie_select_public" ON public.categorie
  FOR SELECT USING (true);
CREATE POLICY "tag_select_public" ON public.tag
  FOR SELECT USING (true);
CREATE POLICY "articoli_tag_select_public" ON public.articoli_tag
  FOR SELECT USING (true);
CREATE POLICY "prodotti_tag_select_public" ON public.prodotti_tag
  FOR SELECT USING (true);

-- Solo admin possono scrivere (le pagine admin usano service_role, quindi queste policy
-- servono come doppia protezione per i client autenticati normali)
CREATE POLICY "categorie_admin_all" ON public.categorie
  FOR ALL USING (public.is_admin());
CREATE POLICY "tag_admin_all" ON public.tag
  FOR ALL USING (public.is_admin());
CREATE POLICY "articoli_tag_admin_all" ON public.articoli_tag
  FOR ALL USING (public.is_admin());
CREATE POLICY "prodotti_tag_admin_all" ON public.prodotti_tag
  FOR ALL USING (public.is_admin());
