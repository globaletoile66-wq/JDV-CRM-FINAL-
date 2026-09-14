-- ============================================================
-- JDV CRM
-- Migration : Super Admin + isolation des branches
-- Version adaptée à l'architecture actuelle
-- ============================================================

-- Architecture :
--
-- auth.users
--     ↓
-- profiles
--     ↓
-- organization_members
--     ↓
-- organizations
--
-- SUPER ADMIN :
-- super_admins
--
-- Aucun ancien :
-- users
-- enterprises
-- enterprise_id
-- contrats_vente
-- paiements_journaliers
-- ============================================================


-- ============================================================
-- 1. FONCTION SUPER ADMIN
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
    FROM public.super_admins AS sa
    WHERE sa.user_id = (SELECT auth.uid())
      AND sa.status = 'active'
      AND COALESCE(sa.actif, true) = true
  );
$$;


-- ============================================================
-- 2. ORGANISATION DE L'UTILISATEUR CONNECTÉ
-- ============================================================

CREATE OR REPLACE FUNCTION private.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT om.organization_id
  FROM public.organization_members AS om
  WHERE om.user_id = (SELECT auth.uid())
    AND om.status = 'active'
  ORDER BY om.joined_at ASC
  LIMIT 1;
$$;


-- ============================================================
-- 3. RÔLE DE L'UTILISATEUR CONNECTÉ
-- ============================================================

CREATE OR REPLACE FUNCTION private.get_my_organization_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT om.role
  FROM public.organization_members AS om
  WHERE om.user_id = (SELECT auth.uid())
    AND om.status = 'active'
  ORDER BY om.joined_at ASC
  LIMIT 1;
$$;


-- ============================================================
-- 4. TEST MEMBRE D'UNE ORGANISATION
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_organization_member(
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = (SELECT auth.uid())
      AND om.status = 'active'
  );
$$;


-- ============================================================
-- 5. TEST ADMINISTRATEUR ENTREPRISE
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_business_admin(
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'business_admin'
      AND om.status = 'active'
  );
$$;


-- ============================================================
-- 6. TEST PROSPECTEUR
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_prospecteur(
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = (SELECT auth.uid())
      AND om.role = 'prospecteur'
      AND om.status = 'active'
  );
$$;


-- ============================================================
-- 7. DROITS SUR LES FONCTIONS DE SÉCURITÉ
-- ============================================================

REVOKE ALL ON FUNCTION private.is_super_admin()
FROM PUBLIC;

REVOKE ALL ON FUNCTION private.get_my_organization_id()
FROM PUBLIC;

REVOKE ALL ON FUNCTION private.get_my_organization_role()
FROM PUBLIC;

REVOKE ALL ON FUNCTION private.is_organization_member(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION private.is_business_admin(uuid)
FROM PUBLIC;

REVOKE ALL ON FUNCTION private.is_prospecteur(uuid)
FROM PUBLIC;


GRANT EXECUTE ON FUNCTION private.is_super_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION private.get_my_organization_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION private.get_my_organization_role()
TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_organization_member(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_business_admin(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_prospecteur(uuid)
TO authenticated;


-- ============================================================
-- 8. RLS ORGANIZATIONS
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_super_admin_read_all"
ON public.organizations;

CREATE POLICY "organizations_super_admin_read_all"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  private.is_super_admin()
  OR private.is_organization_member(id)
);


DROP POLICY IF EXISTS "organizations_super_admin_update_all"
ON public.organizations;

CREATE POLICY "organizations_super_admin_update_all"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  private.is_super_admin()
  OR private.is_business_admin(id)
)
WITH CHECK (
  private.is_super_admin()
  OR private.is_business_admin(id)
);


-- ============================================================
-- 9. RLS ORGANIZATION MEMBERS
-- ============================================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_members_super_admin_read_all"
ON public.organization_members;

CREATE POLICY "organization_members_super_admin_read_all"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  private.is_super_admin()
  OR user_id = (SELECT auth.uid())
  OR private.is_business_admin(organization_id)
);


DROP POLICY IF EXISTS "organization_members_super_admin_manage"
ON public.organization_members;

CREATE POLICY "organization_members_super_admin_manage"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  private.is_super_admin()
  OR private.is_business_admin(organization_id)
)
WITH CHECK (
  private.is_super_admin()
  OR private.is_business_admin(organization_id)
);


-- ============================================================
-- 10. RLS SUPER ADMINS
-- ============================================================

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_read_own"
ON public.super_admins;

CREATE POLICY "super_admins_read_own"
ON public.super_admins
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);


-- ============================================================
-- 11. INDEX SUPER ADMIN
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_super_admins_user_status
ON public.super_admins(user_id, status);


-- ============================================================
-- 12. VÉRIFICATION DU SUPER ADMIN
-- ============================================================

SELECT
  sa.id,
  sa.user_id,
  sa.status,
  sa.actif,
  au.email
FROM public.super_admins AS sa
LEFT JOIN auth.users AS au
  ON au.id = sa.user_id
WHERE sa.status = 'active'
  AND COALESCE(sa.actif, true) = true;