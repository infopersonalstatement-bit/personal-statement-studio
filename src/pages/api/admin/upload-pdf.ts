import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

/**
 * Genera una signed upload URL per il bucket prodotti-digitali.
 * Il browser caricherà il PDF direttamente su Supabase (bypassa Vercel),
 * poi invierà solo il file_path al resto dell'API.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { nome?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nome = String(body.nome ?? 'prodotto').trim();
  const safeName = nome.toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èé]/g, 'e')
    .replace(/[ìí]/g, 'i').replace(/[òó]/g, 'o').replace(/[ùú]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'prodotto';
  const filePath = `pdfs/${safeName}-${Date.now()}.pdf`;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from('prodotti-digitali')
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: error?.message ?? 'Impossibile generare URL di upload' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ signed_url: data.signedUrl, token: data.token, path: filePath }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
