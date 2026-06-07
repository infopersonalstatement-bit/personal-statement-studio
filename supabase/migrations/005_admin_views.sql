-- ============================================================
-- MIGRAZIONE 005 — View per l'admin dashboard
-- Permette di leggere email da auth.users nei report admin.
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── View acquisti con email utente ───────────────────────────
CREATE OR REPLACE VIEW public.admin_acquisti AS
SELECT
  a.id,
  a.created_at,
  a.utente_id,
  au.email          AS utente_email,
  a.prodotto_id,
  p.nome            AS prodotto_nome,
  p.prezzo          AS prodotto_prezzo
FROM public.acquisti a
LEFT JOIN auth.users  au ON au.id = a.utente_id
LEFT JOIN public.prodotti p ON p.id = a.prodotto_id;

-- ── View download log con email utente ───────────────────────
CREATE OR REPLACE VIEW public.admin_download_log AS
SELECT
  d.id,
  d.created_at,
  d.ip_address,
  d.utente_id,
  au.email          AS utente_email,
  d.prodotto_id,
  p.nome            AS prodotto_nome
FROM public.download_log d
LEFT JOIN auth.users  au ON au.id = d.utente_id
LEFT JOIN public.prodotti p ON p.id = d.prodotto_id;

-- Le view sono accessibili solo via service_role (nessuna RLS sulle view stesse,
-- ma le chiamate al backend admin usano già il service role key).
