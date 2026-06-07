import type { APIRoute } from 'astro';
import { uploadOgImageFromB64 } from '../../../lib/admin-upload';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

function decodeHtml(body: Record<string, unknown>, b64Key: string): string {
  if (body[b64Key]) {
    return Buffer.from(String(body[b64Key]), 'base64').toString('utf-8');
  }
  return String(body.anteprima ?? '').trim();
}

async function resolveOgImage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  body: Record<string, unknown>,
  fallback: string | null,
): Promise<string | null> {
  const ogB64 = String(body.og_image_b64 ?? '').trim();
  if (ogB64) {
    const ext = String(body.og_image_ext ?? 'jpg').trim().toLowerCase();
    return uploadOgImageFromB64(supabase, ogB64, ext);
  }
  const url = String(body.seo_og_image ?? '').trim();
  return url || fallback;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON non valido' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const action = String(body.action ?? 'crea');
  const supabase = createSupabaseAdminClient();

  if (action === 'elimina') {
    const id = String(body.id ?? '');
    if (!id) return new Response(JSON.stringify({ error: 'ID mancante' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    const { error } = await supabase.from('bundles').delete().eq('id', id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const nome = String(body.nome ?? '').trim();
  const descrizione = String(body.descrizione ?? '').trim() || null;
  const anteprima = decodeHtml(body, 'anteprima_b64') || null;
  const prezzo = parseFloat(String(body.prezzo ?? ''));
  const prezzoOrigRaw = String(body.prezzo_originale ?? '').trim();
  const prezzo_originale = prezzoOrigRaw ? parseFloat(prezzoOrigRaw) : null;
  const seo_titolo = String(body.seo_titolo ?? '').trim() || null;
  const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
  const prodottoIds = Array.isArray(body.prodotto_ids) ? body.prodotto_ids.map(String) : [];
  const slug = String(body.slug ?? '').trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null;

  if (!nome || isNaN(prezzo) || prezzo <= 0) {
    return new Response(JSON.stringify({ error: 'Nome e prezzo (> 0) sono obbligatori' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'crea' && prodottoIds.length < 2) {
    return new Response(JSON.stringify({ error: 'Seleziona almeno 2 prodotti per il bundle' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const seo_og_image = await resolveOgImage(supabase, body, null);

    if (action === 'aggiorna') {
      const id = String(body.id ?? '');
      if (!id) return new Response(JSON.stringify({ error: 'ID mancante' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

      const { error } = await supabase.from('bundles').update({
        nome, descrizione, anteprima, prezzo,
        prezzo_originale: (prezzo_originale && prezzo_originale > prezzo) ? prezzo_originale : null,
        slug, seo_titolo, seo_descrizione, seo_og_image,
      }).eq('id', id);

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

      if (prodottoIds.length >= 2) {
        await supabase.from('bundle_prodotti').delete().eq('bundle_id', id);
        await supabase.from('bundle_prodotti').insert(
          prodottoIds.map((pid) => ({ bundle_id: id, prodotto_id: pid })),
        );
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    let finalSlug = slug || nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const { data: existing } = await supabase.from('bundles').select('slug').like('slug', `${finalSlug}%`);
    if (existing && existing.length > 0) finalSlug = `${finalSlug}-${Date.now()}`;

    const { data: inserted, error } = await supabase.from('bundles').insert({
      nome, descrizione, anteprima, prezzo,
      prezzo_originale: (prezzo_originale && prezzo_originale > prezzo) ? prezzo_originale : null,
      slug: finalSlug, seo_titolo, seo_descrizione, seo_og_image,
    }).select('id').single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });

    await supabase.from('bundle_prodotti').insert(
      prodottoIds.map((pid) => ({ bundle_id: inserted!.id, prodotto_id: pid })),
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
