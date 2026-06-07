import type { APIRoute } from 'astro';

/* GET — restituisce il profilo dell'utente corrente */
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 });

  const { data, error } = await locals.supabase
    .from('utenti')
    .select('nome, telefono, lingua, ruolo')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify(data ?? {}), {
    headers: { 'Content-Type': 'application/json' },
  });
};

/* POST — aggiorna nome, telefono, lingua */
export const POST: APIRoute = async ({ locals, request }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Non autenticato' }), { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ error: 'Payload non valido' }), { status: 400 });

  const { nome, telefono, lingua } = body;

  // Valida lingua
  const lingueValide = ['it', 'en', 'es', 'fr', 'de'];
  if (lingua && !lingueValide.includes(lingua)) {
    return new Response(JSON.stringify({ error: 'Lingua non supportata' }), { status: 400 });
  }

  const updateData: Record<string, string> = {};
  if (nome     !== undefined) updateData.nome     = nome.trim().slice(0, 120);
  if (telefono !== undefined) updateData.telefono = telefono.trim().slice(0, 30);
  if (lingua   !== undefined) updateData.lingua   = lingua;

  // Upsert: crea il record se non esiste ancora
  const { error } = await locals.supabase
    .from('utenti')
    .upsert({ id: user.id, ...updateData }, { onConflict: 'id' });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
