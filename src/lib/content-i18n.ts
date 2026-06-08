/**
 * Helper per leggere le traduzioni dei contenuti dal DB.
 * Usato nelle pagine per sovrapporre le traduzioni al contenuto italiano.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Lang } from './i18n/index';

type TranslationRow = { field: string; value: string };

/**
 * Recupera tutte le traduzioni per un'entità nella lingua richiesta.
 * Ritorna un Record<field, value> o un oggetto vuoto se non ci sono traduzioni.
 */
export async function getTranslations(
  supabase: SupabaseClient,
  entity_type: 'prodotto' | 'articolo' | 'bundle',
  entity_id: string,
  lang: Lang,
): Promise<Record<string, string>> {
  if (lang === 'it') return {}; // Italiano = originale, nessuna traduzione necessaria

  const { data } = await supabase
    .from('content_translations')
    .select('field, value')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .eq('lang', lang);

  if (!data || data.length === 0) return {};

  return Object.fromEntries((data as TranslationRow[]).map((r) => [r.field, r.value]));
}

/**
 * Recupera le traduzioni per più entità in una sola query.
 * Ritorna una Map<entity_id, Record<field, value>>.
 */
export async function getTranslationsMany(
  supabase: SupabaseClient,
  entity_type: 'prodotto' | 'articolo' | 'bundle',
  entity_ids: string[],
  lang: Lang,
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();
  if (lang === 'it' || entity_ids.length === 0) return result;

  const { data } = await supabase
    .from('content_translations')
    .select('entity_id, field, value')
    .eq('entity_type', entity_type)
    .in('entity_id', entity_ids)
    .eq('lang', lang);

  if (!data) return result;

  for (const row of data as (TranslationRow & { entity_id: string })[]) {
    if (!result.has(row.entity_id)) result.set(row.entity_id, {});
    result.get(row.entity_id)![row.field] = row.value;
  }
  return result;
}

/**
 * Sovrappone le traduzioni a un oggetto.
 * Se un campo tradotto è disponibile, sostituisce il valore originale.
 */
export function applyTranslations<T extends Record<string, unknown>>(
  original: T,
  translations: Record<string, string>,
): T {
  if (Object.keys(translations).length === 0) return original;
  const result = { ...original };
  for (const [key, value] of Object.entries(translations)) {
    if (value && key in result) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Controlla se un'entità ha traduzioni salvate nel DB.
 */
export async function hasTranslations(
  supabase: SupabaseClient,
  entity_type: 'prodotto' | 'articolo' | 'bundle',
  entity_id: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('content_translations')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id);
  return (count ?? 0) > 0;
}
