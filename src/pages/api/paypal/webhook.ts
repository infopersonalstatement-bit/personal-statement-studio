import type { APIRoute } from 'astro';
import { verifyWebhookSignature } from '../../../lib/paypal';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();

  // 1. Verifica firma PayPal — rifiuta qualsiasi richiesta non autenticata
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    console.warn('[webhook] Firma PayPal non valida');
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parsa l'evento
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // 3. Gestisce solo l'evento di pagamento completato
  if (event.event_type !== 'CHECKOUT.ORDER.APPROVED') {
    return new Response('OK', { status: 200 });
  }

  // 4. Estrae i dati dell'ordine dai metadati custom (impostati in create-order)
  const orderId: string = event.resource?.id;
  const customId: string = event.resource?.purchase_units?.[0]?.custom_id ?? '';
  // customId formato atteso: "userId:productId"
  const [userId, productId] = customId.split(':');

  if (!userId || !productId) {
    console.error('[webhook] customId malformato:', customId);
    return new Response('Bad Request', { status: 400 });
  }

  // 5. Registra l'acquisto nel DB usando il client admin (bypass RLS)
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin.from('acquisti').upsert(
    {
      utente_id: userId,
      prodotto_id: productId,
      paypal_order_id: orderId,
    },
    { onConflict: 'utente_id,prodotto_id' } // idempotente: no duplicati
  );

  if (error) {
    console.error('[webhook] Errore DB:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`[webhook] Acquisto registrato: user=${userId} product=${productId}`);
  return new Response('OK', { status: 200 });
};
