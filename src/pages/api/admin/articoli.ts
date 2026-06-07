import type { APIRoute } from 'astro';
import { uploadOgImageFromB64 } from '../../../lib/admin-upload';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/ç/g, 'c').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function decodeHtml(body: Record<string, unknown>, plainKey: string, b64Key: string): string {
  if (body[b64Key]) {
    return Buffer.from(String(body[b64Key]), 'base64').toString('utf-8');
  }
  return String(body[plainKey] ?? '').trim();
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
    return jsonResponse({ error: 'Non autorizzato' }, 403);
  }

  if (!import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurata su Vercel' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Body JSON non valido' }, 400);
  }

  const action = String(body.action ?? 'crea');
  const supabase = createSupabaseAdminClient();

  if (action === 'toggle-pubblica') {
    const id = String(body.id ?? '');
    const attuale = Boolean(body.attuale);
    if (!id) return jsonResponse({ error: 'ID mancante' }, 400);

    const { error } = await supabase.from('articoli').update({ pubblicato: !attuale }).eq('id', id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  if (action === 'elimina') {
    const id = String(body.id ?? '');
    if (!id) return jsonResponse({ error: 'ID mancante' }, 400);

    const { error } = await supabase.from('articoli').delete().eq('id', id);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true });
  }

  if (action === 'aggiorna') {
    const id = String(body.id ?? '');
    const titolo = String(body.titolo ?? '').trim();
    const estratto = String(body.estratto ?? '').trim() || null;
    const pubblicato = Boolean(body.pubblicato);
    const seo_titolo = String(body.seo_titolo ?? '').trim() || null;
    const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
    const categoria_id = String(body.categoria_id ?? '').trim() || null;
    const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids.map(String) : [];
    const slugInput = String(body.slug ?? '').trim();
    const slug = slugInput ? slugify(slugInput) : null;
    const contenuto = decodeHtml(body, 'contenuto', 'contenuto_b64');

    if (!id || !titolo || !contenuto || contenuto === '<p><br></p>') {
      return jsonResponse({ error: 'Titolo e contenuto sono obbligatori' }, 400);
    }

    try {
      const seo_og_image = await resolveOgImage(
        supabase,
        body,
        String(body.seo_og_image ?? '').trim() || null,
      );

      const updatePayload: Record<string, unknown> = {
        titolo,
        estratto,
        contenuto,
        pubblicato,
        seo_titolo,
        seo_descrizione,
        seo_og_image,
        categoria_id,
      };
      if (slug) updatePayload.slug = slug;

      const { error } = await supabase.from('articoli').update(updatePayload).eq('id', id);
      if (error) return jsonResponse({ error: error.message }, 500);

      await supabase.from('articoli_tag').delete().eq('articolo_id', id);
      if (tagIds.length > 0) {
        await supabase.from('articoli_tag').insert(tagIds.map((tid) => ({ articolo_id: id, tag_id: tid })));
      }

      return jsonResponse({ ok: true });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Errore upload immagine';
      return jsonResponse({ error: message }, 500);
    }
  }

  // ── Crea articolo ──────────────────────────────────────────
  const titolo = String(body.titolo ?? '').trim();
  const estratto = String(body.estratto ?? '').trim() || null;
  const pubblicato = Boolean(body.pubblicato);
  const seo_titolo = String(body.seo_titolo ?? '').trim() || null;
  const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
  const contenuto = decodeHtml(body, 'contenuto', 'contenuto_b64');

  if (!titolo || !contenuto || contenuto === '<p><br></p>') {
    return jsonResponse({ error: 'Titolo e contenuto sono obbligatori' }, 400);
  }

  try {
    const seo_og_image = await resolveOgImage(supabase, body, null);

    let slug = slugify(titolo);
    const { data: existing } = await supabase.from('articoli').select('slug').like('slug', `${slug}%`);
    if (existing && existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const { error } = await supabase.from('articoli').insert({
      titolo,
      slug,
      estratto,
      contenuto,
      pubblicato,
      seo_titolo,
      seo_descrizione,
      seo_og_image,
    });

    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ ok: true, slug });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore upload immagine';
    return jsonResponse({ error: message }, 500);
  }
};
