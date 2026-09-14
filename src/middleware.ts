import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(
  request: NextRequest
) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  /*
   * ============================================================
   * VÉRIFICATION VARIABLES SUPABASE
   * ============================================================
   */
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[JDV CRM] Variables Supabase manquantes dans le middleware.',
      {
        hasUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(supabaseAnonKey),
      }
    );

    return response;
  }

  /*
   * ============================================================
   * CLIENT SUPABASE SERVEUR
   * ============================================================
   */
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }) => {
              request.cookies.set(
                name,
                value
              );

              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  /*
   * ============================================================
   * IMPORTANT :
   * getUser() permet à Supabase de rafraîchir/valider
   * la session côté serveur.
   * ============================================================
   */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log(
    '[JDV CRM] Middleware Auth:',
    {
      path: request.nextUrl.pathname,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      error: error?.message ?? null,
    }
  );

  /*
   * ============================================================
   * ROUTE SUPER ADMIN
   * ============================================================
   *
   * Le contrôle définitif des droits SUPER ADMIN
   * reste effectué par la page/login et le RPC.
   *
   * Le middleware ne doit pas interdire ici
   * un utilisateur simplement parce qu'il n'a
   * pas encore de session.
   */
  if (
    request.nextUrl.pathname.startsWith(
      '/hidden-concepteur-gate'
    )
  ) {
    return response;
  }

  return response;
}

/*
 * ============================================================
 * MATCHER
 * ============================================================
 *
 * On évite les fichiers statiques, images,
 * favicon, etc.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};