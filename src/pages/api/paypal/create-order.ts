import type { APIRoute } from 'astro';
import { createOrder } from '../../../lib/paypal';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let productId: string | undefined;
  let bundleId: string | undefined;
  try {
    const body = await request.json();
    productId = body.productId;
    bundleId = body.bundleId;
    if (!productId && !bundleId) throw new Error('productId o bundleId richiesto');
    if (productId && bundleId) throw new Error('Specificare solo productId o bundleId');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Body non valido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let prezzo: number;
  let customId: string;

  if (bundleId) {
    const { data: bundle, error } = await locals.supabase
      .from('bundles')
      .select('prezzo')
      .eq('id', bundleId)
      .single();

    if (error || !bundle) {
      return new Response(JSON.stringify({ error: 'Bundle non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    prezzo = Number(bundle.prezzo);
    customId = `b:${locals.user.id}:${bundleId}`;
  } else {
    const { data: prodotto, error } = await locals.supabase
      .from('prodotti')
      .select('prezzo')
      .eq('id', productId!)
      .single();

    if (error || !prodotto) {
      return new Response(JSON.stringify({ error: 'Prodotto non trovato' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    prezzo = Number(prodotto.prezzo);
    customId = `p:${locals.user.id}:${productId}`;
  }

  try {
    const orderId = await createOrder(prezzo.toFixed(2), 'EUR', customId);
    return new Response(JSON.stringify({ id: orderId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[create-order]', err);
    return new Response(JSON.stringify({ error: 'Errore PayPal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
