import type { SupabaseClient } from '@supabase/supabase-js';

/** Registra l'accesso a tutti i prodotti inclusi in un bundle. */
export async function grantBundleAccess(
  supabase: SupabaseClient,
  userId: string,
  bundleId: string,
  paypalOrderId: string,
): Promise<{ error?: string }> {
  const { data: items, error: fetchErr } = await supabase
    .from('bundle_prodotti')
    .select('prodotto_id')
    .eq('bundle_id', bundleId);

  if (fetchErr) return { error: fetchErr.message };
  if (!items || items.length === 0) return { error: 'Bundle senza prodotti' };

  const rows = items.map((i) => ({
    utente_id: userId,
    prodotto_id: i.prodotto_id,
    paypal_order_id: paypalOrderId,
  }));

  const { error } = await supabase
    .from('acquisti')
    .upsert(rows, { onConflict: 'utente_id,prodotto_id' });

  if (error) return { error: error.message };
  return {};
}
