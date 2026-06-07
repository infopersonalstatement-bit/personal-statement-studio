import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

/**
 * Client Supabase server-side con gestione automatica dei cookie di sessione.
 * Da usare nelle pagine .astro SSR e nelle API route che ricevono una request.
 */
export function createSupabaseServerClient(
  requestHeaders: Headers,
  cookies: AstroCookies
) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(requestHeaders.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Client Supabase con service_role — bypassa completamente le Row Level Security.
 *
 * ⚠️  USARE ESCLUSIVAMENTE nelle API route server-side (es. webhook PayPal).
 * ⚠️  NON importare mai questo file in codice che finisce nel bundle client.
 */
export function createSupabaseAdminClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
