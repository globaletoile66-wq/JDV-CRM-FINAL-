import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/* ============================================================================
 * JDV CRM — MIDDLEWARE
 *
 * Rôle : rafraîchir les cookies de session Supabase à chaque requête.
 *
 * Ce middleware NE BLOQUE AUCUNE ROUTE volontairement. La protection de
 * l'espace SUPER ADMIN est assurée côté page, via le helper partagé
 * `@/lib/auth/super-admin`. Ajouter ici une redirection serait le moyen le
 * plus rapide de recréer une boucle login → dashboard → login.
 *
 * Les journaux verbeux ont été retirés : ils s'exécutaient à chaque requête,
 * y compris pour les ressources statiques, et noyaient la console.
 * ========================================================================== */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  ).trim();

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ).trim();

  if (!supabaseUrl || !/^https?:\/\/.+/i.test(supabaseUrl)) {
    console.error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_URL absente ou invalide.'
    );

    return response;
  }

  if (!supabaseAnonKey) {
    console.error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_ANON_KEY manquante.'
    );

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  /* Rafraîchit la session et réécrit les cookies si nécessaire. */
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};