-- ============================================================
-- JDV CRM
-- Migration: Add platform SUPER ADMIN
-- Version compatible avec l'architecture actuelle
--
-- ARCHITECTURE :
-- auth.users
--      ↓
-- profiles
--      ↓
-- super_admins
--
-- IMPORTANT :
-- - Aucun INSERT dans auth.users
-- - Aucun public.users
-- - Aucun enterprise_id
-- - Aucun mot de passe en dur
-- - Aucune donnée supprimée
-- ============================================================

BEGIN;


-- ============================================================
-- 1. S'ASSURER QUE LE PROFIL EXISTE
--
-- Le compte doit déjà exister dans Supabase Authentication.
-- On récupère son UUID depuis auth.users.
-- ============================================================

INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    display_name,
    preferred_language,
    country,
    status
)
SELECT
    au.id,
    'Romaric',
    'Adededji',
    'Romaric Adededji',
    'fr',
    'Bénin',
    'active'
FROM auth.users au
WHERE lower(au.email) = lower('superadmin@jdv.com')
ON CONFLICT (id) DO UPDATE
SET
    first_name = COALESCE(public.profiles.first_name, 'Romaric'),
    last_name = COALESCE(public.profiles.last_name, 'Adededji'),
    display_name = 'Romaric Adededji',
    preferred_language = 'fr',
    country = 'Bénin',
    status = 'active',
    updated_at = now();


-- ============================================================
-- 2. AJOUTER LE COMPTE À SUPER_ADMINS
-- ============================================================

INSERT INTO public.super_admins (
    user_id,
    status,
    actif
)
SELECT
    au.id,
    'active',
    true
FROM auth.users au
WHERE lower(au.email) = lower('superadmin@jdv.com')
ON CONFLICT (user_id) DO UPDATE
SET
    status = 'active',
    actif = true,
    updated_at = now();


-- ============================================================
-- 3. METTRE À JOUR LES MÉTADONNÉES DU COMPTE AUTH
--
-- On ne touche PAS au mot de passe.
-- On ajoute uniquement les informations de rôle.
-- ============================================================

UPDATE auth.users
SET
    raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        ||
        jsonb_build_object(
            'first_name', 'Romaric',
            'last_name', 'Adededji',
            'display_name', 'Romaric Adededji',
            'role', 'super_admin'
        ),
    updated_at = now()
WHERE lower(email) = lower('superadmin@jdv.com');


-- ============================================================
-- 4. RAPPORT DE CONTRÔLE
-- ============================================================

DO $$
DECLARE
    v_user_id uuid;
    v_super_admin_exists boolean;
BEGIN

    SELECT id
    INTO v_user_id
    FROM auth.users
    WHERE lower(email) = lower('superadmin@jdv.com')
    LIMIT 1;

    IF v_user_id IS NULL THEN

        RAISE NOTICE
            'SUPER ADMIN NON CRÉÉ : le compte superadmin@jdv.com n''existe pas encore dans Supabase Authentication.';

    ELSE

        SELECT EXISTS (
            SELECT 1
            FROM public.super_admins
            WHERE user_id = v_user_id
              AND status = 'active'
              AND COALESCE(actif, true) = true
        )
        INTO v_super_admin_exists;

        IF v_super_admin_exists THEN

            RAISE NOTICE
                'SUPER ADMIN JDV CRM configuré avec succès pour superadmin@jdv.com.';

        ELSE

            RAISE NOTICE
                'Le compte existe mais n''a pas pu être activé comme SUPER ADMIN.';

        END IF;

    END IF;

END $$;


COMMIT;