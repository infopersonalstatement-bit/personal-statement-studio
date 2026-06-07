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

/**
 * Crea un ordine PayPal e restituisce l'ID ordine da passare ai Smart Buttons.
 * customId formato: "userId:productId" — usato dal webhook per identificare l'acquisto.
 */
export async function createOrder(
  amount: string,
  currency = 'EUR',
  customId?: string
): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: amount },
          ...(customId ? { custom_id: customId } : {}),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error('PayPal: impossibile creare ordine');
  const data = await res.json();
  return data.id as string;
}

/**
 * Recupera i dettagli di un ordine — usato per verificare lo stato
 * prima di registrare l'acquisto nel DB.
 */
export async function getOrderDetails(orderId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('PayPal: ordine non trovato');
  return res.json();
}

/**
 * Verifica la firma del webhook PayPal contro le API ufficiali.
 * Deve restituire true prima di processare qualsiasi evento.
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: import.meta.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    }
  );

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === 'SUCCESS';
}
