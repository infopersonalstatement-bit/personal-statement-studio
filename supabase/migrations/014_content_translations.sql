-- ============================================================
-- MIGRAZIONE 014 — Tabella content_translations
-- Memorizza le traduzioni dei contenuti generati dall'admin
-- (nomi prodotti, descrizioni, titoli articoli, ecc.)
-- Le traduzioni vengono generate una volta via GPT e riutilizzate.
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_translations (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text        NOT NULL CHECK (entity_type IN ('prodotto', 'articolo', 'bundle')),
  entity_id   uuid        NOT NULL,
  lang        text        NOT NULL CHECK (lang IN ('en', 'fr', 'es', 'de')),
  field       text        NOT NULL,
  value       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (entity_type, entity_id, lang, field)
);

CREATE INDEX IF NOT EXISTS ct_lookup_idx
  ON public.content_translations (entity_type, entity_id, lang);

-- Aggiorna updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_ct_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER ct_updated_at
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_ct_updated_at();

-- RLS: solo service_role può scrivere; lettura pubblica ok (i contenuti sono pubblici)
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lettura pubblica traduzioni"
  ON public.content_translations FOR SELECT
  USING (true);

CREATE POLICY "Solo admin server può scrivere"
  ON public.content_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
