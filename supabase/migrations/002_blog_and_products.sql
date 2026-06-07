-- ============================================================
-- MIGRAZIONE 002 — Aggiunge colonne slug, estratto, pubblicato
--                  alla tabella articoli e storage policy
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── COME IMPOSTARE UN ADMIN ──────────────────────────────────
-- Sostituisci <user-id> con l'ID dell'utente da Authentication → Users
-- Usa UPSERT per creare il record se non esiste ancora:
--
-- INSERT INTO public.utenti (id, ruolo)
-- VALUES ('<user-id>', 'admin')
-- ON CONFLICT (id) DO UPDATE SET ruolo = 'admin';
--
-- ────────────────────────────────────────────────────────────

-- ── TABELLA articoli ─────────────────────────────────────────
ALTER TABLE public.articoli
  ADD COLUMN IF NOT EXISTS slug        TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS estratto    TEXT,
  ADD COLUMN IF NOT EXISTS pubblicato  BOOLEAN NOT NULL DEFAULT false;

-- Indice sullo slug per query veloci
CREATE UNIQUE INDEX IF NOT EXISTS articoli_slug_idx ON public.articoli (slug);

-- ── TABELLA prodotti ─────────────────────────────────────────
-- Assicurati che la colonna descrizione esista
ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS descrizione TEXT;

-- ── STORAGE: bucket prodotti-digitali (privato) ───────────────
-- Crea il bucket se non esiste ancora (eseguire una sola volta)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prodotti-digitali', 'prodotti-digitali', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: solo service_role (admin server-side) può fare upload
-- Gli utenti autenticati NON accedono direttamente: passano dall'API
CREATE POLICY "Solo admin server può gestire i PDF"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'prodotti-digitali' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'prodotti-digitali' AND auth.role() = 'service_role');

-- ── RLS articoli: lettura pubblica solo per articoli pubblicati ──
ALTER TABLE public.articoli ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articoli pubblicati visibili a tutti"
  ON public.articoli FOR SELECT
  USING (pubblicato = true);

CREATE POLICY "Admin può fare tutto sugli articoli"
  ON public.articoli FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.utenti
      WHERE id = auth.uid() AND ruolo = 'admin'
    )
  );

-- ── RLS prodotti: lettura pubblica ──────────────────────────
ALTER TABLE public.prodotti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prodotti visibili a tutti"
  ON public.prodotti FOR SELECT
  USING (true);

CREATE POLICY "Admin può gestire i prodotti"
  ON public.prodotti FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.utenti
      WHERE id = auth.uid() AND ruolo = 'admin'
    )
  );
