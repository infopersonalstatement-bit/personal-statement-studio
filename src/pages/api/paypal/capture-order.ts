import type { APIRoute } from 'astro';
import { grantBundleAccess } from '../../../lib/bundle-acquisti';
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
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let orderId: string;
  let productId: string | undefined;
  let bundleId: string | undefined;

  try {
    const body = await request.json();
    orderId = body.orderId;
    productId = body.productId;
    bundleId = body.bundleId;
    if (!orderId) throw new Error('orderId mancante');
    if (!productId && !bundleId) throw new Error('productId o bundleId richiesto');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Body non valido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = await getAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!captureRes.ok) {
      console.error('[capture-order] PayPal error:', await captureRes.json());
      return new Response(JSON.stringify({ error: 'Errore cattura PayPal' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const capture = await captureRes.json();
    if (capture.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: `Pagamento non completato (${capture.status})` }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    if (bundleId) {
      const result = await grantBundleAccess(supabaseAdmin, locals.user.id, bundleId, orderId);
      if (result.error) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      const { error: dbError } = await supabaseAdmin.from('acquisti').upsert(
        {
          utente_id: locals.user.id,
          prodotto_id: productId!,
          paypal_order_id: orderId,
        },
        { onConflict: 'utente_id,prodotto_id' },
      );

      if (dbError) {
        console.error('[capture-order] DB error:', dbError.message);
        return new Response(JSON.stringify({ error: 'Pagamento OK, errore salvataggio' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore interno';
    console.error('[capture-order]', msg);
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
