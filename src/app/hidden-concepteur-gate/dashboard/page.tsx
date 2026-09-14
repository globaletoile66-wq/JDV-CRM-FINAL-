'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type FilterStatus =
  | 'Tous' |'active' |'suspendu' |'pending' |'trial' |'expired';

type CompanyStatus =
  | 'active' |'suspendu' |'pending' |'trial' |'expired';

type Company = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  status: CompanyStatus;
  subscriptionStatus: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  prospectorCount: number;
  mrr: number;
  totalRevenue: number;
};

type KPIs = {
  total: number;
  active: number;
  suspended: number;
  pending: number;
  trial: number;
  expired: number;
};

type FinancialAnalytics = {
  totalRevenue: number;
  monthlyRevenue: number;
  paymentCount: number;
  activeSubscriptions: number;
};

const STATUS_CONFIG: Record<
  CompanyStatus,
  {
    color: string;
    bg: string;
    dot: string;
    label: string;
    glow: string;
  }
> = {
  active: {
    color: '#68D391',
    bg: 'rgba(72,187,120,0.12)',
    dot: '#68D391',
    label: 'Actif',
    glow: 'rgba(72,187,120,0.3)',
  },
  suspendu: {
    color: '#FC8181',
    bg: 'rgba(252,129,129,0.12)',
    dot: '#FC8181',
    label: 'Suspendu',
    glow: 'rgba(252,129,129,0.3)',
  },
  pending: {
    color: '#F6E05E',
    bg: 'rgba(246,224,94,0.12)',
    dot: '#F6E05E',
    label: 'En attente',
    glow: 'rgba(246,224,94,0.3)',
  },
  trial: {
    color: '#B794F4',
    bg: 'rgba(183,148,244,0.12)',
    dot: '#B794F4',
    label: 'Essai gratuit',
    glow: 'rgba(183,148,244,0.3)',
  },
  expired: {
    color: '#FC8181',
    bg: 'rgba(252,129,129,0.08)',
    dot: '#FC8181',
    label: 'Expiré',
    glow: 'rgba(252,129,129,0.2)',
  },
};

function normalizeStatus(
  organizationStatus: string | null | undefined,
  subscriptionStatus: string | null | undefined,
  trialEndDate: string | null | undefined
): CompanyStatus {
  const orgStatus = String(organizationStatus || '').toLowerCase();
  const subStatus = String(subscriptionStatus || '').toLowerCase();

  if (
    orgStatus === 'suspendu' ||
    orgStatus === 'suspended' ||
    subStatus === 'suspendu' ||
    subStatus === 'suspended'
  ) {
    return 'suspendu';
  }

  if (
    trialEndDate &&
    new Date(trialEndDate).getTime() > 0 &&
    new Date(trialEndDate).getTime() > Date.now() &&
    (subStatus === 'trial' ||
      subStatus === 'essai' ||
      subStatus === 'trialing')
  ) {
    return 'trial';
  }

  if (
    trialEndDate &&
    new Date(trialEndDate).getTime() <= Date.now() &&
    (subStatus === 'trial' ||
      subStatus === 'essai' ||
      subStatus === 'trialing')
  ) {
    return 'expired';
  }

  if (
    orgStatus === 'active' ||
    subStatus === 'active' ||
    subStatus === 'paid'
  ) {
    return 'active';
  }

  if (
    orgStatus === 'pending' ||
    subStatus === 'pending' ||
    subStatus === 'inactive'
  ) {
    return 'pending';
  }

  return 'pending';
}

function formatFCFA(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} FCFA`;
}

function KillSwitchToggle({
  isActive,
  isLoading,
  onActivate,
  onSuspend,
}: {
  isActive: boolean;
  isLoading: boolean;
  onActivate: () => void;
  onSuspend: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isActive ? onSuspend : onActivate}
        disabled={isLoading}
        className="relative flex items-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ outline: 'none' }}
        title={isActive ? 'Suspendre l’entreprise' : 'Activer l’entreprise'}
      >
        <div
          className="w-12 h-6 rounded-full transition-all duration-300 relative"
          style={{
            background: isActive
              ? 'linear-gradient(135deg, #D4AF37, #A8860C)'
              : 'rgba(252,129,129,0.2)',
            border: isActive
              ? '1px solid rgba(212,175,55,0.5)'
              : '1px solid rgba(252,129,129,0.4)',
            boxShadow: isActive
              ? '0 0 12px rgba(212,175,55,0.3), inset 0 1px 2px rgba(0,0,0,0.3)'
              : '0 0 8px rgba(252,129,129,0.15), inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center"
            style={{
              left: isActive ? '24px' : '2px',
              background: isActive ? '#fff' : 'rgba(252,129,129,0.8)',
              boxShadow: isActive
                ? '0 2px 6px rgba(0,0,0,0.4)'
                : '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {isLoading ? (
              <div
                className="w-2.5 h-2.5 rounded-full border animate-spin"
                style={{
                  borderColor: isActive ? '#D4AF37' : '#FC8181',
                  borderTopColor: 'transparent',
                }}
              />
            ) : (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isActive ? '#D4AF37' : '#FC8181',
                }}
              />
            )}
          </div>
        </div>
      </button>

      <span
        className="text-xs font-bold tracking-wide"
        style={{
          color: isActive ? '#D4AF37' : '#FC8181',
          minWidth: '65px',
        }}
      >
        {isLoading ? '…' : isActive ? 'ACTIF' : 'SUSPENDU'}
      </span>
    </div>
  );
}

function TrialProgressBar({
  trialEndDate,
  trialStartDate,
}: {
  trialEndDate: string | null;
  trialStartDate: string | null;
}) {
  if (!trialEndDate) {
    return (
      <span className="text-xs" style={{ color: '#2D3748' }}>
        —
      </span>
    );
  }

  const now = Date.now();
  const end = new Date(trialEndDate).getTime();

  const start = trialStartDate
    ? new Date(trialStartDate).getTime()
    : end - 14 * 24 * 60 * 60 * 1000;

  const totalDuration = Math.max(end - start, 1);
  const elapsed = now - start;

  const remaining = Math.max(
    0,
    Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  );

  const progressPct = Math.min(
    100,
    Math.max(0, (elapsed / totalDuration) * 100)
  );

  const isExpired = end <= now;
  const isUrgent = !isExpired && remaining <= 3;

  return (
    <div className="min-w-[110px]">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-bold"
          style={{
            color: isExpired
              ? '#FC8181'
              : isUrgent
                ? '#F6E05E' :'#B794F4',
          }}
        >
          {isExpired ? 'Expiré' : `${remaining}j restants`}
        </span>
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progressPct}%`,
            background: isExpired
              ? '#FC8181'
              : isUrgent
                ? 'linear-gradient(90deg, #F6E05E, #FC8181)'
                : 'linear-gradient(90deg, #B794F4, #D4AF37)',
          }}
        />
      </div>
    </div>
  );
}

function RevenueMetricCard({
  label,
  value,
  sub,
  color,
  icon,
  loading,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  icon: string;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background:
          'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
        border: `1px solid ${color}22`,
        boxShadow:
          `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 ${color}11`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>

        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: color }}
        />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-24 bg-gray-800 rounded" />
          <div className="h-3 w-16 bg-gray-800 rounded" />
        </div>
      ) : (
        <>
          <div
            className="text-2xl font-extrabold tracking-tight"
            style={{
              color,
              fontFamily: 'monospace',
            }}
          >
            {value}
          </div>

          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: '#718096' }}
            >
              {label}
            </p>

            <p
              className="text-xs mt-0.5"
              style={{ color: '#2D3748' }}
            >
              {sub}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ConcepteurDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [companies, setCompanies] = useState<Company[]>([]);

  const [kpis, setKpis] = useState<KPIs>({
    total: 0,
    active: 0,
    suspended: 0,
    pending: 0,
    trial: 0,
    expired: 0,
  });

  const [financials, setFinancials] =
    useState<FinancialAnalytics>({
      totalRevenue: 0,
      monthlyRevenue: 0,
      paymentCount: 0,
      activeSubscriptions: 0,
    });

  const [loading, setLoading] = useState(true);

  const [activeView, setActiveView] = useState<
    'enterprises' | 'analytics'
  >('enterprises');

  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>('Tous');

  const [search, setSearch] = useState('');

  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: 'activate' | 'suspend';
    name: string;
  } | null>(null);

  const [toggling, setToggling] = useState<string | null>(null);

  const [toggleError, setToggleError] = useState('');

  const [lastRefresh, setLastRefresh] =
    useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setToggleError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/hidden-concepteur-gate/login');
        return;
      }

      /*
       * SECURITY CHECK
       * Le SUPER ADMIN est contrôlé par la table super_admins.
       */
      const { data: superAdmin, error: superAdminError } =
        await supabase
 const {
  data: superAdminResult,
  error: superAdminError,
} = await supabase.rpc(
  'verify_current_super_admin'
);

if (superAdminError) {
  console.error(
    'Erreur vérification SUPER ADMIN:',
    superAdminError
  );

  router.replace(
    '/hidden-concepteur-gate/login'
  );

  return;
}

const superAdmin = Array.isArray(superAdminResult)
  ? superAdminResult[0]
  : superAdminResult;

if (
  !superAdmin ||
  superAdmin.is_super_admin !== true ||
  superAdmin.user_id !== user.id
) {
  await supabase.auth.signOut();

  router.replace(
    '/hidden-concepteur-gate/login'
  );

  return;
}

      if (superAdminError) {
        console.error(
          'Erreur vérification SUPER ADMIN:',
          superAdminError
        );
      }

      if (!superAdmin) {
        await supabase.auth.signOut();
        router.replace('/hidden-concepteur-gate/login');
        return;
      }

      /*
       * 1. ENTREPRISES
       */
      const { data: organizations, error: organizationsError } =
        await supabase
          .from('organizations')
          .select(`
            id,
            name,
            email,
            created_at,
            status,
            subscription_status,
            owner_user_id
          `)
          .order('created_at', {
            ascending: false,
          });

      if (organizationsError) {
        throw organizationsError;
      }

      const organizationRows = organizations || [];

      /*
       * 2. MEMBRES / PROSPECTEURS
       */
      const { data: members } = await supabase
        .from('organization_members')
        .select(
          'organization_id, user_id, role, status'
        )
        .eq('status', 'active');

      /*
       * 3. ABONNEMENTS
       */
      const { data: subscriptions } = await supabase
        .from('organization_subscriptions')
        .select(`
          organization_id,
          plan_id,
          status,
          started_at,
          expires_at
        `);

      /*
       * 4. PLANS
       */
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select(`
          id,
          code,
          name,
          price,
          currency,
          duration_days
        `);

      /*
       * 5. PAIEMENTS D'ABONNEMENT
       */
      const { data: subscriptionPayments } =
        await supabase
          .from('subscription_payments')
          .select(`
            id,
            organization_id,
            subscription_id,
            amount,
            currency,
            status,
            paid_at,
            created_at
          `)
          .order('created_at', {
            ascending: false,
          });

      /*
       * 6. EMAIL DU PROPRIÉTAIRE
       *
       * profiles ne contient pas email.
       * L'email réel est dans auth.users et n'est pas
       * accessible directement côté navigateur.
       *
       * On utilise donc organizations.email en priorité,
       * puis profiles pour le nom.
       */
      const ownerIds = organizationRows
        .map((org: any) => org.owner_user_id)
        .filter(Boolean);

      let ownerProfiles: any[] = [];

      if (ownerIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select(
            'id, first_name, last_name, display_name, phone'
          )
          .in('id', ownerIds);

        ownerProfiles = profileData || [];
      }

      const planMap = new Map<string, any>();

      (plans || []).forEach((plan: any) => {
        planMap.set(plan.id, plan);
      });

      const memberCountMap = new Map<string, number>();

      (members || []).forEach((member: any) => {
        if (
          member.role === 'prospecteur' ||
          member.role === 'PROSPECTEUR'
        ) {
          memberCountMap.set(
            member.organization_id,
            (memberCountMap.get(member.organization_id) || 0) + 1
          );
        }
      });

      const revenueMap = new Map<string, number>();
      const monthlyRevenueMap = new Map<string, number>();

      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let paymentCount = 0;

      (subscriptionPayments || []).forEach((payment: any) => {
        const status = String(
          payment.status || ''
        ).toLowerCase();

        if (
          status !== 'paid' &&
          status !== 'approved' &&
          status !== 'completed' &&
          status !== 'success'
        ) {
          return;
        }

        const amount = Number(payment.amount) || 0;

        totalRevenue += amount;
        paymentCount += 1;

        if (payment.organization_id) {
          revenueMap.set(
            payment.organization_id,
            (revenueMap.get(payment.organization_id) || 0) +
              amount
          );
        }

        const paymentDate = new Date(
          payment.paid_at || payment.created_at
        );

        if (paymentDate >= currentMonthStart) {
          monthlyRevenue += amount;

          if (payment.organization_id) {
            monthlyRevenueMap.set(
              payment.organization_id,
              (monthlyRevenueMap.get(payment.organization_id) || 0) +
                amount
            );
          }
        }
      });

      /*
       * 7. CONSTRUCTION DES ENTREPRISES
       */
      const mappedCompanies: Company[] =
        organizationRows.map((org: any) => {
          const ownerProfile = ownerProfiles.find(
            (profile) =>
              profile.id === org.owner_user_id
          );

          const orgSubscriptions =
            (subscriptions || []).filter(
              (sub: any) =>
                sub.organization_id === org.id
            );

          const currentSubscription =
            orgSubscriptions
              .sort((a: any, b: any) => {
                const aDate = new Date(
                  a.started_at || 0
                ).getTime();

                const bDate = new Date(
                  b.started_at || 0
                ).getTime();

                return bDate - aDate;
              })[0];

          const subscriptionPlan = currentSubscription
            ? planMap.get(currentSubscription.plan_id)
            : null;

          const trialStartDate =
            currentSubscription?.started_at || null;

          const trialEndDate =
            currentSubscription?.expires_at || null;

          const status = normalizeStatus(
            org.status,
            org.subscription_status ||
              currentSubscription?.status,
            trialEndDate
          );

          const mrr = Number(
            subscriptionPlan?.price || 0
          );

          return {
            id: org.id,
            name:
              org.name ||
              ownerProfile?.display_name ||
              'Entreprise sans nom',

            email:
              org.email ||
              'Email non renseigné',

            created_at: org.created_at,

            status,

            subscriptionStatus:
              org.subscription_status ||
              currentSubscription?.status ||
              'inactive',

            trialStartDate,
            trialEndDate,

            prospectorCount:
              memberCountMap.get(org.id) || 0,

            mrr,

            totalRevenue:
              revenueMap.get(org.id) || 0,
          };
        });

      /*
       * 8. KPI
       */
      const calculatedKPIs: KPIs = {
        total: mappedCompanies.length,

        active: mappedCompanies.filter(
          (c) => c.status === 'active'
        ).length,

        suspended: mappedCompanies.filter(
          (c) => c.status === 'suspendu'
        ).length,

        pending: mappedCompanies.filter(
          (c) => c.status === 'pending'
        ).length,

        trial: mappedCompanies.filter(
          (c) => c.status === 'trial'
        ).length,

        expired: mappedCompanies.filter(
          (c) => c.status === 'expired'
        ).length,
      };

      /*
       * 9. ABONNEMENTS ACTIFS
       */
      const activeSubscriptions =
        (subscriptions || []).filter((sub: any) => {
          const status = String(
            sub.status || ''
          ).toLowerCase();

          if (
            status !== 'active' &&
            status !== 'paid'
          ) {
            return false;
          }

          if (!sub.expires_at) {
            return true;
          }

          return (
            new Date(sub.expires_at).getTime() >
            Date.now()
          );
        }).length;

      setCompanies(mappedCompanies);
      setKpis(calculatedKPIs);

      setFinancials({
        totalRevenue,
        monthlyRevenue,
        paymentCount,
        activeSubscriptions,
      });

      setLastRefresh(new Date());
    } catch (error: any) {
      console.error(
        'Erreur chargement Super Admin:',
        error
      );

      setToggleError(
        error?.message ||
          'Impossible de charger les données du panneau de contrôle.'
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadData();

    /*
     * REALTIME SUPER ADMIN
     */
    const channel = supabase
      .channel('super-admin-control-panel')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
        },
        () => {
          loadData();
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_subscriptions',
        },
        () => {
          loadData();
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscription_payments',
        },
        () => {
          loadData();
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
        },
        () => {
          loadData();
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/hidden-concepteur-gate/login');
  };

  /*
   * KILL SWITCH
   *
   * On agit directement sur organizations.
   *
   * status:
   * active / suspendu
   *
   * subscription_status:
   * active / suspended
   */
  const executeToggle = async (
    id: string,
    action: 'activate' | 'suspend'
  ) => {
    try {
      setToggling(id);
      setToggleError('');

      const newOrgStatus =
        action === 'activate' ?'active' :'suspendu';

      const newSubscriptionStatus =
        action === 'activate' ?'active' :'suspended';

      const { error } = await supabase
        .from('organizations')
        .update({
          status: newOrgStatus,
          subscription_status:
            newSubscriptionStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      /*
       * Mise à jour immédiate de l'interface.
       */
      setCompanies((previous) =>
        previous.map((company) =>
          company.id === id
            ? {
                ...company,
                status:
                  action === 'activate' ?'active' :'suspendu',
                subscriptionStatus:
                  newSubscriptionStatus,
              }
            : company
        )
      );

      /*
       * Recalcul propre des KPI.
       */
      setKpis((previous) => {
        const target = companies.find(
          (company) => company.id === id
        );

        if (!target) {
          return previous;
        }

        const wasActive =
          target.status === 'active';

        const wasSuspended =
          target.status === 'suspendu';

        const nowActive =
          action === 'activate';

        const nowSuspended =
          action === 'suspend';

        return {
          ...previous,
          active:
            previous.active -
            (wasActive ? 1 : 0) +
            (nowActive ? 1 : 0),

          suspended:
            previous.suspended -
            (wasSuspended ? 1 : 0) +
            (nowSuspended ? 1 : 0),
        };
      });

      setConfirmAction(null);

      /*
       * Recharge depuis Supabase pour garantir
       * que l'affichage correspond à la base.
       */
      await loadData();
    } catch (error: any) {
      console.error(
        'Erreur Kill-Switch:',
        error
      );

      setToggleError(
        error?.message ||
          'Impossible de modifier le statut de cette entreprise.'
      );
    } finally {
      setToggling(null);
    }
  };

  const filtered = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchStatus =
        filterStatus === 'Tous' ||
        company.status === filterStatus;

      const matchSearch =
        normalizedSearch === '' ||
        company.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        company.id
          .toLowerCase()
          .includes(normalizedSearch) ||
        company.email
          .toLowerCase()
          .includes(normalizedSearch);

      return matchStatus && matchSearch;
    });
  }, [companies, filterStatus, search]);

  const statusCounts: Record<
    FilterStatus,
    number
  > = {
    Tous: companies.length,
    active: kpis.active,
    suspendu: kpis.suspended,
    trial: kpis.trial,
    expired: kpis.expired,
    pending: kpis.pending,
  };

  const totalRevenueFCFA =
    financials.totalRevenue;

  const mrr =
    financials.monthlyRevenue;

  const potentialMRR =
    companies
      .filter(
        (company) =>
          company.status === 'active' ||
          company.status === 'trial'
      )
      .reduce(
        (sum, company) =>
          sum + (Number(company.mrr) || 0),
        0
      );

  return (
    <div
      className="min-h-screen"
      style={{ background: '#050A14' }}
    >
      {/* TOP BAR */}
      <div
        className="flex items-center justify-between px-6 py-3 sticky top-0 z-20"
        style={{
          background: 'rgba(5,10,20,0.97)',
          borderBottom:
            '1px solid rgba(212,175,55,0.12)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{
              background:
                'linear-gradient(135deg, #D4AF37, #A8860C)',
              boxShadow:
                '0 0 16px rgba(212,175,55,0.3)',
            }}
          >
            ⚡
          </div>

          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase font-extrabold"
              style={{
                color: '#D4AF37',
                fontFamily: 'monospace',
              }}
            >
              JDV CRM — CONTROL PANEL
            </p>

            <p
              className="text-xs"
              style={{ color: '#2D3748' }}
            >
              {lastRefresh
                ? `Mis à jour ${lastRefresh.toLocaleTimeString(
                    'fr-FR'
                  )}`
                : 'Chargement…'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setActiveView('enterprises')
            }
            className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
            style={{
              background:
                activeView === 'enterprises' ?'rgba(212,175,55,0.15)' :'transparent',
              color:
                activeView === 'enterprises' ?'#D4AF37' :'#4A5568',
              border:
                activeView === 'enterprises' ?'1px solid rgba(212,175,55,0.3)' :'1px solid transparent',
            }}
          >
            🏢 Entreprises
          </button>

          <button
            onClick={() =>
              setActiveView('analytics')
            }
            className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
            style={{
              background:
                activeView === 'analytics' ?'rgba(212,175,55,0.15)' :'transparent',
              color:
                activeView === 'analytics' ?'#D4AF37' :'#4A5568',
              border:
                activeView === 'analytics' ?'1px solid rgba(212,175,55,0.3)' :'1px solid transparent',
            }}
          >
            📊 Analytics
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#68D391' }}
            />

            <span
              className="text-xs font-mono"
              style={{ color: '#2D3748' }}
            >
              LIVE
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{
              color: '#D4AF37',
              border:
                '1px solid rgba(212,175,55,0.2)',
              background:
                'rgba(212,175,55,0.05)',
            }}
          >
            ↻ Sync
          </button>

          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{
              color: '#FC8181',
              border:
                '1px solid rgba(252,129,129,0.2)',
              background:
                'rgba(252,129,129,0.05)',
            }}
          >
            ⏻ Sortir
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            {
              label: 'Total',
              value: kpis.total,
              color: '#A0AEC0',
              sub: 'inscrites',
              icon: '🏢',
            },
            {
              label: 'Actives',
              value: kpis.active,
              color: '#68D391',
              sub: 'opérationnelles',
              icon: '✅',
            },
            {
              label: 'Essai',
              value: kpis.trial,
              color: '#B794F4',
              sub: 'en cours',
              icon: '⏳',
            },
            {
              label: 'Suspendues',
              value: kpis.suspended,
              color: '#FC8181',
              sub: 'bloquées',
              icon: '🚫',
            },
            {
              label: 'Expirées',
              value: kpis.expired,
              color: '#F6E05E',
              sub: 'à relancer',
              icon: '⚠️',
            },
            {
              label: 'Revenu Total',
              value: loading
                ? '…'
                : `${Math.round(
                    totalRevenueFCFA / 1000
                  )}k`,
              color: '#D4AF37',
              sub: 'FCFA cumulé',
              icon: '💰',
            },
            {
              label: 'Ce Mois',
              value: loading
                ? '…'
                : `${Math.round(
                    mrr / 1000
                  )}k`,
              color: '#63B3ED',
              sub: 'FCFA',
              icon: '📈',
            },
            {
              label: 'Transactions',
              value: loading
                ? '…'
                : financials.paymentCount,
              color: '#68D391',
              sub: 'validées',
              icon: '🔄',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3.5"
              style={{
                background:
                  'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
                border: `1px solid ${stat.color}18`,
              }}
            >
              {loading ? (
                <div className="animate-pulse space-y-1.5">
                  <div className="h-6 w-10 bg-gray-800 rounded" />
                  <div className="h-3 w-14 bg-gray-800 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">
                      {stat.icon}
                    </span>
                  </div>

                  <div
                    className="text-xl font-extrabold font-mono"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </div>

                  <div
                    className="text-xs font-semibold"
                    style={{ color: '#718096' }}
                  >
                    {stat.label}
                  </div>

                  <div
                    className="text-xs"
                    style={{ color: '#2D3748' }}
                  >
                    {stat.sub}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {toggleError && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            style={{
              background:
                'rgba(252,129,129,0.1)',
              border:
                '1px solid rgba(252,129,129,0.3)',
              color: '#FC8181',
            }}
          >
            <span>⚠</span>
            {toggleError}
          </div>
        )}

        {/* ANALYTICS */}
        {activeView === 'analytics' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Analytics Revenus Globaux
              </h2>

              <p
                className="text-xs mt-0.5"
                style={{ color: '#4A5568' }}
              >
                Souscriptions et paiements JDV CRM
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <RevenueMetricCard
                label="Revenu Total Cumulé"
                value={
                  loading
                    ? '…'
                    : formatFCFA(
                        totalRevenueFCFA
                      )
                }
                sub="Depuis le lancement"
                color="#D4AF37"
                icon="💰"
                loading={loading}
              />

              <RevenueMetricCard
                label="Revenu du Mois"
                value={
                  loading
                    ? '…'
                    : formatFCFA(mrr)
                }
                sub="Paiements validés ce mois"
                color="#68D391"
                icon="📈"
                loading={loading}
              />

              <RevenueMetricCard
                label="Abonnements Actifs"
                value={
                  loading
                    ? '…'
                    : financials.activeSubscriptions
                }
                sub="Entreprises actuellement payantes"
                color="#63B3ED"
                icon="✅"
                loading={loading}
              />

              <RevenueMetricCard
                label="Transactions"
                value={
                  loading
                    ? '…'
                    : financials.paymentCount
                }
                sub="Paiements validés"
                color="#B794F4"
                icon="🔄"
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* PIPELINE */}
              <div
                className="rounded-2xl p-6 lg:col-span-2"
                style={{
                  background:
                    'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest font-semibold mb-5"
                  style={{ color: '#4A5568' }}
                >
                  Pipeline Revenus
                </p>

                <div className="space-y-4">
                  {[
                    {
                      label:
                        'Abonnements Actifs',
                      count: kpis.active,
                      amount:
                        companies
                          .filter(
                            (c) =>
                              c.status ===
                              'active'
                          )
                          .reduce(
                            (sum, c) =>
                              sum + c.mrr,
                            0
                          ),
                      color: '#68D391',
                      icon: '✅',
                    },
                    {
                      label:
                        'Essais Gratuits',
                      count: kpis.trial,
                      amount:
                        companies
                          .filter(
                            (c) =>
                              c.status ===
                              'trial'
                          )
                          .reduce(
                            (sum, c) =>
                              sum + c.mrr,
                            0
                          ),
                      color: '#B794F4',
                      icon: '⏳',
                    },
                    {
                      label:
                        'Expirés à relancer',
                      count: kpis.expired,
                      amount:
                        companies
                          .filter(
                            (c) =>
                              c.status ===
                              'expired'
                          )
                          .reduce(
                            (sum, c) =>
                              sum + c.mrr,
                            0
                          ),
                      color: '#F6E05E',
                      icon: '⚠️',
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {row.icon}
                          </span>

                          <span
                            className="text-xs font-semibold"
                            style={{
                              color: '#A0AEC0',
                            }}
                          >
                            {row.label}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className="text-xs font-bold font-mono"
                            style={{
                              color: row.color,
                            }}
                          >
                            {formatFCFA(
                              row.amount
                            )}
                          </span>

                          <span
                            className="text-xs ml-2"
                            style={{
                              color: '#4A5568',
                            }}
                          >
                            ({row.count})
                          </span>
                        </div>
                      </div>

                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{
                          background:
                            'rgba(255,255,255,0.04)',
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${
                              companies.length > 0
                                ? Math.min(
                                    100,
                                    (row.count /
                                      companies.length) *
                                      100
                                  )
                                : 0
                            }%`,
                            background:
                              row.color,
                            boxShadow:
                              `0 0 8px ${row.color}60`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-5 pt-4 flex items-center justify-between"
                  style={{
                    borderTop:
                      '1px solid rgba(212,175,55,0.08)',
                  }}
                >
                  <span
                    className="text-xs"
                    style={{ color: '#4A5568' }}
                  >
                    MRR potentiel
                  </span>

                  <span
                    className="text-base font-extrabold font-mono"
                    style={{ color: '#D4AF37' }}
                  >
                    {formatFCFA(
                      potentialMRR
                    )}
                  </span>
                </div>
              </div>

              {/* STATUS */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background:
                    'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
                  border:
                    '1px solid rgba(212,175,55,0.12)',
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest font-semibold mb-5"
                  style={{ color: '#4A5568' }}
                >
                  Distribution Statuts
                </p>

                <div className="space-y-3">
                  {(
                    Object.entries(
                      STATUS_CONFIG
                    ) as [
                      CompanyStatus,
                      (typeof STATUS_CONFIG)[CompanyStatus]
                    ][]
                  ).map(
                    ([key, cfg]) => {
                      const count =
                        companies.filter(
                          (c) =>
                            c.status === key
                        ).length;

                      const pct =
                        companies.length > 0
                          ? (count /
                              companies.length) *
                            100
                          : 0;

                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  background:
                                    cfg.dot,
                                }}
                              />

                              <span
                                className="text-xs font-semibold"
                                style={{
                                  color:
                                    cfg.color,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </div>

                            <span
                              className="text-xs font-mono"
                              style={{
                                color:
                                  '#4A5568',
                              }}
                            >
                              {count}
                            </span>
                          </div>

                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{
                              background:
                                'rgba(255,255,255,0.04)',
                            }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background:
                                  cfg.dot,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                <div
                  className="mt-5 pt-4"
                  style={{
                    borderTop:
                      '1px solid rgba(212,175,55,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs"
                      style={{
                        color: '#4A5568',
                      }}
                    >
                      Taux d'activation
                    </span>

                    <span
                      className="text-sm font-bold"
                      style={{
                        color: '#68D391',
                      }}
                    >
                      {companies.length > 0
                        ? `${Math.round(
                            (kpis.active /
                              companies.length) *
                              100
                          )}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* REVENUE TABLE */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
                border:
                  '1px solid rgba(212,175,55,0.12)',
              }}
            >
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  borderBottom:
                    '1px solid rgba(212,175,55,0.08)',
                }}
              >
                <p className="text-sm font-bold text-white">
                  Revenus par Entreprise
                </p>

                <span
                  className="text-xs font-mono"
                  style={{
                    color: '#2D3748',
                  }}
                >
                  subscription_payments
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        background:
                          'rgba(212,175,55,0.03)',
                        borderBottom:
                          '1px solid rgba(212,175,55,0.08)',
                      }}
                    >
                      {[
                        'Entreprise',
                        'Statut',
                        'Prospecteurs',
                        'MRR',
                        'Revenu Cumulé',
                      ].map((header) => (
                        <th
                          key={header}
                          className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{
                            color: '#4A5568',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map(
                      (company, index) => {
                        const cfg =
                          STATUS_CONFIG[
                            company.status
                          ];

                        return (
                          <tr
                            key={company.id}
                            style={{
                              borderBottom:
                                index <
                                companies.length -
                                  1
                                  ? '1px solid rgba(255,255,255,0.03)'
                                  : 'none',
                            }}
                          >
                            <td className="px-5 py-3.5">
                              <p className="text-white font-semibold text-sm">
                                {company.name}
                              </p>

                              <p
                                className="text-xs"
                                style={{
                                  color:
                                    '#4A5568',
                                }}
                              >
                                {company.email}
                              </p>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className="text-xs px-2.5 py-1 rounded-full font-semibold"
                                style={{
                                  color:
                                    cfg.color,
                                  background:
                                    cfg.bg,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className="text-sm font-bold"
                                style={{
                                  color:
                                    '#A0AEC0',
                                }}
                              >
                                {
                                  company.prospectorCount
                                }
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className="text-xs font-mono"
                                style={{
                                  color:
                                    '#D4AF37',
                                }}
                              >
                                {formatFCFA(
                                  company.mrr
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              <span
                                className="text-xs font-mono font-bold"
                                style={{
                                  color:
                                    company.totalRevenue >
                                    0
                                      ? '#68D391' :'#2D3748',
                                }}
                              >
                                {formatFCFA(
                                  company.totalRevenue
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ENTERPRISES */}
        {activeView === 'enterprises' && (
          <>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Registre des Entreprises
              </h1>

              <p
                className="text-xs mt-1"
                style={{ color: '#4A5568' }}
              >
                {loading
                  ? 'Chargement…'
                  : `${companies.length} entreprises — ${kpis.active} actives — ${kpis.trial} en essai`}
              </p>
            </div>

            {/* FILTER BAR */}
            <div
              className="rounded-xl p-4 flex flex-wrap items-center gap-3"
              style={{
                background: '#0A1628',
                border:
                  '1px solid rgba(212,175,55,0.08)',
              }}
            >
              <div className="relative flex-1 min-w-[200px]">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: '#4A5568' }}
                >
                  🔍
                </span>

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher par nom, ID ou email…"
                  className="w-full pl-8 pr-4 py-2 rounded-lg text-xs text-white outline-none"
                  style={{
                    background:
                      'rgba(255,255,255,0.03)',
                    border:
                      '1px solid rgba(212,175,55,0.12)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    'Tous',
                    'active',
                    'trial',
                    'suspendu',
                    'expired',
                    'pending',
                  ] as FilterStatus[]
                ).map((status) => {
                  const labels: Record<
                    FilterStatus,
                    string
                  > = {
                    Tous: 'Tous',
                    active: '✅ Actif',
                    trial: '⏳ Essai',
                    suspendu:
                      '🚫 Suspendu',
                    expired:
                      '⚠️ Expiré',
                    pending:
                      '🕐 En attente',
                  };

                  return (
                    <button
                      key={status}
                      onClick={() =>
                        setFilterStatus(
                          status
                        )
                      }
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                      style={{
                        background:
                          filterStatus ===
                          status
                            ? 'rgba(212,175,55,0.15)'
                            : 'transparent',
                        color:
                          filterStatus ===
                          status
                            ? '#D4AF37' :'#4A5568',
                        border:
                          filterStatus ===
                          status
                            ? '1px solid rgba(212,175,55,0.3)'
                            : '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {labels[status]}

                      {status !== 'Tous' && (
                        <span
                          className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-mono"
                          style={{
                            background:
                              'rgba(255,255,255,0.06)',
                            color:
                              '#718096',
                          }}
                        >
                          {
                            statusCounts[
                              status
                            ]
                          }
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <span
                className="text-xs ml-auto font-mono"
                style={{ color: '#2D3748' }}
              >
                {filtered.length} /{' '}
                {companies.length}
              </span>
            </div>

            {/* MASTER TABLE */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
                border:
                  '1px solid rgba(212,175,55,0.12)',
                boxShadow:
                  '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  borderBottom:
                    '1px solid rgba(212,175,55,0.08)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-4 rounded-full"
                    style={{
                      background:
                        'linear-gradient(180deg, #D4AF37, #A8860C)',
                    }}
                  />

                  <p className="text-sm font-bold text-white">
                    Panneau de Contrôle Maître
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      background:
                        '#68D391',
                    }}
                  />

                  <span
                    className="text-xs font-mono"
                    style={{
                      color: '#2D3748',
                    }}
                  >
                    Kill-Switch Activé
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        background:
                          'rgba(212,175,55,0.03)',
                        borderBottom:
                          '1px solid rgba(212,175,55,0.08)',
                      }}
                    >
                      {[
                        'Entreprise',
                        'Email Admin',
                        'Inscription',
                        'Statut',
                        'Essai',
                        'Prospecteurs',
                        'MRR',
                        'Kill-Switch',
                      ].map((header) => (
                        <th
                          key={header}
                          className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                          style={{
                            color: '#4A5568',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      Array.from({
                        length: 5,
                      }).map((_, row) => (
                        <tr key={row}>
                          {Array.from({
                            length: 8,
                          }).map(
                            (_, column) => (
                              <td
                                key={column}
                                className="px-5 py-4"
                              >
                                <div className="h-4 bg-gray-800 rounded animate-pulse" />
                              </td>
                            )
                          )}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-16 text-xs"
                          style={{
                            color:
                              '#2D3748',
                          }}
                        >
                          {companies.length ===
                          0
                            ? '🏢 Aucune entreprise inscrite pour le moment.' :'🔍 Aucune entreprise ne correspond aux filtres actuels.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map(
                        (
                          company,
                          index
                        ) => {
                          const cfg =
                            STATUS_CONFIG[
                              company.status
                            ];

                          const isToggling =
                            toggling ===
                            company.id;

                          const isActive =
                            company.status ===
                            'active';

                          const isTrial =
                            company.status ===
                            'trial';

                          return (
                            <tr
                              key={
                                company.id
                              }
                              className="transition-colors hover:bg-white/[0.01]"
                              style={{
                                borderBottom:
                                  index <
                                  filtered.length -
                                    1
                                    ? '1px solid rgba(255,255,255,0.03)'
                                    : 'none',
                              }}
                            >
                              {/* ENTREPRISE */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                                    style={{
                                      background: `${cfg.color}18`,
                                      border: `1px solid ${cfg.color}30`,
                                      color:
                                        cfg.color,
                                    }}
                                  >
                                    {company.name
                                      .slice(
                                        0,
                                        2
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <div>
                                    <p className="text-white font-semibold text-sm whitespace-nowrap">
                                      {
                                        company.name
                                      }
                                    </p>

                                    <p
                                      className="text-xs font-mono"
                                      style={{
                                        color:
                                          '#2D3748',
                                      }}
                                    >
                                      #
                                      {company.id
                                        .slice(
                                          0,
                                          8
                                        )
                                        .toUpperCase()}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* EMAIL */}
                              <td className="px-5 py-4">
                                <p
                                  className="text-xs"
                                  style={{
                                    color:
                                      '#718096',
                                  }}
                                >
                                  {
                                    company.email
                                  }
                                </p>
                              </td>

                              {/* INSCRIPTION */}
                              <td className="px-5 py-4">
                                <p
                                  className="text-xs font-mono"
                                  style={{
                                    color:
                                      '#4A5568',
                                  }}
                                >
                                  {new Date(
                                    company.created_at
                                  ).toLocaleDateString(
                                    'fr-FR'
                                  )}
                                </p>
                              </td>

                              {/* STATUS */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                      background:
                                        cfg.dot,
                                      boxShadow:
                                        `0 0 6px ${cfg.glow}`,
                                    }}
                                  />

                                  <span
                                    className="text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap"
                                    style={{
                                      color:
                                        cfg.color,
                                      background:
                                        cfg.bg,
                                    }}
                                  >
                                    {
                                      cfg.label
                                    }
                                  </span>
                                </div>
                              </td>

                              {/* ESSAI */}
                              <td className="px-5 py-4">
                                {isTrial ? (
                                  <TrialProgressBar
                                    trialEndDate={
                                      company.trialEndDate
                                    }
                                    trialStartDate={
                                      company.trialStartDate
                                    }
                                  />
                                ) : (
                                  <span
                                    className="text-xs"
                                    style={{
                                      color:
                                        '#2D3748',
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>

                              {/* PROSPECTEURS */}
                              <td className="px-5 py-4 text-center">
                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color:
                                      '#A0AEC0',
                                  }}
                                >
                                  {
                                    company.prospectorCount
                                  }
                                </span>
                              </td>

                              {/* MRR */}
                              <td className="px-5 py-4">
                                <span
                                  className="text-xs font-mono font-semibold"
                                  style={{
                                    color:
                                      '#D4AF37',
                                  }}
                                >
                                  {formatFCFA(
                                    company.mrr
                                  )}
                                </span>
                              </td>

                              {/* KILL SWITCH */}
                              <td className="px-5 py-4">
                                <KillSwitchToggle
                                  isActive={
                                    isActive
                                  }
                                  isLoading={
                                    isToggling
                                  }
                                  onActivate={() =>
                                    setConfirmAction(
                                      {
                                        id: company.id,
                                        action:
                                          'activate',
                                        name: company.name,
                                      }
                                    )
                                  }
                                  onSuspend={() =>
                                    setConfirmAction(
                                      {
                                        id: company.id,
                                        action:
                                          'suspend',
                                        name: company.name,
                                      }
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{
                  borderTop:
                    '1px solid rgba(212,175,55,0.06)',
                }}
              >
                <p
                  className="text-xs"
                  style={{
                    color: '#2D3748',
                  }}
                >
                  {filtered.length} sur{' '}
                  {companies.length}{' '}
                  entreprises affichées
                </p>

                <p
                  className="text-xs font-mono"
                  style={{
                    color: '#2D3748',
                  }}
                >
                  Données temps réel — Supabase
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{
            background:
              'rgba(0,0,0,0.75)',
            backdropFilter:
              'blur(6px)',
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background:
                'linear-gradient(135deg, #0A1628 0%, #0D1E35 100%)',
              border:
                confirmAction.action ===
                'activate' ?'1px solid rgba(212,175,55,0.3)' :'1px solid rgba(252,129,129,0.3)',
              boxShadow:
                '0 24px 80px rgba(0,0,0,0.9)',
            }}
          >
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{
                  background:
                    confirmAction.action ===
                    'activate' ?'rgba(212,175,55,0.1)' :'rgba(252,129,129,0.1)',
                  border:
                    confirmAction.action ===
                    'activate' ?'1px solid rgba(212,175,55,0.3)' :'1px solid rgba(252,129,129,0.3)',
                }}
              >
                {confirmAction.action ===
                'activate' ?'✅' :'🚫'}
              </div>

              <h3 className="text-white font-bold text-base">
                {confirmAction.action ===
                'activate' ? "Activer l'accès" :"Suspendre l'accès"}
              </h3>

              <p
                className="text-xs mt-2"
                style={{
                  color: '#718096',
                }}
              >
                Cette action modifiera
                immédiatement le statut de :
              </p>

              <p
                className="text-sm font-bold mt-1.5 px-3 py-1.5 rounded-lg inline-block"
                style={{
                  color:
                    confirmAction.action ===
                    'activate' ?'#D4AF37' :'#FC8181',
                  background:
                    confirmAction.action ===
                    'activate' ?'rgba(212,175,55,0.08)' :'rgba(252,129,129,0.08)',
                }}
              >
                {confirmAction.name}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmAction(null)
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{
                  color: '#718096',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                  background:
                    'rgba(255,255,255,0.03)',
                }}
              >
                Annuler
              </button>

              <button
                onClick={() =>
                  executeToggle(
                    confirmAction.id,
                    confirmAction.action
                  )
                }
                disabled={
                  toggling ===
                  confirmAction.id
                }
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90 disabled:opacity-60"
                style={{
                  background:
                    confirmAction.action ===
                    'activate' ?'linear-gradient(135deg, #D4AF37, #A8860C)' :'rgba(252,129,129,0.15)',
                  color:
                    confirmAction.action ===
                    'activate' ?'#000' :'#FC8181',
                  border:
                    confirmAction.action ===
                    'activate' ?'1px solid rgba(212,175,55,0.5)' :'1px solid rgba(252,129,129,0.4)',
                  boxShadow:
                    confirmAction.action ===
                    'activate' ?'0 4px 16px rgba(212,175,55,0.3)' :'none',
                }}
              >
                {toggling ===
                confirmAction.id
                  ? 'En cours…'
                  : confirmAction.action ===
                      'activate' ? "⚡ Confirmer l'activation" :'🚫 Confirmer la suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}