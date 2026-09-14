-- ============================================================
-- JDV CRM
-- Migration: Fix super_admins RLS SELECT policy
--
-- PROBLÈME :
-- La table super_admins a RLS activé mais aucune politique
-- SELECT n'autorise un utilisateur authentifié à lire sa
-- propre ligne. Résultat : la requête retourne NULL même si
-- la ligne existe, déclenchant l'erreur "Accès refusé".
--
-- SOLUTION :
-- Ajouter une politique SELECT permettant à chaque
-- utilisateur authentifié de lire uniquement sa propre ligne.
-- Utilise auth.uid() directement → aucune récursion possible.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SUPPRIMER LES ANCIENNES POLITIQUES SELECT sur
--    super_admins pour éviter les conflits
-- ============================================================

DROP POLICY IF EXISTS "super_admins_select_own"              ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_select_self"             ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_read_own"                ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_select"                  ON public.super_admins;
DROP POLICY IF EXISTS "super_admins_select_all_for_admins"   ON public.super_admins;
DROP POLICY IF EXISTS "Allow super admins to read own record" ON public.super_admins;
DROP POLICY IF EXISTS "Super admins can view their own record" ON public.super_admins;


-- ============================================================
-- 2. POLITIQUE SELECT : chaque utilisateur authentifié peut
--    lire uniquement sa propre ligne dans super_admins.
--    Utilise auth.uid() directement → aucune récursion.
-- ============================================================

CREATE POLICY "super_admins_select_own"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- 3. FONCTION SECURITY DEFINER : is_super_admin()
--    Permet aux autres tables de vérifier si l'utilisateur
--    courant est super admin sans passer par RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = (SELECT auth.uid())
      AND status = 'active'
      AND COALESCE(actif, true) = true
  );
$$;


-- ============================================================
-- 4. VÉRIFICATION
-- ============================================================

DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'super_admins'
    AND cmd = 'SELECT';

  RAISE NOTICE 'super_admins SELECT policies actives : %', v_policy_count;
END $$;

COMMIT;
