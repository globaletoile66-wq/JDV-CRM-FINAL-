'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ?.trim();

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL est manquante."
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY est manquante."
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey
  );
}