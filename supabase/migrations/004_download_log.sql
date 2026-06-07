-- ============================================================
-- MIGRAZIONE 004 — Tabella log dei download
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.download_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  utente_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prodotto_id uuid        NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

-- Indice per query rapide: "quante volte ha scaricato X oggi?"
CREATE INDEX IF NOT EXISTS download_log_utente_prodotto_idx
  ON public.download_log (utente_id, prodotto_id, created_at DESC);

-- RLS: solo service_role scrive, gli admin possono leggere tutto
ALTER TABLE public.download_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role gestisce i log"
  ON public.download_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admin può leggere i log"
  ON public.download_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.utenti
      WHERE id = auth.uid() AND ruolo = 'admin'
    )
  );
