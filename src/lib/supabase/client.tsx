'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/* ============================================================================
 * JDV CRM — CLIENT SUPABASE NAVIGATEUR
 *
 * IMPORTANT : ce client est un SINGLETON.
 *
 * Créer plusieurs instances dans le même onglet provoque plusieurs clients
 * d'authentification concurrents qui se disputent le même stockage de session.
 * C'est une cause classique de sessions instables et de vérifications qui
 * échouent juste après la connexion.
 *
 * Le stockage se fait par COOKIES (createBrowserClient), ce qui permet au
 * middleware Next.js de lire la même session côté serveur.
 * ========================================================================== */

let browserClient: SupabaseClient | null = null;

function readEnv(name: string): string {
  const value = (process.env[name] || '').trim();

  if (!value) {
    throw new Error(
      `${name} est manquante dans les variables d'environnement.`
    );
  }

  return value;
}

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!/^https?:\/\/.+/i.test(supabaseUrl)) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL invalide : ${supabaseUrl}`
    );
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

  return browserClient;
}

/* Alias pratique pour les modules qui veulent juste le client. */
export function getSupabaseClient(): SupabaseClient {
  return createClient();
}