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
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return new Response(JSON.stringify({ error: 'Nessun file' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `og-${Date.now()}.${ext}`;
  const buffer   = new Uint8Array(await file.arrayBuffer());

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from('og-images')
    .upload(fileName, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data } = supabase.storage.from('og-images').getPublicUrl(fileName);
  return new Response(JSON.stringify({ url: data.publicUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
