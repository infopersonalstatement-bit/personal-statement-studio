-- ============================================================
-- MIGRAZIONE 015 — SEO personalizzabile per le pagine statiche
-- Permette all'admin di impostare titolo, descrizione e OG image
-- per home, manifesto, shop, blog, protocolli, bundle.
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_seo (
  page             text        NOT NULL PRIMARY KEY,  -- 'home', 'manifesto', 'shop', 'blog', 'bundle', 'glow-up', 'digital-identity'
  seo_titolo       text,
  seo_descrizione  text,
  seo_og_image     text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Trigger aggiornamento automatico updated_at
CREATE OR REPLACE FUNCTION public.set_page_seo_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER page_seo_updated_at
  BEFORE UPDATE ON public.page_seo
  FOR EACH ROW EXECUTE FUNCTION public.set_page_seo_updated_at();

-- Inserisci le pagine con valori di default (lascia null per usare i default del codice)
INSERT INTO public.page_seo (page) VALUES
  ('home'),
  ('manifesto'),
  ('shop'),
  ('blog'),
  ('bundle'),
  ('glow-up'),
  ('digital-identity')
ON CONFLICT (page) DO NOTHING;

-- RLS: lettura pubblica, scrittura solo service_role
ALTER TABLE public.page_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura pubblica page_seo"
  ON public.page_seo FOR SELECT USING (true);

CREATE POLICY "Solo admin server scrive page_seo"
  ON public.page_seo FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Tabella dedicata per le traduzioni SEO delle pagine (entity_id è slug testo, non uuid)
CREATE TABLE IF NOT EXISTS public.page_seo_translations (
  page  text NOT NULL,
  lang  text NOT NULL CHECK (lang IN ('en', 'fr', 'es', 'de')),
  seo_titolo      text,
  seo_descrizione text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page, lang)
);

ALTER TABLE public.page_seo_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura pubblica page_seo_translations"
  ON public.page_seo_translations FOR SELECT USING (true);

CREATE POLICY "Solo admin server scrive page_seo_translations"
  ON public.page_seo_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
