-- ============================================================
-- MIGRAZIONE 010 — View analytics per la dashboard admin
-- Eseguire su: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── View: utenti con dati profilo + statistiche acquisti ──
CREATE OR REPLACE VIEW public.admin_utenti_completo AS
SELECT
  au.id,
  au.email,
  au.created_at                       AS registrato_il,
  u.nome,
  u.telefono,
  COALESCE(u.lingua, 'it')            AS lingua,
  COALESCE(u.ruolo, 'user')           AS ruolo,
  COUNT(DISTINCT acq.id)              AS num_acquisti,
  COALESCE(SUM(pr.prezzo), 0)         AS totale_speso
FROM auth.users au
LEFT JOIN public.utenti  u   ON u.id   = au.id
LEFT JOIN public.acquisti acq ON acq.utente_id = au.id
LEFT JOIN public.prodotti pr  ON pr.id = acq.prodotto_id
GROUP BY au.id, au.email, au.created_at, u.nome, u.telefono, u.lingua, u.ruolo;

-- ── View: revenue e vendite per prodotto ──────────────────
CREATE OR REPLACE VIEW public.admin_revenue_prodotti AS
SELECT
  p.id,
  p.nome,
  p.prezzo,
  COUNT(acq.id)               AS vendite,
  COALESCE(SUM(p.prezzo), 0)  AS revenue_totale
FROM public.prodotti p
LEFT JOIN public.acquisti acq ON acq.prodotto_id = p.id
GROUP BY p.id, p.nome, p.prezzo
ORDER BY vendite DESC;
