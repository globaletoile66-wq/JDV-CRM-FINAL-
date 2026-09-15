'use client';

import { createClient } from '@/lib/supabase/client';

/* ============================================================================
 * JDV CRM — VÉRIFICATION SUPER ADMIN (SOURCE UNIQUE DE VÉRITÉ)
 *
 * Toutes les pages et services qui ont besoin de savoir si l'utilisateur
 * courant est SUPER ADMIN doivent passer par ce module, et uniquement par lui.
 *
 * Avant, la page de connexion et le service dashboard utilisaient deux
 * méthodes différentes (RPC d'un côté, lecture de table de l'autre), avec des
 * critères légèrement différents. Résultat : le login validait l'accès, le
 * dashboard le refusait, et l'utilisateur rebondissait en boucle entre les
 * deux pages.
 *
 * Méthode retenue : lecture directe de la table super_admins.
 * La politique RLS `user_id = auth.uid()` autorise chaque SUPER ADMIN à lire
 * sa propre ligne, et rien d'autre.
 * ========================================================================== */

export const AUTHORIZED_CONCEPTEURS = [
  {
    email: 'romarica15@gmail.com',
    userId: '57e90659-4ace-4824-aa4f-de84317622e8',
  },
  {
    email: 'ets.miracle.jdv@gmail.com',
    userId: '2e2b8bd7-d736-4e75-ab21-9e6e7b5cb1a1',
  },
] as const;

export const SUPER_ADMIN_LOGIN_ROUTE =
  '/hidden-concepteur-gate/login';

export const SUPER_ADMIN_DASHBOARD_ROUTE =
  '/hidden-concepteur-gate/dashboard';

export type SuperAdminCheck =
  | {
      ok: true;
      userId: string;
      email: string | null;
    }
  | {
      ok: false;
      reason:
        | 'no-session'
        | 'not-listed'
        | 'read-error'
        | 'no-row'
        | 'inactive';
      message: string;
    };

export function findAuthorizedByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  return AUTHORIZED_CONCEPTEURS.find(
    (account) => account.email.toLowerCase() === normalized
  );
}

export function isAuthorizedUserId(userId: string): boolean {
  return AUTHORIZED_CONCEPTEURS.some(
    (account) => account.userId === userId
  );
}

/* ----------------------------------------------------------------------------
 * Vérification complète de l'utilisateur actuellement connecté.
 *
 * Ne lève jamais d'exception : renvoie toujours un objet décrivant le résultat.
 * Les pages peuvent ainsi décider quoi afficher sans try/catch partout.
 * -------------------------------------------------------------------------- */

export async function checkCurrentSuperAdmin(): Promise<SuperAdminCheck> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      reason: 'no-session',
      message: "Aucune session active.",
    };
  }

  if (!isAuthorizedUserId(user.id)) {
    return {
      ok: false,
      reason: 'not-listed',
      message:
        "Ce compte ne figure pas dans la liste des concepteurs autorisés.",
    };
  }

  const { data: row, error: readError } = await supabase
    .from('super_admins')
    .select('user_id, status, actif')
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError) {
    return {
      ok: false,
      reason: 'read-error',
      message: `Lecture du compte SUPER ADMIN impossible : ${readError.message}`,
    };
  }

  if (!row) {
    return {
      ok: false,
      reason: 'no-row',
      message:
        "Aucune entrée SUPER ADMIN n'est associée à ce compte.",
    };
  }

  const status = String(row.status ?? '').trim().toLowerCase();
  const actif = row.actif !== false;

  if (status !== 'active' || !actif) {
    return {
      ok: false,
      reason: 'inactive',
      message: `Compte SUPER ADMIN inactif (status=${status || 'null'}, actif=${String(row.actif)}).`,
    };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email ?? null,
  };
}

/* ----------------------------------------------------------------------------
 * Variante qui lève une exception — pratique pour les services de données du
 * dashboard, qui veulent interrompre net une requête non autorisée.
 * -------------------------------------------------------------------------- */

export async function ensureSuperAdmin(): Promise<{
  userId: string;
  email: string | null;
}> {
  const result = await checkCurrentSuperAdmin();

  if (!result.ok) {
    throw new Error(result.message);
  }

  return {
    userId: result.userId,
    email: result.email,
  };
}