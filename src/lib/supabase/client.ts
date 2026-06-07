import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase per il browser.
 * Usa solo la anon key — sicuro da esporre al client.
 * Chiamare come funzione per creare una nuova istanza per componente.
 */
export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );
