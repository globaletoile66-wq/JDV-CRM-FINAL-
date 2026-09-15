import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always mutate cookies. Middleware handles refresh.
        }
      },
    },
  });
}

function required(...names: string[]): string {
  for (const name of names) {
    const value = (process.env[name] ?? '').trim();
    if (value) return value;
  }
  throw new Error(`[JDV CRM] ${names.join(' ou ')} est manquante.`);
}

/** Server-only client. Never import this from a Client Component. */
export function getAdminClient() {
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key = required('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
