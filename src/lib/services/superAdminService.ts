import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/* =========================================================
   TYPES
========================================================= */

export interface EnterpriseRow {
  id: string;
  nom_entreprise: string;
  status_abonnement:
    | 'active' |'pending' |'suspendu' |'trial' |'expired';
  date_fin_abonnement: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string;
  ownerEmail: string;
  prospectorCount: number;
  mrr: string;
  tier: 'Entreprise' | 'Professionnel' | 'Démarrage';
  terrainRevenue: number;
  dailyRevenue: number;
}

export interface SuperAdminKPIs {
  total: number;
  active: number;
  suspended: number;
  pending: number;
}

export interface FinancialAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentCount: number;
  activeSubscriptions: number;
}

/* =========================================================
   INTERNAL TYPES
========================================================= */

interface OrganizationRow {
  id: string;
  name: string;
  email: string | null;
  status: string;
  subscription_status: string;
  created_at: string;
}

interface ProspecteurRow {
  id: string;
  organization_id: string;
  status: string;
}

interface OrganizationSubscriptionRow {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface SubscriptionPlanRow {
  id: string;
  code: string;
  name: string;
  price: number | string;
  currency: string;
  duration_days: number;
}

interface PaymentRow {
  organization_id: string;
  amount: number | string;
  currency: string;
  status: string;
  payment_date: string;
  created_at: string;
}

interface DailyTokenRow {
  organization_id: string;
  paid_amount: number | string;
  status: string;
  token_date: string;
  paid_at: string | null;
}

interface SubscriptionPaymentRow {
  amount: number | string;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

/* =========================================================
   CONSTANTES
========================================================= */

const SUCCESSFUL_PAYMENT_STATUSES = [
  'success',
  'successful',
  'paid',
  'completed',
];

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'active',
];

const TRIAL_SUBSCRIPTION_STATUSES = [
  'trial',
  'trialing',
];

const SUSPENDED_STATUSES = [
  'suspended',
  'suspendu',
  'blocked',
  'blocked',
];

const PENDING_STATUSES = [
  'pending',
  'inactive',
  'past_due',
  'cancelled',
  'canceled',
];

/* =========================================================
   HELPERS
========================================================= */

function emptyKPIs(): SuperAdminKPIs {
  return {
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
  };
}

function emptyFinancialAnalytics(): FinancialAnalytics {
  return {
    totalRevenue: 0,
    monthlyRevenue: 0,
    paymentCount: 0,
    activeSubscriptions: 0,
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isSuccessfulPayment(status: unknown): boolean {
  return SUCCESSFUL_PAYMENT_STATUSES.includes(
    String(status ?? '').toLowerCase()
  );
}

function normalizeSubscriptionStatus(
  organizationStatus: string | null | undefined,
  subscriptionStatus: string | null | undefined
): EnterpriseRow['status_abonnement'] {
  const orgStatus = String(organizationStatus ?? '').toLowerCase();
  const subStatus = String(subscriptionStatus ?? '').toLowerCase();

  if (
    SUSPENDED_STATUSES.includes(orgStatus) ||
    SUSPENDED_STATUSES.includes(subStatus)
  ) {
    return 'suspendu';
  }

  if (
    ACTIVE_SUBSCRIPTION_STATUSES.includes(subStatus) &&
    !SUSPENDED_STATUSES.includes(orgStatus)
  ) {
    return 'active';
  }

  if (TRIAL_SUBSCRIPTION_STATUSES.includes(subStatus)) {
    return 'trial';
  }

  if (
    subStatus === 'expired' ||
    orgStatus === 'expired'
  ) {
    return 'expired';
  }

  if (
    PENDING_STATUSES.includes(subStatus) ||
    PENDING_STATUSES.includes(orgStatus) ||
    orgStatus === 'pending'
  ) {
    return 'pending';
  }

  return 'pending';
}

function getTier(
  prospectorCount: number
): EnterpriseRow['tier'] {
  if (prospectorCount >= 20) {
    return 'Entreprise';
  }

  if (prospectorCount >= 8) {
    return 'Professionnel';
  }

  return 'Démarrage';
}

function formatMoney(
  amount: number,
  currency = 'XOF'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toLocaleString('fr-FR')} ${currency}`;
  }
}

function getStartOfCurrentMonth(): string {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0
  ).toISOString();
}

function getTodayStart(): string {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  ).toISOString();
}

/* =========================================================
   SECURITY — SUPER ADMIN
========================================================= */

async function ensureSuperAdmin(): Promise<{
  userId: string;
  email: string | null;
}> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      `Erreur de récupération de la session : ${userError.message}`
    );
  }

  if (!user) {
    throw new Error('Utilisateur non authentifié.');
  }

  const { data, error } = await supabase
    .from('super_admins')
    .select('user_id, status, actif')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de vérifier les droits SUPER ADMIN : ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      'Accès refusé : cet utilisateur n’est pas SUPER ADMIN.'
    );
  }

  if (String(data.status).toLowerCase() !== 'active') {
    throw new Error(
      'Accès refusé : le compte SUPER ADMIN est inactif.'
    );
  }

  if (data.actif === false) {
    throw new Error(
      'Accès refusé : le compte SUPER ADMIN a été désactivé.'
    );
  }

  return {
    userId: user.id,
    email: user.email ?? null,
  };
}

/* =========================================================
   ORGANISATIONS
========================================================= */

async function fetchOrganizations(): Promise<OrganizationRow[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      `
        id,
        name,
        email,
        status,
        subscription_status,
        created_at
      `
    )
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des entreprises : ${error.message}`
    );
  }

  return (data ?? []) as OrganizationRow[];
}

/* =========================================================
   PROSPECTEURS
========================================================= */

async function fetchProspecteurs(): Promise<ProspecteurRow[]> {
  const { data, error } = await supabase
    .from('prospecteurs')
    .select(
      `
        id,
        organization_id,
        status
      `
    );

  if (error) {
    throw new Error(
      `Erreur lors du chargement des prospecteurs : ${error.message}`
    );
  }

  return (data ?? []) as ProspecteurRow[];
}

/* =========================================================
   ABONNEMENTS
========================================================= */

async function fetchSubscriptions(): Promise<
  OrganizationSubscriptionRow[]
> {
  const { data, error } = await supabase
    .from('organization_subscriptions')
    .select(
      `
        id,
        organization_id,
        plan_id,
        status,
        started_at,
        expires_at,
        created_at
      `
    )
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des abonnements : ${error.message}`
    );
  }

  return (data ?? []) as OrganizationSubscriptionRow[];
}

/* =========================================================
   PLANS
========================================================= */

async function fetchSubscriptionPlans(): Promise<
  SubscriptionPlanRow[]
> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select(
      `
        id,
        code,
        name,
        price,
        currency,
        duration_days
      `
    );

  if (error) {
    throw new Error(
      `Erreur lors du chargement des plans : ${error.message}`
    );
  }

  return (data ?? []) as SubscriptionPlanRow[];
}

/* =========================================================
   REVENUS TERRAIN
   = paiements commerciaux réussis
========================================================= */

async function fetchTerrainPayments(): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(
      `
        organization_id,
        amount,
        currency,
        status,
        payment_date,
        created_at
      `
    )
    .in('status', SUCCESSFUL_PAYMENT_STATUSES);

  if (error) {
    throw new Error(
      `Erreur lors du chargement des paiements terrain : ${error.message}`
    );
  }

  return (data ?? []) as PaymentRow[];
}

/* =========================================================
   TOKENS JOURNALIERS
========================================================= */

async function fetchDailyTokens(): Promise<DailyTokenRow[]> {
  const { data, error } = await supabase
    .from('daily_tokens')
    .select(
      `
        organization_id,
        paid_amount,
        status,
        token_date,
        paid_at
      `
    );

  if (error) {
    throw new Error(
      `Erreur lors du chargement des tokens journaliers : ${error.message}`
    );
  }

  return (data ?? []) as DailyTokenRow[];
}

/* =========================================================
   FETCH ALL ENTERPRISES
========================================================= */

export async function fetchAllEnterprises(): Promise<EnterpriseRow[]> {
  await ensureSuperAdmin();

  const [
    organizations,
    prospecteurs,
    subscriptions,
    plans,
    payments,
    dailyTokens,
  ] = await Promise.all([
    fetchOrganizations(),
    fetchProspecteurs(),
    fetchSubscriptions(),
    fetchSubscriptionPlans(),
    fetchTerrainPayments(),
    fetchDailyTokens(),
  ]);

  /* -------------------------------------------------------
     Nombre de prospecteurs par entreprise
  ------------------------------------------------------- */

  const prospecteurCountMap = new Map<string, number>();

  for (const prospecteur of prospecteurs) {
    const current =
      prospecteurCountMap.get(prospecteur.organization_id) ?? 0;

    prospecteurCountMap.set(
      prospecteur.organization_id,
      current + 1
    );
  }

  /* -------------------------------------------------------
     Dernier abonnement par entreprise
  ------------------------------------------------------- */

  const latestSubscriptionMap = new Map<
    string,
    OrganizationSubscriptionRow
  >();

  for (const subscription of subscriptions) {
    const existing =
      latestSubscriptionMap.get(subscription.organization_id);

    if (!existing) {
      latestSubscriptionMap.set(
        subscription.organization_id,
        subscription
      );
      continue;
    }

    const existingDate = new Date(
      existing.created_at
    ).getTime();

    const currentDate = new Date(
      subscription.created_at
    ).getTime();

    if (currentDate > existingDate) {
      latestSubscriptionMap.set(
        subscription.organization_id,
        subscription
      );
    }
  }

  /* -------------------------------------------------------
     Plans
  ------------------------------------------------------- */

  const planMap = new Map<
    string,
    SubscriptionPlanRow
  >();

  for (const plan of plans) {
    planMap.set(plan.id, plan);
  }

  /* -------------------------------------------------------
     Revenus terrain par entreprise
  ------------------------------------------------------- */

  const terrainRevenueMap = new Map<string, number>();

  for (const payment of payments) {
    if (!isSuccessfulPayment(payment.status)) {
      continue;
    }

    const amount = toNumber(payment.amount);

    const current =
      terrainRevenueMap.get(payment.organization_id) ?? 0;

    terrainRevenueMap.set(
      payment.organization_id,
      current + amount
    );
  }

  /* -------------------------------------------------------
     Tokens du jour uniquement
  ------------------------------------------------------- */

  const today = new Date().toISOString().slice(0, 10);

  const dailyRevenueMap = new Map<string, number>();

  for (const token of dailyTokens) {
    if (token.token_date !== today) {
      continue;
    }

    const amount = toNumber(token.paid_amount);

    const current =
      dailyRevenueMap.get(token.organization_id) ?? 0;

    dailyRevenueMap.set(
      token.organization_id,
      current + amount
    );
  }

  /* -------------------------------------------------------
     Construction finale
  ------------------------------------------------------- */

  return organizations.map((organization) => {
    const subscription =
      latestSubscriptionMap.get(organization.id);

    const plan = subscription
      ? planMap.get(subscription.plan_id)
      : undefined;

    const prospectorCount =
      prospecteurCountMap.get(organization.id) ?? 0;

    const status = normalizeSubscriptionStatus(
      organization.status,
      subscription?.status ??
        organization.subscription_status
    );

    const currency =
      plan?.currency ||
      'XOF';

    const mrr = plan
      ? formatMoney(
          toNumber(plan.price),
          currency
        )
      : formatMoney(0, currency);

    return {
      id: organization.id,

      nom_entreprise:
        organization.name || 'Entreprise sans nom',

      status_abonnement: status,

      date_fin_abonnement:
        subscription?.expires_at ?? null,

      trial_start_date:
        status === 'trial'
          ? subscription?.started_at ?? null
          : null,

      trial_end_date:
        status === 'trial'
          ? subscription?.expires_at ?? null
          : null,

      created_at:
        organization.created_at,

      ownerEmail:
        organization.email ?? 'Non renseigné',

      prospectorCount,

      mrr,

      tier:
        getTier(prospectorCount),

      terrainRevenue:
        terrainRevenueMap.get(
          organization.id
        ) ?? 0,

      dailyRevenue:
        dailyRevenueMap.get(
          organization.id
        ) ?? 0,
    };
  });
}

/* =========================================================
   ACTIVER / SUSPENDRE UNE ENTREPRISE
========================================================= */

export async function toggleEnterpriseStatus(
  enterpriseId: string,
  action: 'activate' | 'suspend'
): Promise<void> {
  await ensureSuperAdmin();

  if (!enterpriseId) {
    throw new Error(
      'Identifiant entreprise manquant.'
    );
  }

  const newStatus =
    action === 'activate' ?'active' :'suspended';

  const { error } = await supabase
    .from('organizations')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enterpriseId);

  if (error) {
    throw new Error(
      `Impossible de modifier le statut de l’entreprise : ${error.message}`
    );
  }
}

/* =========================================================
   KPI SUPER ADMIN
========================================================= */

export async function fetchSuperAdminKPIs(): Promise<SuperAdminKPIs> {
  await ensureSuperAdmin();

  const { data, error } = await supabase
    .from('organizations')
    .select(
      `
        id,
        status,
        subscription_status
      `
    );

  if (error) {
    throw new Error(
      `Erreur lors du calcul des KPI : ${error.message}`
    );
  }

  const organizations =
    data ?? [];

  if (organizations.length === 0) {
    return emptyKPIs();
  }

  const result = emptyKPIs();

  result.total =
    organizations.length;

  for (const organization of organizations) {
    const organizationStatus =
      String(
        organization.status ?? ''
      ).toLowerCase();

    const subscriptionStatus =
      String(
        organization.subscription_status ?? ''
      ).toLowerCase();

    /* SUSPENDU */
    if (
      SUSPENDED_STATUSES.includes(
        organizationStatus
      ) ||
      SUSPENDED_STATUSES.includes(
        subscriptionStatus
      )
    ) {
      result.suspended++;
      continue;
    }

    /* ACTIF */
    if (
      organizationStatus === 'active' &&
      subscriptionStatus === 'active'
    ) {
      result.active++;
      continue;
    }

    /* PENDING / TRIAL / EXPIRED */
    result.pending++;
  }

  return result;
}

/* =========================================================
   ANALYTICS FINANCIÈRES
   Revenus des abonnements JDV CRM
========================================================= */

export async function fetchFinancialAnalytics(): Promise<FinancialAnalytics> {
  await ensureSuperAdmin();

  const [
    subscriptionPaymentsResult,
    subscriptionsResult,
  ] = await Promise.all([
    supabase
      .from('subscription_payments')
      .select(
        `
          amount,
          currency,
          status,
          paid_at,
          created_at
        `
      )
      .in(
        'status',
        SUCCESSFUL_PAYMENT_STATUSES
      ),

    supabase
      .from('organization_subscriptions')
      .select(
        `
          id,
          status
        `
      ),
  ]);

  if (subscriptionPaymentsResult.error) {
    throw new Error(
      `Erreur lors du chargement des revenus d’abonnement : ${subscriptionPaymentsResult.error.message}`
    );
  }

  if (subscriptionsResult.error) {
    throw new Error(
      `Erreur lors du chargement des abonnements actifs : ${subscriptionsResult.error.message}`
    );
  }

  const payments =
    (subscriptionPaymentsResult.data ??
      []) as SubscriptionPaymentRow[];

  const subscriptions =
    subscriptionsResult.data ?? [];

  const analytics =
    emptyFinancialAnalytics();

  const startOfMonth =
    getStartOfCurrentMonth();

  /* -------------------------------------------------------
     Revenus abonnements
  ------------------------------------------------------- */

  for (const payment of payments) {
    if (
      !isSuccessfulPayment(
        payment.status
      )
    ) {
      continue;
    }

    const amount =
      toNumber(payment.amount);

    analytics.totalRevenue +=
      amount;

    const paymentDate =
      payment.paid_at ||
      payment.created_at;

    if (
      paymentDate &&
      new Date(paymentDate) >=
        new Date(startOfMonth)
    ) {
      analytics.monthlyRevenue +=
        amount;
    }

    analytics.paymentCount++;
  }

  /* -------------------------------------------------------
     Abonnements actifs
  ------------------------------------------------------- */

  analytics.activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        String(
          subscription.status ?? ''
        ).toLowerCase() === 'active'
    ).length;

  return analytics;
}

/* =========================================================
   REVENUS TERRAIN DU JOUR
========================================================= */

export async function fetchTodayTerrainRevenue(): Promise<number> {
  await ensureSuperAdmin();

  const todayStart =
    getTodayStart();

  const { data, error } = await supabase
    .from('payments')
    .select(
      `
        amount,
        status,
        payment_date
      `
    )
    .gte(
      'payment_date',
      todayStart
    )
    .in(
      'status',
      SUCCESSFUL_PAYMENT_STATUSES
    );

  if (error) {
    throw new Error(
      `Erreur lors du calcul du revenu terrain du jour : ${error.message}`
    );
  }

  return (data ?? []).reduce(
    (total, payment) =>
      total +
      toNumber(payment.amount),
    0
  );
}

/* =========================================================
   REVENUS TOKENS DU JOUR
========================================================= */

export async function fetchTodayDailyTokenRevenue(): Promise<number> {
  await ensureSuperAdmin();

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const { data, error } = await supabase
    .from('daily_tokens')
    .select(
      `
        paid_amount,
        token_date,
        status
      `
    )
    .eq(
      'token_date',
      today
    );

  if (error) {
    throw new Error(
      `Erreur lors du calcul des tokens du jour : ${error.message}`
    );
  }

  return (data ?? []).reduce(
    (total, token) =>
      total +
      toNumber(token.paid_amount),
    0
  );
}

/* =========================================================
   EXPORT D'UN SNAPSHOT COMPLET DU DASHBOARD
========================================================= */

export async function fetchSuperAdminDashboard(): Promise<{
  kpis: SuperAdminKPIs;
  enterprises: EnterpriseRow[];
  financial: FinancialAnalytics;
  todayTerrainRevenue: number;
  todayDailyTokenRevenue: number;
}> {
  await ensureSuperAdmin();

  const [
    kpis,
    enterprises,
    financial,
    todayTerrainRevenue,
    todayDailyTokenRevenue,
  ] = await Promise.all([
    fetchSuperAdminKPIs(),
    fetchAllEnterprises(),
    fetchFinancialAnalytics(),
    fetchTodayTerrainRevenue(),
    fetchTodayDailyTokenRevenue(),
  ]);

  return {
    kpis,
    enterprises,
    financial,
    todayTerrainRevenue,
    todayDailyTokenRevenue,
  };
}