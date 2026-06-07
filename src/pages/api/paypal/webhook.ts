import type { APIRoute } from 'astro';
import { grantBundleAccess } from '../../../lib/bundle-acquisti';
import { verifyWebhookSignature } from '../../../lib/paypal';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    console.warn('[webhook] Firma PayPal non valida');
    return new Response('Unauthorized', { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  if (event.event_type !== 'CHECKOUT.ORDER.APPROVED') {
    return new Response('OK', { status: 200 });
  }

  const orderId: string = event.resource?.id;
  const customId: string = event.resource?.purchase_units?.[0]?.custom_id ?? '';

  const supabaseAdmin = createSupabaseAdminClient();

  if (customId.startsWith('b:')) {
    const [, userId, bundleId] = customId.split(':');
    if (!userId || !bundleId) {
      console.error('[webhook] customId bundle malformato:', customId);
      return new Response('Bad Request', { status: 400 });
    }
    const result = await grantBundleAccess(supabaseAdmin, userId, bundleId, orderId);
    if (result.error) {
      console.error('[webhook] Errore bundle:', result.error);
      return new Response('Internal Server Error', { status: 500 });
    }
    console.log(`[webhook] Bundle registrato: user=${userId} bundle=${bundleId}`);
    return new Response('OK', { status: 200 });
  }

  let userId: string;
  let productId: string;

  if (customId.startsWith('p:')) {
    [, userId, productId] = customId.split(':');
  } else {
    [userId, productId] = customId.split(':');
  }

  if (!userId || !productId) {
    console.error('[webhook] customId malformato:', customId);
    return new Response('Bad Request', { status: 400 });
  }

  const { error } = await supabaseAdmin.from('acquisti').upsert(
    {
      utente_id: userId,
      prodotto_id: productId,
      paypal_order_id: orderId,
    },
    { onConflict: 'utente_id,prodotto_id' },
  );

  if (error) {
    console.error('[webhook] Errore DB:', error.message);
    return new Response('Internal Server Error', { status: 500 });
  }

  console.log(`[webhook] Acquisto registrato: user=${userId} product=${productId}`);
  return new Response('OK', { status: 200 });
};
