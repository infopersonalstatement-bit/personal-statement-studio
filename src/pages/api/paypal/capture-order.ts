import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

const PAYPAL_API =
  import.meta.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${import.meta.env.PAYPAL_CLIENT_ID}:${import.meta.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('PayPal: impossibile ottenere access token');
  const data = await res.json();
  return data.access_token as string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  // Solo utenti autenticati
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let orderId: string, productId: string;
  try {
    const body = await request.json();
    orderId   = body.orderId;
    productId = body.productId;
    if (!orderId || !productId) throw new Error('Dati mancanti');
  } catch {
    return new Response(JSON.stringify({ error: 'Body non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Cattura il pagamento su PayPal
    const token = await getAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      const err = await captureRes.json();
      console.error('[capture-order] PayPal error:', err);
      return new Response(JSON.stringify({ error: 'Errore cattura PayPal' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const capture = await captureRes.json();

    // 2. Verifica che lo stato sia COMPLETED
    if (capture.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: `Pagamento non completato (stato: ${capture.status})` }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Registra l'acquisto nel DB usando il client admin (bypass RLS)
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: dbError } = await supabaseAdmin.from('acquisti').upsert(
      {
        utente_id:       locals.user.id,
        prodotto_id:     productId,
        paypal_order_id: orderId,
      },
      { onConflict: 'utente_id,prodotto_id' }
    );

    if (dbError) {
      console.error('[capture-order] DB error:', dbError.message);
      return new Response(JSON.stringify({ error: 'Pagamento OK, errore salvataggio' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[capture-order] Unexpected error:', err.message);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
