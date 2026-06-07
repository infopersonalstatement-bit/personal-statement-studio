import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

// Massimo download consentiti per utente per prodotto nelle ultime 24 ore
const MAX_DOWNLOADS_PER_DAY = 5;

export const GET: APIRoute = async ({ params, locals, request }) => {
  // 1. Verifica autenticazione
  if (!locals.user) {
    return new Response('Non autorizzato', { status: 401 });
  }

  const { productId } = params;
  const supabaseAdmin = createSupabaseAdminClient();

  // 2. Verifica accesso: admin oppure utente che ha acquistato
  if (!locals.isAdmin) {
    const { data: acquisto } = await locals.supabase
      .from('acquisti')
      .select('id')
      .eq('utente_id', locals.user.id)
      .eq('prodotto_id', productId)
      .single();

    if (!acquisto) {
      return new Response('Accesso negato: prodotto non acquistato', { status: 403 });
    }

    // 3. Rate limiting: conta i download delle ultime 24 ore
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('download_log')
      .select('*', { count: 'exact', head: true })
      .eq('utente_id', locals.user.id)
      .eq('prodotto_id', productId)
      .gte('created_at', since);

    if ((count ?? 0) >= MAX_DOWNLOADS_PER_DAY) {
      return new Response(
        `Limite raggiunto: puoi scaricare questo prodotto al massimo ${MAX_DOWNLOADS_PER_DAY} volte al giorno.`,
        { status: 429 }
      );
    }
  }

  // 4. Recupera il percorso del file
  const { data: prodotto, error: prodErr } = await supabaseAdmin
    .from('prodotti')
    .select('file_path, nome')
    .eq('id', productId)
    .single();

  if (prodErr || !prodotto?.file_path) {
    return new Response('File non trovato', { status: 404 });
  }

  // 5. Genera URL firmato (scade in 60 secondi)
  const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
    .from('prodotti-digitali')
    .createSignedUrl(prodotto.file_path, 60);

  if (urlError || !signedUrl?.signedUrl) {
    console.error('[download] Errore URL firmato:', urlError?.message);
    return new Response('Errore generazione link', { status: 500 });
  }

  // 6. Registra il download nel log (best-effort — non blocca in caso di errore)
  const ip = request.headers.get('x-forwarded-for')
    ?? request.headers.get('cf-connecting-ip')
    ?? 'unknown';

  supabaseAdmin.from('download_log').insert({
    utente_id:   locals.user.id,
    prodotto_id: productId,
    ip_address:  ip.split(',')[0].trim(),
    user_agent:  request.headers.get('user-agent') ?? null,
  }).then(({ error }) => {
    if (error) console.error('[download] Errore log:', error.message);
  });

  // 7. Redirect al signed URL
  return Response.redirect(signedUrl.signedUrl, 302);
};
