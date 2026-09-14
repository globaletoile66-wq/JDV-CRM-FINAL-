-- ============================================================
-- JDV CRM
-- RLS + Security Helpers
-- Architecture actuelle :
--
-- auth.users
--      ↓
-- profiles
--      ↓
-- organization_members
--      ↓
-- organizations
--
-- SUPER ADMIN :
-- super_admins
--
-- IMPORTANT :
-- - Aucun DROP TABLE
-- - Aucun TRUNCATE
-- - Aucun ancien modèle users/enterprises
-- - Aucun faux compte Auth
-- ============================================================


-- ============================================================
-- 1. SCHÉMA PRIVÉ POUR LES FONCTIONS DE SÉCURITÉ
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;


-- ============================================================
-- 2. FONCTION : ORGANISATION DE L'UTILISATEUR
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
-- 3. FONCTION : RÔLE DE L'UTILISATEUR
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
-- 4. FONCTION : UTILISATEUR MEMBRE D'UNE ORGANISATION
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
-- 5. FONCTION : ADMINISTRATEUR DE L'ORGANISATION
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
-- 6. FONCTION : PROSPECTEUR DE L'ORGANISATION
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
-- 7. FONCTION SUPER ADMIN
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
-- 8. PROTECTION DES FONCTIONS PRIVÉES
-- ============================================================

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_my_organization_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.get_my_organization_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_organization_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_business_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_prospecteur(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_super_admin() FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE ON FUNCTION private.get_my_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_my_organization_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_organization_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_business_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_prospecteur(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;


-- ============================================================
-- 9. RLS : PROFILES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = (SELECT auth.uid())
)
WITH CHECK (
  id = (SELECT auth.uid())
);


-- ============================================================
-- 10. RLS : ORGANIZATIONS
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON public.organizations;
CREATE POLICY "organizations_select_member"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
CREATE POLICY "organizations_update_admin"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(id)
  OR private.is_super_admin()
);


-- ============================================================
-- 11. RLS : ORGANIZATION MEMBERS
-- ============================================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_members_select" ON public.organization_members;
CREATE POLICY "organization_members_select"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organization_members_insert_admin" ON public.organization_members;
CREATE POLICY "organization_members_insert_admin"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organization_members_update_admin" ON public.organization_members;
CREATE POLICY "organization_members_update_admin"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organization_members_delete_admin" ON public.organization_members;
CREATE POLICY "organization_members_delete_admin"
ON public.organization_members
FOR DELETE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 12. RLS : ARTICLES
-- ============================================================

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_select_members" ON public.articles;
CREATE POLICY "articles_select_members"
ON public.articles
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "articles_insert_admin" ON public.articles;
CREATE POLICY "articles_insert_admin"
ON public.articles
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "articles_update_admin" ON public.articles;
CREATE POLICY "articles_update_admin"
ON public.articles
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "articles_delete_admin" ON public.articles;
CREATE POLICY "articles_delete_admin"
ON public.articles
FOR DELETE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 13. RLS : PROSPECTS
-- ============================================================

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospects_select_members" ON public.prospects;
CREATE POLICY "prospects_select_members"
ON public.prospects
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "prospects_insert_members" ON public.prospects;
CREATE POLICY "prospects_insert_members"
ON public.prospects
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_organization_member(organization_id)
  AND (
    created_by_user_id = (SELECT auth.uid())
    OR private.is_business_admin(organization_id)
  )
);

DROP POLICY IF EXISTS "prospects_update_members" ON public.prospects;
CREATE POLICY "prospects_update_members"
ON public.prospects
FOR UPDATE
TO authenticated
USING (
  private.is_organization_member(organization_id)
  AND (
    created_by_user_id = (SELECT auth.uid())
    OR private.is_business_admin(organization_id)
    OR private.is_super_admin()
  )
)
WITH CHECK (
  private.is_organization_member(organization_id)
  AND (
    created_by_user_id = (SELECT auth.uid())
    OR private.is_business_admin(organization_id)
    OR private.is_super_admin()
  )
);


-- ============================================================
-- 14. RLS : SALES
-- ============================================================

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select_members" ON public.sales;
CREATE POLICY "sales_select_members"
ON public.sales
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "sales_insert_members" ON public.sales;
CREATE POLICY "sales_insert_members"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_organization_member(organization_id)
  AND (
    created_by = (SELECT auth.uid())
    OR private.is_business_admin(organization_id)
  )
);

DROP POLICY IF EXISTS "sales_update_admin" ON public.sales;
CREATE POLICY "sales_update_admin"
ON public.sales
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 15. RLS : PAYMENTS
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_members" ON public.payments;
CREATE POLICY "payments_select_members"
ON public.payments
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "payments_insert_members" ON public.payments;
CREATE POLICY "payments_insert_members"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "payments_update_admin" ON public.payments;
CREATE POLICY "payments_update_admin"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 16. RLS : PAYMENT SCHEDULES
-- ============================================================

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_schedules_select_members"
ON public.payment_schedules;

CREATE POLICY "payment_schedules_select_members"
ON public.payment_schedules
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "payment_schedules_manage_admin"
ON public.payment_schedules;

CREATE POLICY "payment_schedules_manage_admin"
ON public.payment_schedules
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 17. RLS : DAILY TOKENS
-- ============================================================

ALTER TABLE public.daily_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_tokens_select_members"
ON public.daily_tokens;

CREATE POLICY "daily_tokens_select_members"
ON public.daily_tokens
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "daily_tokens_insert_members"
ON public.daily_tokens;

CREATE POLICY "daily_tokens_insert_members"
ON public.daily_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "daily_tokens_update_admin"
ON public.daily_tokens;

CREATE POLICY "daily_tokens_update_admin"
ON public.daily_tokens
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 18. RLS : COMMISSIONS
-- ============================================================

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_select_members"
ON public.commissions;

CREATE POLICY "commissions_select_members"
ON public.commissions
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "commissions_manage_admin"
ON public.commissions;

CREATE POLICY "commissions_manage_admin"
ON public.commissions
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 19. RLS : STOCKS
-- ============================================================

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stocks_select_members" ON public.stocks;

CREATE POLICY "stocks_select_members"
ON public.stocks
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "stocks_manage_admin" ON public.stocks;

CREATE POLICY "stocks_manage_admin"
ON public.stocks
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 20. RLS : STOCK MOVEMENTS
-- ============================================================

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select_members"
ON public.stock_movements;

CREATE POLICY "stock_movements_select_members"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "stock_movements_manage_admin"
ON public.stock_movements;

CREATE POLICY "stock_movements_manage_admin"
ON public.stock_movements
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 21. RLS : PROSPECTEUR STOCKS
-- ============================================================

ALTER TABLE public.prospecteur_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prospecteur_stocks_select_members"
ON public.prospecteur_stocks;

CREATE POLICY "prospecteur_stocks_select_members"
ON public.prospecteur_stocks
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "prospecteur_stocks_manage"
ON public.prospecteur_stocks;

CREATE POLICY "prospecteur_stocks_manage"
ON public.prospecteur_stocks
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
  OR private.is_prospecteur(organization_id)
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
  OR private.is_prospecteur(organization_id)
);


-- ============================================================
-- 22. RLS : FIELD VISITS
-- ============================================================

ALTER TABLE public.field_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_visits_select_members"
ON public.field_visits;

CREATE POLICY "field_visits_select_members"
ON public.field_visits
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "field_visits_insert_members"
ON public.field_visits;

CREATE POLICY "field_visits_insert_members"
ON public.field_visits
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "field_visits_update_admin"
ON public.field_visits;

CREATE POLICY "field_visits_update_admin"
ON public.field_visits
FOR UPDATE
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 23. RLS : NOTIFICATIONS
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own"
ON public.notifications;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "notifications_update_own"
ON public.notifications;

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);


-- ============================================================
-- 24. RLS : ORGANIZATION SETTINGS
-- ============================================================

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_settings_select_members"
ON public.organization_settings;

CREATE POLICY "organization_settings_select_members"
ON public.organization_settings
FOR SELECT
TO authenticated
USING (
  private.is_organization_member(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organization_settings_manage_admin"
ON public.organization_settings;

CREATE POLICY "organization_settings_manage_admin"
ON public.organization_settings
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 25. RLS : ORGANIZATION SUBSCRIPTIONS
-- ============================================================

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_subscriptions_select"
ON public.organization_subscriptions;

CREATE POLICY "organization_subscriptions_select"
ON public.organization_subscriptions
FOR SELECT
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "organization_subscriptions_manage_admin"
ON public.organization_subscriptions;

CREATE POLICY "organization_subscriptions_manage_admin"
ON public.organization_subscriptions
FOR ALL
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
)
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 26. RLS : SUBSCRIPTION PAYMENTS
-- ============================================================

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_payments_select"
ON public.subscription_payments;

CREATE POLICY "subscription_payments_select"
ON public.subscription_payments
FOR SELECT
TO authenticated
USING (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);

DROP POLICY IF EXISTS "subscription_payments_insert"
ON public.subscription_payments;

CREATE POLICY "subscription_payments_insert"
ON public.subscription_payments
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_business_admin(organization_id)
  OR private.is_super_admin()
);


-- ============================================================
-- 27. RLS : SUPER ADMINS
-- ============================================================

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admins_select_self"
ON public.super_admins;

CREATE POLICY "super_admins_select_self"
ON public.super_admins
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "super_admins_update_self"
ON public.super_admins;

CREATE POLICY "super_admins_update_self"
ON public.super_admins
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  user_id = (SELECT auth.uid())
);


-- ============================================================
-- 28. INDEXES RLS / PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_organization_members_user_org
ON public.organization_members(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_status
ON public.organization_members(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_role
ON public.organization_members(organization_id, role);

CREATE INDEX IF NOT EXISTS idx_prospects_org
ON public.prospects(organization_id);

CREATE INDEX IF NOT EXISTS idx_prospects_created_by
ON public.prospects(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_sales_org
ON public.sales(organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_org
ON public.payments(organization_id);

CREATE INDEX IF NOT EXISTS idx_daily_tokens_org
ON public.daily_tokens(organization_id);

CREATE INDEX IF NOT EXISTS idx_commissions_org
ON public.commissions(organization_id);

CREATE INDEX IF NOT EXISTS idx_stocks_org
ON public.stocks(organization_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_org
ON public.stock_movements(organization_id);

CREATE INDEX IF NOT EXISTS idx_field_visits_org
ON public.field_visits(organization_id);

CREATE INDEX IF NOT EXISTS idx_super_admins_user
ON public.super_admins(user_id);


-- ============================================================
-- 29. VÉRIFICATION
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'organizations',
    'organization_members',
    'organization_settings',
    'organization_subscriptions',
    'subscription_payments',
    'articles',
    'prospects',
    'sales',
    'payments',
    'payment_schedules',
    'daily_tokens',
    'commissions',
    'stocks',
    'stock_movements',
    'prospecteur_stocks',
    'field_visits',
    'notifications',
    'super_admins'
  )
ORDER BY tablename;