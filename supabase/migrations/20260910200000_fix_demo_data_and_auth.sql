-- Migration: Seed demo data for current JDV CRM architecture
-- Timestamp: 20260910200000
--
-- IMPORTANT:
-- - Uses organizations/profiles/organization_members/prospecteurs
-- - Does NOT create fake auth.users
-- - Does NOT use old enterprises/users tables
-- - Does NOT delete existing data
-- - Safe to execute multiple times
--
-- Demo Auth accounts must be created through Supabase Auth.
-- Their UUIDs are discovered by email and then linked to the
-- application tables below.

BEGIN;

-- ============================================================
-- 1. ENSURE DEMO ORGANIZATION EXISTS
-- ============================================================

INSERT INTO public.organizations (
  name,
  legal_name,
  email,
  phone,
  country,
  currency,
  timezone,
  language,
  city,
  status,
  subscription_status
)
SELECT
  'Meridian Distribution SA',
  'Meridian Distribution SA',
  'admin@meridian.com',
  '+22900000000',
  'Bénin',
  'XOF',
  'Africa/Porto-Novo',
  'fr',
  'Cotonou',
  'active',
  'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organizations
  WHERE name = 'Meridian Distribution SA'
);


-- ============================================================
-- 2. GET DEMO ORGANIZATION
-- ============================================================

DO $$
DECLARE
  v_org_id uuid;
BEGIN

  SELECT id
  INTO v_org_id
  FROM public.organizations
  WHERE name = 'Meridian Distribution SA'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION
      'Impossible de trouver l’organisation Meridian Distribution SA';
  END IF;

  -- ==========================================================
  -- 3. DEMO SUBSCRIPTION
  -- ==========================================================

  INSERT INTO public.organization_subscriptions (
    organization_id,
    plan_id,
    status,
    started_at,
    expires_at,
    auto_renew
  )
  SELECT
    v_org_id,
    sp.id,
    'active',
    now(),
    now() + interval '30 days',
    false
  FROM public.subscription_plans sp
  WHERE sp.code = 'MONTHLY'
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_subscriptions os
      WHERE os.organization_id = v_org_id
        AND os.status = 'active'
    )
  LIMIT 1;


  -- ==========================================================
  -- 4. ORGANIZATION SETTINGS
  -- ==========================================================

  INSERT INTO public.organization_settings (
    organization_id,
    settings
  )
  VALUES (
    v_org_id,
    jsonb_build_object(
      'demo', true,
      'currency', 'XOF',
      'language', 'fr',
      'timezone', 'Africa/Porto-Novo',
      'sales_mode', 'credit_and_cash',
      'daily_tokens_enabled', true
    )
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    settings = public.organization_settings.settings
      || EXCLUDED.settings,
    updated_at = now();


  -- ==========================================================
  -- 5. LINK ADMIN AUTH USER IF IT EXISTS
  -- ==========================================================

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  SELECT
    v_org_id,
    au.id,
    'business_admin',
    'active'
  FROM auth.users au
  WHERE lower(au.email) = lower('admin@meridian.com')
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = v_org_id
        AND om.user_id = au.id
    )
  LIMIT 1;


  -- ==========================================================
  -- 6. LINK ADMIN AS ORGANIZATION OWNER
  -- ==========================================================

  UPDATE public.organizations o
  SET
    owner_user_id = au.id,
    updated_at = now()
  FROM auth.users au
  WHERE o.id = v_org_id
    AND lower(au.email) = lower('admin@meridian.com')
    AND (
      o.owner_user_id IS NULL
      OR o.owner_user_id <> au.id
    );


  -- ==========================================================
  -- 7. DEMO PROSPECTEURS
  -- ==========================================================

  INSERT INTO public.prospecteurs (
    organization_id,
    user_id,
    code,
    first_name,
    last_name,
    phone,
    email,
    city,
    country,
    status,
    commission_rate,
    hired_at
  )
  SELECT
    v_org_id,
    au.id,
    'JDV-GH-0041',
    'Kwame',
    'Asante',
    '+233000000001',
    'kwame@meridian.com',
    'Accra',
    'Ghana',
    'active',
    5,
    CURRENT_DATE
  FROM auth.users au
  WHERE lower(au.email) = lower('kwame@meridian.com')
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospecteurs p
      WHERE p.code = 'JDV-GH-0041'
    )
  LIMIT 1;


  INSERT INTO public.prospecteurs (
    organization_id,
    user_id,
    code,
    first_name,
    last_name,
    phone,
    email,
    city,
    country,
    status,
    commission_rate,
    hired_at
  )
  SELECT
    v_org_id,
    au.id,
    'JDV-GH-0042',
    'Ama',
    'Owusu',
    '+233000000002',
    'ama@meridian.com',
    'Kumasi',
    'Ghana',
    'active',
    5,
    CURRENT_DATE
  FROM auth.users au
  WHERE lower(au.email) = lower('ama@meridian.com')
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospecteurs p
      WHERE p.code = 'JDV-GH-0042'
    )
  LIMIT 1;


  INSERT INTO public.prospecteurs (
    organization_id,
    user_id,
    code,
    first_name,
    last_name,
    phone,
    email,
    city,
    country,
    status,
    commission_rate,
    hired_at
  )
  SELECT
    v_org_id,
    au.id,
    'JDV-GH-0043',
    'Kofi',
    'Mensah',
    '+233000000003',
    'kofi@meridian.com',
    'Tema',
    'Ghana',
    'active',
    5,
    CURRENT_DATE
  FROM auth.users au
  WHERE lower(au.email) = lower('kofi@meridian.com')
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospecteurs p
      WHERE p.code = 'JDV-GH-0043'
    )
  LIMIT 1;


  -- ==========================================================
  -- 8. DEMO ARTICLES
  -- ==========================================================

  INSERT INTO public.articles (
    organization_id,
    code,
    name,
    description,
    category,
    unit,
    fixed_price,
    cash_price,
    credit_price,
    minimum_deposit,
    default_payment_amount,
    active
  )
  SELECT
    v_org_id,
    'ART-ALPHA',
    'Promo Pack Alpha',
    'Pack promotionnel Alpha',
    'Pack',
    'unité',
    210000,
    210000,
    210000,
    42000,
    7000,
    true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.articles
    WHERE organization_id = v_org_id
      AND code = 'ART-ALPHA'
  );


  INSERT INTO public.articles (
    organization_id,
    code,
    name,
    description,
    category,
    unit,
    fixed_price,
    cash_price,
    credit_price,
    minimum_deposit,
    default_payment_amount,
    active
  )
  SELECT
    v_org_id,
    'ART-BETA',
    'Promo Pack Beta',
    'Pack promotionnel Beta',
    'Pack',
    'unité',
    190000,
    190000,
    190000,
    38000,
    6500,
    true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.articles
    WHERE organization_id = v_org_id
      AND code = 'ART-BETA'
  );


  INSERT INTO public.articles (
    organization_id,
    code,
    name,
    description,
    category,
    unit,
    fixed_price,
    cash_price,
    credit_price,
    minimum_deposit,
    default_payment_amount,
    active
  )
  SELECT
    v_org_id,
    'ART-GOLD',
    'Gold Token Bundle',
    'Pack Gold avec paiement journalier',
    'Token',
    'unité',
    350000,
    350000,
    350000,
    70000,
    10000,
    true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.articles
    WHERE organization_id = v_org_id
      AND code = 'ART-GOLD'
  );


  INSERT INTO public.articles (
    organization_id,
    code,
    name,
    description,
    category,
    unit,
    fixed_price,
    cash_price,
    credit_price,
    minimum_deposit,
    default_payment_amount,
    active
  )
  SELECT
    v_org_id,
    'ART-START',
    'Starter Kit',
    'Kit de démarrage',
    'Kit',
    'unité',
    125000,
    125000,
    125000,
    25000,
    5000,
    true
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.articles
    WHERE organization_id = v_org_id
      AND code = 'ART-START'
  );


  -- ==========================================================
  -- 9. INITIAL STOCK
  -- ==========================================================

  INSERT INTO public.stocks (
    organization_id,
    article_id,
    quantity,
    reserved_quantity,
    minimum_quantity
  )
  SELECT
    v_org_id,
    a.id,
    CASE a.code
      WHEN 'ART-ALPHA' THEN 320
      WHEN 'ART-BETA' THEN 85
      WHEN 'ART-GOLD' THEN 450
      WHEN 'ART-START' THEN 12
      ELSE 0
    END,
    0,
    5
  FROM public.articles a
  WHERE a.organization_id = v_org_id
    AND a.code IN (
      'ART-ALPHA',
      'ART-BETA',
      'ART-GOLD',
      'ART-START'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.stocks s
      WHERE s.organization_id = v_org_id
        AND s.article_id = a.id
    );


  -- ==========================================================
  -- 10. DEMO CLIENTS
  -- ==========================================================

  INSERT INTO public.clients (
    organization_id,
    prospecteur_id,
    code,
    first_name,
    last_name,
    phone,
    address,
    city,
    country,
    status,
    temperature,
    notes
  )
  SELECT
    v_org_id,
    p.id,
    'CLI-DEMO-001',
    'Kokou',
    'Agbodjan',
    '+22997112233',
    'Quartier Centre',
    'Cotonou',
    'Bénin',
    'prospect',
    'hot',
    'Client démonstration JDV CRM'
  FROM public.prospecteurs p
  WHERE p.organization_id = v_org_id
    AND p.code = 'JDV-GH-0041'
    AND NOT EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.code = 'CLI-DEMO-001'
    )
  LIMIT 1;


  INSERT INTO public.clients (
    organization_id,
    prospecteur_id,
    code,
    first_name,
    last_name,
    phone,
    address,
    city,
    country,
    status,
    temperature,
    notes
  )
  SELECT
    v_org_id,
    p.id,
    'CLI-DEMO-002',
    'Adjoua',
    'Mensah',
    '+22961445566',
    'Quartier Akpakpa',
    'Cotonou',
    'Bénin',
    'prospect',
    'warm',
    'Client démonstration JDV CRM'
  FROM public.prospecteurs p
  WHERE p.organization_id = v_org_id
    AND p.code = 'JDV-GH-0041'
    AND NOT EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.code = 'CLI-DEMO-002'
    )
  LIMIT 1;


  INSERT INTO public.clients (
    organization_id,
    prospecteur_id,
    code,
    first_name,
    last_name,
    phone,
    address,
    city,
    country,
    status,
    temperature,
    notes
  )
  SELECT
    v_org_id,
    p.id,
    'CLI-DEMO-003',
    'Brice',
    'Hounsou',
    '+22990778899',
    'Quartier Godomey',
    'Abomey-Calavi',
    'Bénin',
    'prospect',
    'cold',
    'Client démonstration JDV CRM'
  FROM public.prospecteurs p
  WHERE p.organization_id = v_org_id
    AND p.code = 'JDV-GH-0042'
    AND NOT EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.code = 'CLI-DEMO-003'
    )
  LIMIT 1;


  -- ==========================================================
  -- 11. DEMO PROSPECTS
  -- ==========================================================

  INSERT INTO public.prospects (
    organization_id,
    prospecteur_id,
    client_id,
    first_name,
    last_name,
    phone,
    address,
    city,
    desired_article,
    desired_article_id,
    temperature,
    visit_count,
    last_contact_at,
    next_follow_up_at,
    status,
    notes
  )
  SELECT
    v_org_id,
    c.prospecteur_id,
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.city,
    a.name,
    a.id,
    c.temperature,
    3,
    now() - interval '2 days',
    now() + interval '5 days',
    'interested',
    'Prospect de démonstration'
  FROM public.clients c
  JOIN public.articles a
    ON a.organization_id = v_org_id
   AND a.code = 'ART-ALPHA'
  WHERE c.code = 'CLI-DEMO-001'
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospects p
      WHERE p.client_id = c.id
    );


  INSERT INTO public.prospects (
    organization_id,
    prospecteur_id,
    client_id,
    first_name,
    last_name,
    phone,
    address,
    city,
    desired_article,
    desired_article_id,
    temperature,
    visit_count,
    last_contact_at,
    next_follow_up_at,
    status,
    notes
  )
  SELECT
    v_org_id,
    c.prospecteur_id,
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.city,
    a.name,
    a.id,
    c.temperature,
    2,
    now() - interval '5 days',
    now() + interval '10 days',
    'contacted',
    'Prospect de démonstration'
  FROM public.clients c
  JOIN public.articles a
    ON a.organization_id = v_org_id
   AND a.code = 'ART-GOLD'
  WHERE c.code = 'CLI-DEMO-002'
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospects p
      WHERE p.client_id = c.id
    );


  INSERT INTO public.prospects (
    organization_id,
    prospecteur_id,
    client_id,
    first_name,
    last_name,
    phone,
    address,
    city,
    desired_article,
    desired_article_id,
    temperature,
    visit_count,
    last_contact_at,
    next_follow_up_at,
    status,
    notes
  )
  SELECT
    v_org_id,
    c.prospecteur_id,
    c.id,
    c.first_name,
    c.last_name,
    c.phone,
    c.address,
    c.city,
    a.name,
    a.id,
    c.temperature,
    1,
    now() - interval '1 day',
    NULL,
    'new',
    'Prospect de démonstration'
  FROM public.clients c
  JOIN public.articles a
    ON a.organization_id = v_org_id
   AND a.code = 'ART-ALPHA'
  WHERE c.code = 'CLI-DEMO-003'
    AND NOT EXISTS (
      SELECT 1
      FROM public.prospects p
      WHERE p.client_id = c.id
    );


  -- ==========================================================
  -- 12. DEMO SALE #1
  -- ==========================================================

  INSERT INTO public.sales (
    organization_id,
    client_id,
    prospecteur_id,
    article_id,
    sale_number,
    sale_date,
    quantity,
    fixed_price,
    cash_price,
    credit_price,
    amount_paid,
    amount_remaining,
    payment_frequency,
    payment_amount,
    deadline_date,
    sale_type,
    status,
    client_location,
    client_phone,
    notes
  )
  SELECT
    v_org_id,
    c.id,
    c.prospecteur_id,
    a.id,
    'SALE-DEMO-001',
    now() - interval '7 days',
    1,
    a.fixed_price,
    a.cash_price,
    a.credit_price,
    42000,
    168000,
    'daily',
    7000,
    CURRENT_DATE + 24,
    'credit',
    'active',
    c.city,
    c.phone,
    'Vente démonstration JDV CRM'
  FROM public.clients c
  JOIN public.articles a
    ON a.organization_id = v_org_id
   AND a.code = 'ART-ALPHA'
  WHERE c.code = 'CLI-DEMO-001'
    AND NOT EXISTS (
      SELECT 1
      FROM public.sales
      WHERE sale_number = 'SALE-DEMO-001'
    );


  -- ==========================================================
  -- 13. DEMO SALE #2
  -- ==========================================================

  INSERT INTO public.sales (
    organization_id,
    client_id,
    prospecteur_id,
    article_id,
    sale_number,
    sale_date,
    quantity,
    fixed_price,
    cash_price,
    credit_price,
    amount_paid,
    amount_remaining,
    payment_frequency,
    payment_amount,
    deadline_date,
    sale_type,
    status,
    client_location,
    client_phone,
    notes
  )
  SELECT
    v_org_id,
    c.id,
    c.prospecteur_id,
    a.id,
    'SALE-DEMO-002',
    now() - interval '10 days',
    1,
    a.fixed_price,
    a.cash_price,
    a.credit_price,
    70000,
    280000,
    'daily',
    10000,
    CURRENT_DATE + 28,
    'credit',
    'active',
    c.city,
    c.phone,
    'Vente démonstration JDV CRM'
  FROM public.clients c
  JOIN public.articles a
    ON a.organization_id = v_org_id
   AND a.code = 'ART-GOLD'
  WHERE c.code = 'CLI-DEMO-002'
    AND NOT EXISTS (
      SELECT 1
      FROM public.sales
      WHERE sale_number = 'SALE-DEMO-002'
    );


  -- ==========================================================
  -- 14. PAYMENT SCHEDULES
  -- ==========================================================

  INSERT INTO public.payment_schedules (
    organization_id,
    sale_id,
    installment_number,
    due_date,
    expected_amount,
    paid_amount,
    status
  )
  SELECT
    v_org_id,
    s.id,
    gs,
    CURRENT_DATE + gs,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' THEN 7000
      ELSE 10000
    END,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' AND gs <= 6 THEN 7000
      WHEN s.sale_number = 'SALE-DEMO-002' AND gs <= 7 THEN 10000
      ELSE 0
    END,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' AND gs <= 6 THEN 'paid'
      WHEN s.sale_number = 'SALE-DEMO-002' AND gs <= 7 THEN 'paid'
      ELSE 'pending'
    END
  FROM public.sales s
  CROSS JOIN LATERAL generate_series(
    1,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' THEN 24
      WHEN s.sale_number = 'SALE-DEMO-002' THEN 28
      ELSE 0
    END
  ) AS gs
  WHERE s.organization_id = v_org_id
    AND s.sale_number IN (
      'SALE-DEMO-001',
      'SALE-DEMO-002'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_schedules ps
      WHERE ps.sale_id = s.id
        AND ps.installment_number = gs
    );


  -- ==========================================================
  -- 15. DEMO PAYMENTS
  -- ==========================================================

  INSERT INTO public.payments (
    organization_id,
    sale_id,
    client_id,
    prospecteur_id,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    recorded_by,
    notes
  )
  SELECT
    v_org_id,
    s.id,
    s.client_id,
    s.prospecteur_id,
    7000,
    'XOF',
    now() - ((7 - gs) * interval '1 day'),
    'cash',
    'successful',
    s.prospecteur_id,
    'Paiement journalier démonstration'
  FROM public.sales s
  CROSS JOIN LATERAL generate_series(1, 6) AS gs
  WHERE s.sale_number = 'SALE-DEMO-001'
    AND NOT EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.sale_id = s.id
    );


  INSERT INTO public.payments (
    organization_id,
    sale_id,
    client_id,
    prospecteur_id,
    amount,
    currency,
    payment_date,
    payment_method,
    status,
    recorded_by,
    notes
  )
  SELECT
    v_org_id,
    s.id,
    s.client_id,
    s.prospecteur_id,
    10000,
    'XOF',
    now() - ((8 - gs) * interval '1 day'),
    'cash',
    'successful',
    s.prospecteur_id,
    'Paiement journalier démonstration'
  FROM public.sales s
  CROSS JOIN LATERAL generate_series(1, 7) AS gs
  WHERE s.sale_number = 'SALE-DEMO-002'
    AND NOT EXISTS (
      SELECT 1
      FROM public.payments p
      WHERE p.sale_id = s.id
    );


  -- ==========================================================
  -- 16. DAILY TOKENS
  -- ==========================================================

  INSERT INTO public.daily_tokens (
    organization_id,
    client_id,
    sale_id,
    prospecteur_id,
    token_date,
    expected_amount,
    paid_amount,
    status,
    paid_at
  )
  SELECT
    v_org_id,
    s.client_id,
    s.id,
    s.prospecteur_id,
    CURRENT_DATE - gs,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' THEN 7000
      ELSE 10000
    END,
    CASE
      WHEN gs <= 6 AND s.sale_number = 'SALE-DEMO-001' THEN 7000
      WHEN gs <= 7 AND s.sale_number = 'SALE-DEMO-002' THEN 10000
      ELSE 0
    END,
    CASE
      WHEN gs <= 6 AND s.sale_number = 'SALE-DEMO-001' THEN 'paid'
      WHEN gs <= 7 AND s.sale_number = 'SALE-DEMO-002' THEN 'paid'
      ELSE 'pending'
    END,
    CASE
      WHEN gs <= 6 AND s.sale_number = 'SALE-DEMO-001'
        THEN now() - (gs * interval '1 day')
      WHEN gs <= 7 AND s.sale_number = 'SALE-DEMO-002'
        THEN now() - (gs * interval '1 day')
      ELSE NULL
    END
  FROM public.sales s
  CROSS JOIN LATERAL generate_series(
    0,
    CASE
      WHEN s.sale_number = 'SALE-DEMO-001' THEN 13
      WHEN s.sale_number = 'SALE-DEMO-002' THEN 13
      ELSE 0
    END
  ) AS gs
  WHERE s.organization_id = v_org_id
    AND s.sale_number IN (
      'SALE-DEMO-001',
      'SALE-DEMO-002'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.daily_tokens dt
      WHERE dt.sale_id = s.id
        AND dt.token_date = CURRENT_DATE - gs
    );


  -- ==========================================================
  -- 17. DEMO COMMISSIONS
  -- ==========================================================

  INSERT INTO public.commissions (
    organization_id,
    prospecteur_id,
    sale_id,
    article_id,
    commission_rate,
    base_amount,
    commission_amount,
    status
  )
  SELECT
    v_org_id,
    s.prospecteur_id,
    s.id,
    s.article_id,
    5,
    s.credit_price,
    ROUND(s.credit_price * 0.05, 2),
    'approved'
  FROM public.sales s
  WHERE s.organization_id = v_org_id
    AND s.sale_number IN (
      'SALE-DEMO-001',
      'SALE-DEMO-002'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.commissions c
      WHERE c.sale_id = s.id
    );

END $$;


-- ============================================================
-- 18. SUPER ADMIN
-- ============================================================
--
-- We NEVER create auth.users here.
-- If superadmin@jdvcrm.bj already exists in Auth,
-- register it in super_admins.
--

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
WHERE lower(au.email) = lower('superadmin@jdvcrm.bj')
  AND NOT EXISTS (
    SELECT 1
    FROM public.super_admins sa
    WHERE sa.user_id = au.id
  )
LIMIT 1;


COMMIT;