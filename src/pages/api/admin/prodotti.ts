import type { APIRoute } from 'astro';
import { uploadOgImageFromB64, uploadPdfFromB64 } from '../../../lib/admin-upload';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

function decodeHtmlField(body: Record<string, unknown>, plainKey: string, b64Key: string): string {
  if (body[b64Key]) {
    return Buffer.from(String(body[b64Key]), 'base64').toString('utf-8');
  }
  return String(body[plainKey] ?? '').trim();
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

async function resolvePdfPath(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  body: Record<string, unknown>,
  nome: string,
  existing?: string,
): Promise<string | undefined> {
  const pdfB64 = String(body.pdf_b64 ?? '').trim();
  if (pdfB64) {
    return uploadPdfFromB64(supabase, pdfB64, nome);
  }
  const filePath = String(body.file_path ?? '').trim();
  return filePath || existing;
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const action = String(body.action ?? 'crea');
  const supabase = createSupabaseAdminClient();

  if (action === 'aggiorna') {
    const id = String(body.id ?? '');
    const nome = String(body.nome ?? '').trim();
    const descrizione = String(body.descrizione ?? '').trim() || null;
    const anteprima = decodeHtmlField(body, 'anteprima', 'anteprima_b64') || null;
    const prezzo = parseFloat(String(body.prezzo ?? ''));
    const prezzoOrigRaw = String(body.prezzo_originale ?? '').trim();
    const prezzo_originale = prezzoOrigRaw ? parseFloat(prezzoOrigRaw) : null;
    const seo_titolo = String(body.seo_titolo ?? '').trim() || null;
    const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
    const categoria_id = String(body.categoria_id ?? '').trim() || null;
    const tagIds = Array.isArray(body.tag_ids) ? body.tag_ids.map(String) : [];
    const slug = String(body.slug ?? '').trim()
      .toLowerCase()
      .replace(/[àáâ]/g, 'a').replace(/[èé]/g, 'e')
      .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null;

    if (!id || !nome || isNaN(prezzo) || prezzo <= 0) {
      return new Response(JSON.stringify({ error: 'Nome e prezzo (> 0) sono obbligatori' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const file_path = await resolvePdfPath(supabase, body, nome);
      const seo_og_image = await resolveOgImage(
        supabase,
        body,
        String(body.seo_og_image ?? '').trim() || null,
      );

      const updateData: Record<string, unknown> = {
        nome,
        descrizione,
        anteprima,
        prezzo,
        prezzo_originale: (prezzo_originale && prezzo_originale > prezzo) ? prezzo_originale : null,
        seo_titolo,
        seo_descrizione,
        seo_og_image,
        slug,
        categoria_id,
      };
      if (file_path) updateData.file_path = file_path;

      const { error } = await supabase.from('prodotti').update(updateData).eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await supabase.from('prodotti_tag').delete().eq('prodotto_id', id);
      if (tagIds.length > 0) {
        await supabase.from('prodotti_tag').insert(tagIds.map((tid) => ({ prodotto_id: id, tag_id: tid })));
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Errore upload file';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (action === 'elimina') {
    const id = String(body.id ?? '');
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID mancante' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: prod } = await supabase.from('prodotti').select('file_path').eq('id', id).single();
    const { error } = await supabase.from('prodotti').delete().eq('id', id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (prod?.file_path) {
      await supabase.storage.from('prodotti-digitali').remove([prod.file_path]);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Crea prodotto ──────────────────────────────────────────
  const nome = String(body.nome ?? '').trim();
  const descrizione = String(body.descrizione ?? '').trim() || null;
  const anteprima = decodeHtmlField(body, 'anteprima', 'anteprima_b64') || null;
  const prezzo = parseFloat(String(body.prezzo ?? ''));
  const prezzoOrigRaw = String(body.prezzo_originale ?? '').trim();
  const prezzo_originale = prezzoOrigRaw ? parseFloat(prezzoOrigRaw) : null;
  const seo_titolo = String(body.seo_titolo ?? '').trim() || null;
  const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
  let slug = String(body.slug ?? '').trim()
    .toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èé]/g, 'e')
    .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null;

  if (!slug && nome) {
    slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  if (!nome || isNaN(prezzo) || prezzo <= 0) {
    return new Response(JSON.stringify({ error: 'Nome e prezzo (> 0) sono obbligatori' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const file_path = await resolvePdfPath(supabase, body, nome);
    if (!file_path) {
      return new Response(JSON.stringify({ error: 'PDF mancante' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const seo_og_image = await resolveOgImage(supabase, body, null);

    const { error } = await supabase.from('prodotti').insert({
      nome,
      descrizione,
      anteprima,
      prezzo,
      prezzo_originale: (prezzo_originale && prezzo_originale > prezzo) ? prezzo_originale : null,
      file_path,
      slug,
      seo_titolo,
      seo_descrizione,
      seo_og_image,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Errore upload file';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
