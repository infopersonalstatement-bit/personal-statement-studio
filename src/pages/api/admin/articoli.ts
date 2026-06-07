import type { APIRoute } from 'astro';
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

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurata su Vercel' }), {
      status: 500,
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

  const titolo          = String(body.titolo ?? '').trim();
  const estratto        = String(body.estratto ?? '').trim() || null;
  const pubblicato      = Boolean(body.pubblicato);
  const seo_titolo      = String(body.seo_titolo ?? '').trim() || null;
  const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
  const seo_og_image    = String(body.seo_og_image ?? '').trim() || null;

  // Contenuto: accetta plain o base64 (per evitare blocchi WAF Vercel)
  let contenuto = '';
  if (body.contenuto_b64) {
    try {
      contenuto = Buffer.from(String(body.contenuto_b64), 'base64').toString('utf-8');
    } catch {
      return new Response(JSON.stringify({ error: 'Contenuto base64 non valido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    contenuto = String(body.contenuto ?? '').trim();
  }

  if (!titolo || !contenuto || contenuto === '<p><br></p>') {
    return new Response(JSON.stringify({ error: 'Titolo e contenuto sono obbligatori' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let slug = slugify(titolo);
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from('articoli')
    .select('slug')
    .like('slug', `${slug}%`);

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

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, slug }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
