import { createClient } from '@/lib/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function emptySuperAdminKPIs(): SuperAdminKPIs {
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

function formatUsd(value: number): string {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value)} USD`;
}

function normalizeSubscriptionStatus(
  status: string | null | undefined,
): EnterpriseRow['status_abonnement'] {
  switch (status) {
    case 'active':
      return 'active';

    case 'trial':
      return 'trial';

    case 'expired':
      return 'expired';

    case 'suspended': case'blocked':
      return 'suspendu';

    case 'pending': case'inactive': case'past_due': case'cancelled':
    default:
      return 'pending';
  }
}

function getTier(
  prospectorCount: number,
): EnterpriseRow['tier'] {
  if (prospectorCount >= 20) {
    return 'Entreprise';
  }

  if (prospectorCount >= 8) {
    return 'Professionnel';
  }

  return 'Démarrage';
}

async function ensureSuperAdmin(): Promise<{
  authorized: boolean;
  userId: string | null;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        authorized: false,
        userId: null,
      };
    }

    const { data: superAdmin, error: superAdminError } = await supabase
      .from('super_admins')
      .select('id, status, actif')
      .eq('user_id', user.id)
      .maybeSingle();

    if (superAdminError || !superAdmin) {
      return {
        authorized: false,
        userId: user.id,
      };
    }

    const active =
      superAdmin.status === 'active' &&
      superAdmin.actif !== false;

    return {
      authorized: active,
      userId: user.id,
    };
  } catch (error) {
    console.error('ensureSuperAdmin error:', error);

    return {
      authorized: false,
      userId: null,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all organizations
// Compatible avec les anciens composants utilisant fetchAllEnterprises()
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllEnterprises(): Promise<EnterpriseRow[]> {
  try {
    const supabase = createClient();
    const { authorized } = await ensureSuperAdmin();

    if (!authorized) {
      console.error('fetchAllEnterprises: accès SUPER ADMIN refusé.');
      return [];
    }

    const { data: organizations, error: organizationsError } =
      await supabase
        .from('organizations')
        .select(`
          id,
          name,
          email,
          status,
          subscription_status,
          created_at
        `)
        .order('created_at', { ascending: false });

    if (organizationsError) {
      console.error(
        'fetchAllEnterprises organizations error:',
        organizationsError.message,
      );
      return [];
    }

    if (!organizations || organizations.length === 0) {
      return [];
    }

    const organizationIds = organizations.map(
      (organization: any) => organization.id,
    );

    // ───────────────────────────────────────────────────────────────────────
    // Prospecteurs
    // ───────────────────────────────────────────────────────────────────────

    const { data: prospecteurs, error: prospecteursError } =
      await supabase
        .from('prospecteurs')
        .select(`
          id,
          organization_id,
          status
        `)
        .in('organization_id', organizationIds);

    if (prospecteursError) {
      console.error(
        'fetchAllEnterprises prospecteurs error:',
        prospecteursError.message,
      );
    }

    const prospectorsByOrganization = new Map<string, number>();

    for (const prospecteur of prospecteurs ?? []) {
      const organizationId = prospecteur.organization_id;

      if (!organizationId) {
        continue;
      }

      prospectorsByOrganization.set(
        organizationId,
        (prospectorsByOrganization.get(organizationId) ?? 0) + 1,
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Abonnements
    // ───────────────────────────────────────────────────────────────────────

    const { data: subscriptions, error: subscriptionsError } =
      await supabase
        .from('organization_subscriptions')
        .select(`
          id,
          organization_id,
          plan_id,
          status,
          started_at,
          expires_at,
          created_at
        `)
        .in('organization_id', organizationIds)
        .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error(
        'fetchAllEnterprises subscriptions error:',
        subscriptionsError.message,
      );
    }

    const planIds = [
      ...new Set(
        (subscriptions ?? [])
          .map((subscription: any) => subscription.plan_id)
          .filter(Boolean),
      ),
    ];

    // ───────────────────────────────────────────────────────────────────────
    // Plans
    // ───────────────────────────────────────────────────────────────────────

    const { data: plans, error: plansError } =
      planIds.length > 0
        ? await supabase
            .from('subscription_plans')
            .select(`
              id,
              code,
              name,
              price,
              currency,
              duration_days
            `)
            .in('id', planIds)
        : {
            data: [],
            error: null,
          };

    if (plansError) {
      console.error(
        'fetchAllEnterprises plans error:',
        plansError.message,
      );
    }

    const plansById = new Map<string, any>(
      (plans ?? []).map((plan: any) => [plan.id, plan]),
    );

    // Dernier abonnement par organisation
    const latestSubscriptionByOrganization =
      new Map<string, any>();

    for (const subscription of subscriptions ?? []) {
      if (
        !latestSubscriptionByOrganization.has(
          subscription.organization_id,
        )
      ) {
        latestSubscriptionByOrganization.set(
          subscription.organization_id,
          subscription,
        );
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Paiements terrain / activité commerciale
    // payments = paiements réellement encaissés
    // ───────────────────────────────────────────────────────────────────────

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        organization_id,
        amount,
        status
      `)
      .in('organization_id', organizationIds)
      .eq('status', 'successful');

    if (paymentsError) {
      console.error(
        'fetchAllEnterprises payments error:',
        paymentsError.message,
      );
    }

    const terrainRevenueByOrganization =
      new Map<string, number>();

    for (const payment of payments ?? []) {
      if (!payment.organization_id) {
        continue;
      }

      terrainRevenueByOrganization.set(
        payment.organization_id,
        (terrainRevenueByOrganization.get(
          payment.organization_id,
        ) ?? 0) + Number(payment.amount ?? 0),
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Paiements tokens journaliers
    // ───────────────────────────────────────────────────────────────────────

    const { data: dailyTokens, error: dailyTokensError } =
      await supabase
        .from('daily_tokens')
        .select(`
          organization_id,
          paid_amount,
          status
        `)
        .in('organization_id', organizationIds);

    if (dailyTokensError) {
      console.error(
        'fetchAllEnterprises daily_tokens error:',
        dailyTokensError.message,
      );
    }

    const dailyRevenueByOrganization =
      new Map<string, number>();

    for (const token of dailyTokens ?? []) {
      if (!token.organization_id) {
        continue;
      }

      dailyRevenueByOrganization.set(
        token.organization_id,
        (dailyRevenueByOrganization.get(
          token.organization_id,
        ) ?? 0) + Number(token.paid_amount ?? 0),
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Construction finale
    // ───────────────────────────────────────────────────────────────────────

    return organizations.map((organization: any) => {
      const prospectorCount =
        prospectorsByOrganization.get(organization.id) ?? 0;

      const tier = getTier(prospectorCount);

      const subscription =
        latestSubscriptionByOrganization.get(organization.id);

      const plan = subscription
        ? plansById.get(subscription.plan_id)
        : null;

      const price = Number(plan?.price ?? 0);

      const terrainRevenue =
        terrainRevenueByOrganization.get(organization.id) ?? 0;

      const dailyRevenue =
        dailyRevenueByOrganization.get(organization.id) ?? 0;

      return {
        id: organization.id,

        nom_entreprise:
          organization.name || 'Entreprise sans nom',

        status_abonnement:
          normalizeSubscriptionStatus(
            organization.subscription_status ||
              organization.status,
          ),

        date_fin_abonnement:
          subscription?.expires_at ?? null,

        trial_start_date:
          subscription?.status === 'trial'
            ? subscription.started_at ?? null
            : null,

        trial_end_date:
          subscription?.status === 'trial'
            ? subscription.expires_at ?? null
            : null,

        created_at: organization.created_at,

        ownerEmail:
          organization.email || '—',

        prospectorCount,

        mrr:
          price > 0
            ? formatUsd(price)
            : '—',

        tier,

        terrainRevenue,

        dailyRevenue,
      };
    });
  } catch (error) {
    console.error(
      'fetchAllEnterprises unexpected error:',
      error,
    );

    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activate / suspend organization
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleEnterpriseStatus(
  enterpriseId: string,
  action: 'activate' | 'suspend',
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createClient();
    const { authorized } = await ensureSuperAdmin();

    if (!authorized) {
      return {
        success: false,
        error: 'Accès SUPER ADMIN refusé.',
      };
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
      console.error(
        'toggleEnterpriseStatus error:',
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      'toggleEnterpriseStatus unexpected error:',
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erreur inconnue.',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN KPIs
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSuperAdminKPIs(): Promise<SuperAdminKPIs> {
  try {
    const supabase = createClient();
    const { authorized } = await ensureSuperAdmin();

    if (!authorized) {
      return emptySuperAdminKPIs();
    }

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id,
        status,
        subscription_status
      `);

    if (error || !data) {
      console.error(
        'fetchSuperAdminKPIs error:',
        error?.message,
      );

      return emptySuperAdminKPIs();
    }

    const active = data.filter(
      (organization: any) =>
        organization.status === 'active' &&
        organization.subscription_status === 'active',
    ).length;

    const suspended = data.filter(
      (organization: any) =>
        organization.status === 'suspended' ||
        organization.status === 'blocked',
    ).length;

    const pending = data.filter(
      (organization: any) =>
        organization.status === 'pending' ||
        organization.status === 'trial' ||
        organization.status === 'expired' ||
        organization.subscription_status === 'inactive' ||
        organization.subscription_status === 'past_due' ||
        organization.subscription_status === 'cancelled' ||
        organization.subscription_status === 'expired',
    ).length;

    return {
      total: data.length,
      active,
      suspended,
      pending,
    };
  } catch (error) {
    console.error(
      'fetchSuperAdminKPIs unexpected error:',
      error,
    );

    return emptySuperAdminKPIs();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial analytics
//
// Ici, le chiffre d'affaires SUPER ADMIN correspond aux abonnements
// effectivement payés par les entreprises.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchFinancialAnalytics(): Promise<FinancialAnalytics> {
  try {
    const supabase = createClient();
    const { authorized } = await ensureSuperAdmin();

    if (!authorized) {
      return emptyFinancialAnalytics();
    }

    const now = new Date();

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    // ───────────────────────────────────────────────────────────────────────
    // Paiements d'abonnements
    // ───────────────────────────────────────────────────────────────────────

    const { data: payments, error: paymentsError } =
      await supabase
        .from('subscription_payments')
        .select(`
          id,
          amount,
          status,
          paid_at,
          created_at
        `)
        .eq('status', 'successful')
        .order('created_at', {
          ascending: false,
        });

    if (paymentsError) {
      console.error(
        'fetchFinancialAnalytics subscription payments error:',
        paymentsError.message,
      );
    }

    const successfulPayments = payments ?? [];

    const totalRevenue =
      successfulPayments.reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.amount ?? 0),
        0,
      );

    const monthlyRevenue =
      successfulPayments
        .filter((payment: any) => {
          const date =
            payment.paid_at ||
            payment.created_at;

          return Boolean(
            date && date >= startOfMonth,
          );
        })
        .reduce(
          (sum: number, payment: any) =>
            sum + Number(payment.amount ?? 0),
          0,
        );

    // ───────────────────────────────────────────────────────────────────────
    // Abonnements actifs
    // ───────────────────────────────────────────────────────────────────────

    const { count: activeSubscriptions, error: subscriptionsError } =
      await supabase
        .from('organization_subscriptions')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'active');

    if (subscriptionsError) {
      console.error(
        'fetchFinancialAnalytics subscriptions error:',
        subscriptionsError.message,
      );
    }

    return {
      totalRevenue,
      monthlyRevenue,
      paymentCount: successfulPayments.length,
      activeSubscriptions:
        activeSubscriptions ?? 0,
    };
  } catch (error) {
    console.error(
      'fetchFinancialAnalytics unexpected error:',
      error,
    );

    return emptyFinancialAnalytics();
  }
}