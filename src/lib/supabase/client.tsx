'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function required(...names: string[]): string {
  for (const name of names) {
    const value = (process.env[name] ?? '').trim();
    if (value) return value;
  }
  throw new Error(`[JDV CRM] ${names.join(' ou ')} est manquante.`);
}

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const key = required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );

  if (!/^https?:\/\/[a-z0-9-]+\.supabase\.co(?:\/.*)?$/i.test(url)) {
    throw new Error('[JDV CRM] NEXT_PUBLIC_SUPABASE_URL est invalide.');
  }

  browserClient = createBrowserClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export const getSupabaseClient = createClient;
