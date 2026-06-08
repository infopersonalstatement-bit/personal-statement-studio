import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

function slugify(t: string) {
  return t.toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èé]/g, 'e')
    .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

  const supabase = createSupabaseAdminClient();
  const action = String(body.action ?? '');

  if (action === 'crea_categoria') {
    const nome = String(body.nome ?? '').trim();
    const tipo = String(body.tipo ?? 'both').trim();
    const descrizione = String(body.descrizione ?? '').trim() || null;
    const slugInput = String(body.slug ?? '').trim();
    const slug = slugInput ? slugify(slugInput) : slugify(nome);

    if (!nome || !slug) {
      return new Response(JSON.stringify({ error: 'Nome obbligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('categorie')
      .insert({ nome, slug, descrizione, tipo })
      .select('id, nome, slug, tipo')
      .single();

    if (error) {
      const msg = error.message.includes('unique') || error.message.includes('duplicate')
        ? `Esiste già una categoria con slug "${slug}".`
        : error.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, categoria: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'crea_tag') {
    const nome = String(body.nome ?? '').trim();
    const tipo = String(body.tipo ?? 'both').trim();
    const slugInput = String(body.slug ?? '').trim();
    const slug = slugInput ? slugify(slugInput) : slugify(nome);

    if (!nome || !slug) {
      return new Response(JSON.stringify({ error: 'Nome obbligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('tag')
      .insert({ nome, slug, tipo })
      .select('id, nome, slug, tipo')
      .single();

    if (error) {
      const msg = error.message.includes('unique') || error.message.includes('duplicate')
        ? `Esiste già un tag con slug "${slug}".`
        : error.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, tag: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Azione non riconosciuta' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
