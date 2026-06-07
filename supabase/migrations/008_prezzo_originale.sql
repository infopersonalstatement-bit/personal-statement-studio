-- Prezzo originale barrato per sconti sui prodotti
ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS prezzo_originale NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.prodotti.prezzo_originale IS
  'Prezzo prima dello sconto — se valorizzato viene mostrato barrato accanto al prezzo attuale';
