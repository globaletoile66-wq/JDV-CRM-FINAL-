'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')?.trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')?.trim();
  const publishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')?.trim();

  // Prefer anon key, fall back to publishable key
  const supabaseKey = anonKey || publishableKey;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est manquante dans les variables d'environnement.",
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY est manquante dans les variables d'environnement.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}