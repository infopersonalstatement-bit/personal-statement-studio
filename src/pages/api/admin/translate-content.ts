import type { APIRoute } from 'astro';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';
import { translateFields, TARGET_LANGS } from '../../../lib/translate';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { entity_type?: string; entity_id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entity_type = String(body.entity_type ?? '').trim();
  const entity_id   = String(body.entity_id   ?? '').trim();

  if (!entity_type || !entity_id) {
    return new Response(JSON.stringify({ error: 'entity_type e entity_id obbligatori' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createSupabaseAdminClient();

  try {
    let fields: Record<string, string | null> = {};
    let context = '';

    if (entity_type === 'prodotto') {
      const { data, error } = await supabase
        .from('prodotti')
        .select('nome, descrizione, anteprima, seo_titolo, seo_descrizione')
        .eq('id', entity_id)
        .single();
      if (error || !data) throw new Error('Prodotto non trovato');
      fields = {
        nome:            data.nome            ?? null,
        descrizione:     data.descrizione     ?? null,
        anteprima:       data.anteprima       ?? null,
        seo_titolo:      data.seo_titolo      ?? null,
        seo_descrizione: data.seo_descrizione ?? null,
      };
      context = 'personal growth and digital identity guides';

    } else if (entity_type === 'articolo') {
      const { data, error } = await supabase
        .from('articoli')
        .select('titolo, estratto, seo_titolo, seo_descrizione')
        .eq('id', entity_id)
        .single();
      if (error || !data) throw new Error('Articolo non trovato');
      fields = {
        titolo:          data.titolo          ?? null,
        estratto:        data.estratto        ?? null,
        seo_titolo:      data.seo_titolo      ?? null,
        seo_descrizione: data.seo_descrizione ?? null,
      };
      context = 'a personal growth and digital identity blog';

    } else if (entity_type === 'bundle') {
      const { data, error } = await supabase
        .from('bundles')
        .select('nome, descrizione, seo_titolo, seo_descrizione')
        .eq('id', entity_id)
        .single();
      if (error || !data) throw new Error('Bundle non trovato');
      fields = {
        nome:            data.nome            ?? null,
        descrizione:     data.descrizione     ?? null,
        seo_titolo:      data.seo_titolo      ?? null,
        seo_descrizione: data.seo_descrizione ?? null,
      };
      context = 'personal growth and digital identity guide bundles';

    } else if (entity_type === 'pagina') {
      const { data, error } = await supabase
        .from('page_seo')
        .select('seo_titolo, seo_descrizione')
        .eq('page', entity_id)
        .maybeSingle();
      if (error || !data) throw new Error('Pagina non trovata: ' + entity_id);
      fields = {
        seo_titolo:      data.seo_titolo      ?? null,
        seo_descrizione: data.seo_descrizione ?? null,
      };
      context = 'a personal growth and digital identity brand website';

      // Per le pagine usa page_seo_translations invece di content_translations
      const translations = await translateFields(fields, context);
      const pageRows: { page: string; lang: string; seo_titolo: string; seo_descrizione: string }[] = [];
      for (const lang of TARGET_LANGS) {
        const t = translations[lang];
        if (t.seo_titolo || t.seo_descrizione) {
          pageRows.push({
            page:            entity_id,
            lang,
            seo_titolo:      t.seo_titolo      ?? '',
            seo_descrizione: t.seo_descrizione ?? '',
          });
        }
      }
      if (pageRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('page_seo_translations')
          .upsert(pageRows, { onConflict: 'page,lang' });
        if (upsertErr) throw new Error('Errore salvataggio: ' + upsertErr.message);
      }
      return new Response(
        JSON.stringify({ ok: true, count: pageRows.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    } else {
      return new Response(JSON.stringify({ error: 'entity_type non supportato' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Chiama OpenAI o4-mini — una sola richiesta per tutte le lingue
    const translations = await translateFields(fields, context);

    // Salva nel DB (UPSERT — sovrascrive le traduzioni esistenti)
    const rows: {
      entity_type: string;
      entity_id: string;
      lang: string;
      field: string;
      value: string;
    }[] = [];

    for (const lang of TARGET_LANGS) {
      for (const [field, value] of Object.entries(translations[lang])) {
        if (value && value.trim()) {
          rows.push({ entity_type, entity_id, lang, field, value: value.trim() });
        }
      }
    }

    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('content_translations')
        .upsert(rows, { onConflict: 'entity_type,entity_id,lang,field' });

      if (upsertErr) throw new Error('Errore salvataggio traduzioni: ' + upsertErr.message);
    }

    return new Response(
      JSON.stringify({ ok: true, count: rows.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
    console.error('[translate-content]', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
