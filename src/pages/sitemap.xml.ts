import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const site = (import.meta.env.PUBLIC_SITE_URL || 'https://personalstatementstudio.com').replace(/\/$/, '');

  // Pagine statiche
  const staticPages = [
    { path: '/',          priority: '1.0', changefreq: 'weekly'  },
    { path: '/blog',      priority: '0.9', changefreq: 'daily'   },
    { path: '/shop',      priority: '0.9', changefreq: 'weekly'  },
    { path: '/manifesto', priority: '0.7', changefreq: 'monthly' },
  ];

  // Articoli pubblicati
  const { data: articoli } = await locals.supabase
    .from('articoli')
    .select('slug, id, created_at')
    .eq('pubblicato', true)
    .order('created_at', { ascending: false });

  // Prodotti
  const { data: prodotti } = await locals.supabase
    .from('prodotti')
    .select('slug, id, created_at')
    .order('created_at', { ascending: false });

  // Categorie (blog + shop)
  const { data: categorie } = await locals.supabase
    .from('categorie').select('slug, tipo, created_at');

  // Tag (blog + shop)
  const { data: tags } = await locals.supabase
    .from('tag').select('slug, tipo, created_at');

  function urlEntry(loc: string, lastmod?: string, changefreq = 'monthly', priority = '0.8') {
    return `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  const entries: string[] = [
    ...staticPages.map(p => urlEntry(`${site}${p.path}`, undefined, p.changefreq, p.priority)),
    ...(articoli ?? []).map(a =>
      urlEntry(
        `${site}/blog/${a.slug || a.id}`,
        new Date(a.created_at).toISOString().split('T')[0],
        'monthly',
        '0.8'
      )
    ),
    ...(prodotti ?? []).map(p =>
      urlEntry(
        `${site}/shop/${p.slug || p.id}`,
        new Date(p.created_at).toISOString().split('T')[0],
        'monthly', '0.8'
      )
    ),
    // Pagine categorie
    ...(categorie ?? []).flatMap(c => {
      const entries = [];
      if (c.tipo === 'blog' || c.tipo === 'both')
        entries.push(urlEntry(`${site}/blog/categoria/${c.slug}`, undefined, 'weekly', '0.7'));
      if (c.tipo === 'shop' || c.tipo === 'both')
        entries.push(urlEntry(`${site}/shop/categoria/${c.slug}`, undefined, 'weekly', '0.7'));
      return entries;
    }),
    // Pagine tag
    ...(tags ?? []).flatMap(t => {
      const entries = [];
      if (t.tipo === 'blog' || t.tipo === 'both')
        entries.push(urlEntry(`${site}/blog/tag/${t.slug}`, undefined, 'weekly', '0.6'));
      if (t.tipo === 'shop' || t.tipo === 'both')
        entries.push(urlEntry(`${site}/shop/tag/${t.slug}`, undefined, 'weekly', '0.6'));
      return entries;
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
