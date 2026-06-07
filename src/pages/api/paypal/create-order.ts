import type { APIRoute } from 'astro';
import { createOrder } from '../../../lib/paypal';

export const POST: APIRoute = async ({ request, locals }) => {
  // Solo utenti autenticati possono creare ordini
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let productId: string;
  try {
    const body = await request.json();
    productId = body.productId;
    if (!productId) throw new Error('productId mancante');
  } catch {
    return new Response(JSON.stringify({ error: 'Body non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Recupera il prezzo dal DB (mai fidarsi del prezzo inviato dal client)
  const { data: prodotto, error } = await locals.supabase
    .from('prodotti')
    .select('prezzo')
    .eq('id', productId)
    .single();

  if (error || !prodotto) {
    return new Response(JSON.stringify({ error: 'Prodotto non trovato' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Passa userId:productId come customId per il webhook di fallback
    const customId = `${locals.user.id}:${productId}`;
    const orderId = await createOrder(Number(prodotto.prezzo).toFixed(2), 'EUR', customId);
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
