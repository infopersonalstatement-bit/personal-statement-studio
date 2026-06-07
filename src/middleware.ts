import { defineMiddleware } from 'astro:middleware';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';

const PROTECTED_PATHS = ['/dashboard', '/admin'];
const AUTH_PATHS      = ['/auth/login', '/auth/registrazione'];

export const onRequest = defineMiddleware(async (
  { request, cookies, locals, redirect, url },
  next
) => {
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    }
  );

  locals.supabase = supabase;
  locals.isAdmin  = false;

  const { data: { user } } = await supabase.auth.getUser();
  locals.user = user ?? null;

  const { pathname } = url;

  // Rotte protette → redirect al login se non autenticato
  if (!user && PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Utente autenticato: controlla sempre il ruolo (serve anche su pagine pubbliche come /shop)
  if (user) {
    const { data: profile } = await supabase
      .from('utenti')
      .select('ruolo')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.ruolo === 'admin';
    locals.isAdmin = isAdmin;

    // Pagine di auth → manda al posto giusto in base al ruolo
    if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
      return redirect(isAdmin ? '/admin' : '/dashboard');
    }

    // Admin che visita /dashboard → manda all'admin panel
    if (isAdmin && pathname.startsWith('/dashboard')) {
      return redirect('/admin');
    }

    // Non-admin che tenta di accedere ad /admin → dashboard utente
    if (!isAdmin && pathname.startsWith('/admin')) {
      return redirect('/dashboard');
    }
  }

  return next();
});
