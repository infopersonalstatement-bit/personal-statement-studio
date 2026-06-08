import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

const VALID_PAGES = ['home', 'manifesto', 'shop', 'blog', 'bundle', 'glow-up', 'digital-identity'];

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

  const page = String(body.page ?? '').trim();
  if (!VALID_PAGES.includes(page)) {
    return new Response(JSON.stringify({ error: 'Pagina non valida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const seo_titolo      = String(body.seo_titolo      ?? '').trim() || null;
  const seo_descrizione = String(body.seo_descrizione ?? '').trim() || null;
  const seo_og_image    = String(body.seo_og_image    ?? '').trim() || null;

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('page_seo')
    .upsert({ page, seo_titolo, seo_descrizione, seo_og_image }, { onConflict: 'page' });

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
};
