import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const file     = formData.get('file') as File | null;
  const nome     = String(formData.get('nome') ?? 'prodotto').trim();

  if (!file || file.size === 0) {
    return new Response(JSON.stringify({ error: 'Nessun file PDF' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return new Response(JSON.stringify({ error: 'Il file deve essere in formato PDF' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const safeName = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `${safeName}-${Date.now()}.pdf`;
  const filePath = `pdfs/${fileName}`;
  const buffer   = new Uint8Array(await file.arrayBuffer());

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from('prodotti-digitali')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ file_path: filePath }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
