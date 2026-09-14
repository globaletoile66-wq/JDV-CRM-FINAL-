import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  // IMPORTANT :
  // On récupère l'URL Supabase et on la nettoie.
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  ).trim();

  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  ).trim();

  console.log('[JDV CRM] Middleware variables:', {
    url: supabaseUrl,
    hasAnonKey: Boolean(supabaseAnonKey),
  });

  // Vérification stricte de l'URL
  if (
    !supabaseUrl ||
    !/^https?:\/\/.+/i.test(supabaseUrl)
  ) {
    console.error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_URL invalide:',
      supabaseUrl
    );

    return response;
  }

  if (!supabaseAnonKey) {
    console.error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_ANON_KEY manquante.'
    );

    return response;
  }

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
            ({ name, value, options }) => {
              request.cookies.set(name, value);

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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log('[JDV CRM] Middleware Auth:', {
    path: request.nextUrl.pathname,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: error?.message ?? null,
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};