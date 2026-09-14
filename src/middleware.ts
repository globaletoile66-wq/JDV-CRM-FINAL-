import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!supabaseUrl || !supabaseKey || !isValidUrl(supabaseUrl)) {
    console.error(
      '[JDV CRM] Variables Supabase manquantes dans le middleware.',
    );

    // Redirect protected routes to their respective login pages
    // even when Supabase is not yet configured.
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith('/terrain/dashboard') ||
      pathname.startsWith('/field-prospector-dashboard') ||
      pathname.startsWith('/agent-performance')
    ) {
      return redirectTo(request, '/terrain/login');
    }

    if (
      pathname.startsWith('/business/dashboard') ||
      pathname.startsWith('/enterprise-admin-dashboard') ||
      pathname.startsWith('/payment-wall')
    ) {
      return redirectTo(request, '/business/login');
    }

    if (pathname.startsWith('/hidden-concepteur-gate/dashboard')) {
      return redirectTo(request, '/hidden-concepteur-gate/login');
    }

    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  /*
   * IMPORTANT :
   * getUser() vérifie réellement l'utilisateur auprès de Supabase Auth.
   * On ne se contente donc pas de vérifier l'existence d'un cookie.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthenticated = Boolean(user);

  /*
   * ─────────────────────────────────────────────────────────────
   * ROUTES PUBLIQUES
   * ─────────────────────────────────────────────────────────────
   */

  const isPublicRoute =
    pathname === '/' || pathname.startsWith('/terrain/login') ||
    pathname.startsWith('/business/login') ||
    pathname.startsWith('/hidden-concepteur-gate/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/subscriptions');

  if (isPublicRoute) {
    return response;
  }

  /*
   * ─────────────────────────────────────────────────────────────
   * PORTAIL PROSPECTEUR TERRAIN
   * ─────────────────────────────────────────────────────────────
   */

  if (pathname.startsWith('/terrain/dashboard')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/terrain/login');
    }

    return response;
  }

  /*
   * ─────────────────────────────────────────────────────────────
   * PORTAIL ADMINISTRATEUR ENTREPRISE
   * ─────────────────────────────────────────────────────────────
   */

  if (pathname.startsWith('/business/dashboard')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/business/login');
    }

    return response;
  }

  /*
   * ─────────────────────────────────────────────────────────────
   * SUPER ADMIN / CONCEPTEUR
   * ─────────────────────────────────────────────────────────────
   *
   * Le middleware vérifie seulement l'authentification ici.
   * Le contrôle SUPER ADMIN réel est effectué côté page/backend
   * avec la table `super_admins`.
   */

  if (pathname.startsWith('/hidden-concepteur-gate/dashboard')) {
    if (!isAuthenticated) {
      return redirectTo(
        request,
        '/hidden-concepteur-gate/login',
      );
    }

    return response;
  }

  /*
   * ─────────────────────────────────────────────────────────────
   * MUR DE PAIEMENT
   * ─────────────────────────────────────────────────────────────
   */

  if (pathname.startsWith('/payment-wall')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/business/login');
    }

    return response;
  }

  /*
   * ─────────────────────────────────────────────────────────────
   * ANCIENNES ROUTES
   * ─────────────────────────────────────────────────────────────
   *
   * Elles ne doivent plus servir de portails principaux.
   * On redirige vers les nouveaux portails.
   */

  if (pathname.startsWith('/enterprise-admin-dashboard')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/business/login');
    }

    return redirectTo(request, '/business/dashboard');
  }

  if (pathname.startsWith('/field-prospector-dashboard')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/terrain/login');
    }

    return redirectTo(request, '/terrain/dashboard');
  }

  if (pathname.startsWith('/agent-performance')) {
    if (!isAuthenticated) {
      return redirectTo(request, '/terrain/login');
    }

    return redirectTo(request, '/terrain/dashboard');
  }

  return response;
}

/*
 * Redirection centralisée.
 */
function redirectTo(
  request: NextRequest,
  pathname: string,
) {
  const url = request.nextUrl.clone();

  url.pathname = pathname;
  url.search = '';

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * On exclut les fichiers statiques et les ressources Next.js.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};