/**
 * Helper per leggere la SEO delle pagine statiche dal DB.
 * Applica traduzioni se disponibili nella lingua richiesta,
 * cadendo sull'italiano e poi sui default hardcoded.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lang } from './i18n/index';

export type PageSlug =
  | 'home'
  | 'manifesto'
  | 'shop'
  | 'blog'
  | 'bundle'
  | 'glow-up'
  | 'digital-identity';

export interface PageSeoData {
  seo_titolo:      string | null;
  seo_descrizione: string | null;
  seo_og_image:    string | null;
}

/** Default italiani hardcoded (fallback se il DB è vuoto) */
const DEFAULTS: Record<PageSlug, PageSeoData> = {
  'home': {
    seo_titolo:      'Personal Statement Studio — Crescita personale e identità digitale',
    seo_descrizione: 'Protocolli digitali per la crescita personale, la presenza online e l\'identità digitale. Glow-Up, Digital Identity e Bundle.',
    seo_og_image:    null,
  },
  'manifesto': {
    seo_titolo:      'Il Manifesto — Personal Statement Studio',
    seo_descrizione: 'Perché esiste Personal Statement Studio: protocolli digitali per crescita personale, presenza online e bundle combinati.',
    seo_og_image:    null,
  },
  'shop': {
    seo_titolo:      'Protocolli — Personal Statement Studio',
    seo_descrizione: 'Glow-Up per la crescita personale, Digital Identity per la presenza online, Bundle per unire entrambi.',
    seo_og_image:    null,
  },
  'blog': {
    seo_titolo:      'Blog — Personal Statement Studio',
    seo_descrizione: 'Riflessioni su identità, posizionamento e crescita personale.',
    seo_og_image:    null,
  },
  'bundle': {
    seo_titolo:      'Bundle — Personal Statement Studio',
    seo_descrizione: 'Pacchetti che uniscono guide di crescita personale e presenza online. Più contenuti, un solo acquisto a prezzo scontato.',
    seo_og_image:    null,
  },
  'glow-up': {
    seo_titolo:      'Glow-Up — Personal Statement Studio',
    seo_descrizione: 'Guide pratiche su come crescere, prenderti cura di te e costruire la versione migliore di te stesso.',
    seo_og_image:    null,
  },
  'digital-identity': {
    seo_titolo:      'Digital Identity — Personal Statement Studio',
    seo_descrizione: 'Dal profilo ai contenuti: consigli su social, caption e presenza online per comunicare chi sei.',
    seo_og_image:    null,
  },
};

/**
 * Legge la SEO di una pagina per la lingua richiesta.
 * Priorià: traduzione DB (se lang != 'it') → italiano DB → default codice.
 */
export async function getPageSeo(
  supabase: SupabaseClient,
  page: PageSlug,
  lang: Lang,
): Promise<PageSeoData> {
  // Leggi il record italiano base
  const { data: base } = await supabase
    .from('page_seo')
    .select('seo_titolo, seo_descrizione, seo_og_image')
    .eq('page', page)
    .maybeSingle();

  const italian: PageSeoData = {
    seo_titolo:      base?.seo_titolo      ?? DEFAULTS[page]?.seo_titolo      ?? null,
    seo_descrizione: base?.seo_descrizione ?? DEFAULTS[page]?.seo_descrizione ?? null,
    seo_og_image:    base?.seo_og_image    ?? DEFAULTS[page]?.seo_og_image    ?? null,
  };

  if (lang === 'it') return italian;

  // Leggi la traduzione per la lingua richiesta
  const { data: tr } = await supabase
    .from('page_seo_translations')
    .select('seo_titolo, seo_descrizione')
    .eq('page', page)
    .eq('lang', lang)
    .maybeSingle();

  if (!tr) return italian;

  return {
    seo_titolo:      tr.seo_titolo      || italian.seo_titolo,
    seo_descrizione: tr.seo_descrizione || italian.seo_descrizione,
    seo_og_image:    italian.seo_og_image, // OG image: stessa per tutte le lingue
  };
}

/**
 * Carica tutti i record page_seo in un colpo solo (per la pagina admin).
 */
export async function getAllPageSeo(
  supabase: SupabaseClient,
): Promise<Record<PageSlug, PageSeoData & { page: string }>> {
  const { data } = await supabase.from('page_seo').select('*');
  const result = {} as Record<string, PageSeoData & { page: string }>;

  for (const p of Object.keys(DEFAULTS) as PageSlug[]) {
    const row = data?.find((r: any) => r.page === p);
    result[p] = {
      page:            p,
      seo_titolo:      row?.seo_titolo      ?? null,
      seo_descrizione: row?.seo_descrizione ?? null,
      seo_og_image:    row?.seo_og_image    ?? null,
    };
  }
  return result as Record<PageSlug, PageSeoData & { page: string }>;
}

export { DEFAULTS };
