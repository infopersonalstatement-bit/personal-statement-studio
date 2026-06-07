import type { APIRoute } from 'astro';

const ALLOWED_PROVIDERS = ['google', 'facebook'] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const provider = url.searchParams.get('provider') as Provider;

  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return redirect('/auth/login?error=provider_non_valido');
  }

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error || !data.url) {
    console.error(`[oauth] Errore provider ${provider}:`, error?.message);
    return redirect('/auth/login?error=oauth_fallito');
  }

  // Supabase restituisce l'URL del provider OAuth → redirect lì
  return redirect(data.url);
};
