-- ============================================================
-- JDV CRM
-- Migration: Extend prospects table with full lead management
-- Timestamp: 20260910230000
--
-- Architecture actuelle :
-- organizations
-- organization_members
-- prospecteurs
-- prospects
--
-- IMPORTANT :
-- - Aucun enterprise_id
-- - Aucun type_prospect
-- - Aucun telephone
-- - Aucun get_my_enterprise_id()
-- - Aucune suppression de données
-- - Migration idempotente
-- ============================================================

BEGIN;


-- ============================================================
-- 1. CATÉGORIE COMMERCIALE DU PROSPECT
--
-- Le champ actuel "temperature" représente déjà :
-- hot / warm / cold
--
-- On ajoute "category" pour permettre de distinguer
-- la catégorie commerciale de la température du prospect.
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS category TEXT;


-- ============================================================
-- 2. DATE PRÉVISIONNELLE D'ACHAT
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS purchase_date_planned DATE;


-- ============================================================
-- 3. MONTANT POTENTIEL DU PROSPECT
--
-- Permet d'estimer la valeur commerciale du prospect.
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC(12,2);


-- ============================================================
-- 4. INDEX POUR LE SUIVI COMMERCIAL
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_prospects_organization_phone
ON public.prospects (organization_id, phone);

CREATE INDEX IF NOT EXISTS idx_prospects_organization_temperature
ON public.prospects (organization_id, temperature);

CREATE INDEX IF NOT EXISTS idx_prospects_organization_category
ON public.prospects (organization_id, category);

CREATE INDEX IF NOT EXISTS idx_prospects_next_follow_up
ON public.prospects (organization_id, next_follow_up_at);

CREATE INDEX IF NOT EXISTS idx_prospects_purchase_date
ON public.prospects (organization_id, purchase_date_planned);


-- ============================================================
-- 5. CONTRAINTE SUR LA TEMPÉRATURE
--
-- La colonne temperature existe déjà dans l'architecture
-- actuelle avec hot / warm / cold.
--
-- On ne la recrée pas.
-- ============================================================


-- ============================================================
-- 6. NORMALISATION DES VALEURS EXISTANTES
--
-- Si des données utilisent accidentellement les anciennes
-- appellations françaises, on les convertit vers le modèle
-- canonique anglais utilisé par la base.
-- ============================================================

UPDATE public.prospects
SET temperature = 'hot'
WHERE lower(temperature) IN ('chaud')
  AND temperature <> 'hot';

UPDATE public.prospects
SET temperature = 'warm'
WHERE lower(temperature) IN ('tiede', 'tiède')
  AND temperature <> 'warm';

UPDATE public.prospects
SET temperature = 'cold'
WHERE lower(temperature) IN ('froid')
  AND temperature <> 'cold';


-- ============================================================
-- 7. VALEUR PAR DÉFAUT POUR LES NOUVEAUX PROSPECTS
-- ============================================================

ALTER TABLE public.prospects
  ALTER COLUMN temperature SET DEFAULT 'cold';


-- ============================================================
-- 8. COMMENTAIRES DOCUMENTAIRES
-- ============================================================

COMMENT ON COLUMN public.prospects.category IS
'Catégorie commerciale personnalisée du prospect.';

COMMENT ON COLUMN public.prospects.purchase_date_planned IS
'Date prévisionnelle à laquelle le prospect prévoit d''acheter.';

COMMENT ON COLUMN public.prospects.estimated_amount IS
'Montant commercial potentiel estimé pour le prospect.';


-- ============================================================
-- 9. RLS — LECTURE DES PROSPECTS DE L'ORGANISATION
--
-- Les membres actifs d'une organisation peuvent consulter
-- les prospects de leur propre organisation.
--
-- Le contrôle repose sur organization_members.
-- Aucun enterprise_id.
-- ============================================================

DROP POLICY IF EXISTS "enterprise_members_read_all_prospects"
ON public.prospects;

DROP POLICY IF EXISTS "organization_members_read_all_prospects"
ON public.prospects;


CREATE POLICY "organization_members_read_all_prospects"
ON public.prospects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = prospects.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
  )
);


-- ============================================================
-- 10. PROTECTION CONTRE L'ACCÈS INTER-ORGANISATIONS
--
-- Un prospecteur ne peut voir que les prospects de son
-- organisation.
--
-- Le SUPER ADMIN peut également accéder aux données selon
-- les politiques globales déjà configurées.
-- ============================================================


-- ============================================================
-- 11. INDEX SUPPLÉMENTAIRE POUR LA RECHERCHE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_prospects_phone
ON public.prospects (phone)
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_first_name
ON public.prospects (first_name);

CREATE INDEX IF NOT EXISTS idx_prospects_last_name
ON public.prospects (last_name);


COMMIT;