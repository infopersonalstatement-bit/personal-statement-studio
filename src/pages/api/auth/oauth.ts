import type { APIRoute } from 'astro';
import { authCallbackUrl } from '../../../lib/site';

export const prerender = false;

const ALLOWED_PROVIDERS = ['google', 'facebook'] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

export const GET: APIRoute = async ({ request, locals, redirect }) => {
  const reqUrl    = new URL(request.url);
  const provider  = reqUrl.searchParams.get('provider') as Provider;

  if (!provider || !(ALLOWED_PROVIDERS as readonly string[]).includes(provider)) {
    return redirect('/auth/login?error=provider_non_valido');
  }

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authCallbackUrl(request.url),
    },
  });

  if (error || !data.url) {
    console.error(`[oauth] Errore provider ${provider}:`, error?.message);
    return redirect('/auth/login?error=oauth_fallito');
  }

  // Supabase restituisce l'URL del provider OAuth → redirect lì
  return redirect(data.url);
};
