'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TrialStatus {
  status: string;
  daysRemaining: number | null;
  organizationId: string | null;
  organizationName: string;
  subscriptionId: string | null;
  planName: string | null;
  expiresAt: string | null;
}

type PlanCode =
  | 'MONTHLY' |'QUARTERLY' |'SEMESTER' |'ANNUAL';

interface Plan {
  id: PlanCode;
  name: string;
  price: string;
  period: string;
  duration: string;
  features: string[];
  color: string;
  recommended?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'MONTHLY',
    name: 'Mensuel',
    price: '50',
    period: 'USD / mois',
    duration: '30 jours',
    features: [
      "Jusqu'à 5 prospecteurs",
      'Tableau de bord administrateur',
      'Gestion des prospects',
      'Gestion des ventes',
      'Gestion des stocks',
      'Rapports et statistiques',
    ],
    color: '#63B3ED',
  },
  {
    id: 'QUARTERLY',
    name: 'Trimestriel',
    price: '150',
    period: 'USD / 3 mois',
    duration: '90 jours',
    features: [
      "Jusqu'à 10 prospecteurs",
      'Toutes les fonctions du plan mensuel',
      'Analytics avancés',
      'Suivi des commissions',
      'Gestion terrain',
      'Rapports avancés',
    ],
    color: '#68D391',
  },
  {
    id: 'SEMESTER',
    name: 'Semestriel',
    price: '300',
    period: 'USD / 6 mois',
    duration: '180 jours',
    features: [
      'Jusqu’à 25 prospecteurs',
      'Toutes les fonctions avancées',
      'Analytics complets',
      'Gestion commerciale avancée',
      'Support prioritaire',
      'Suivi financier',
    ],
    color: '#B794F4',
  },
  {
    id: 'ANNUAL',
    name: 'Annuel',
    price: '600',
    period: 'USD / an',
    duration: '365 jours',
    features: [
      'Prospecteurs selon abonnement',
      'Toutes les fonctions JDV CRM',
      'Analytics avancés',
      'Gestion complète du réseau',
      'Support prioritaire',
      'Accès aux évolutions JDV CRM',
    ],
    color: '#D4AF37',
    recommended: true,
  },
];

function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;

  const expiration = new Date(expiresAt).getTime();

  if (Number.isNaN(expiration)) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (expiration - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

function normalizeStatus(
  organizationStatus: unknown,
  subscriptionStatus: unknown,
  subscriptionExpiresAt: string | null
): string {
  const orgStatus = String(
    organizationStatus ?? ''
  ).toLowerCase();

  const subStatus = String(
    subscriptionStatus ?? ''
  ).toLowerCase();

  if (
    orgStatus === 'suspended' ||
    orgStatus === 'suspendu' ||
    subStatus === 'suspended' ||
    subStatus === 'suspendu'
  ) {
    return 'suspended';
  }

  if (
    subStatus === 'active' ||
    orgStatus === 'active'
  ) {
    if (
      subscriptionExpiresAt &&
      new Date(subscriptionExpiresAt).getTime() <
        Date.now()
    ) {
      return 'expired';
    }

    return 'active';
  }

  if (
    subStatus === 'trial' ||
    subStatus === 'trialing'
  ) {
    if (
      subscriptionExpiresAt &&
      new Date(subscriptionExpiresAt).getTime() <
        Date.now()
    ) {
      return 'expired';
    }

    return 'trial';
  }

  if (
    subStatus === 'expired' ||
    orgStatus === 'expired'
  ) {
    return 'expired';
  }

  if (
    subStatus === 'pending' ||
    orgStatus === 'pending'
  ) {
    return 'pending';
  }

  return 'inactive';
}

export default function PaymentWallContent() {
  const router = useRouter();

  const [trialStatus, setTrialStatus] =
    useState<TrialStatus>({
      status: 'loading',
      daysRemaining: null,
      organizationId: null,
      organizationName: '',
      subscriptionId: null,
      planName: null,
      expiresAt: null,
    });

  const [selectedPlan, setSelectedPlan] =
    useState<PlanCode>('MONTHLY');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState('');

  /*
   * =====================================================
   * CHARGEMENT DE L'ORGANISATION ET DE L'ABONNEMENT
   * =====================================================
   */
  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      const supabase = createClient();

      try {
        /*
         * 1. Utilisateur connecté
         */
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (
          authError ||
          !user
        ) {
          router.replace('/business/login');
          return;
        }

        /*
         * 2. Recherche de l'organisation via
         *    organization_members
         */
        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from('organization_members')
          .select(
            'organization_id, role, status'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (
          membershipError ||
          !membership?.organization_id
        ) {
          router.replace('/business/login');
          return;
        }

        /*
         * Le Payment Wall concerne le portail
         * administrateur entreprise.
         */
        const role = String(
          membership.role ?? ''
        ).toLowerCase();

        if (
          role !== 'business_admin' &&
          role !== 'admin' &&
          role !== 'administrator'
        ) {
          router.replace('/business/login');
          return;
        }

        const organizationId =
          membership.organization_id;

        /*
         * 3. Chargement de l'organisation
         */
        const {
          data: organization,
          error: organizationError,
        } = await supabase
          .from('organizations')
          .select(
            'id, name, status, subscription_status'
          )
          .eq('id', organizationId)
          .maybeSingle();

        if (
          organizationError ||
          !organization
        ) {
          router.replace('/business/login');
          return;
        }

        /*
         * 4. Chargement des abonnements
         *
         * On récupère le plus récent.
         */
        const {
          data: subscriptions,
          error: subscriptionError,
        } = await supabase
          .from('organization_subscriptions')
          .select(
            'id, organization_id, plan_id, status, started_at, expires_at, created_at'
          )
          .eq(
            'organization_id',
            organizationId
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(1);

        if (subscriptionError) {
          console.error(
            'Subscription lookup error:',
            subscriptionError
          );
        }

        const subscription =
          subscriptions?.[0] ?? null;

        /*
         * 5. Recherche du nom du plan
         */
        let planName: string | null = null;

        if (subscription?.plan_id) {
          const { data: plan } =
            await supabase
              .from('subscription_plans')
              .select(
                'id, code, name'
              )
              .eq(
                'id',
                subscription.plan_id
              )
              .maybeSingle();

          planName =
            plan?.name ?? null;
        }

        /*
         * 6. Calcul du statut
         */
        const expiresAt =
          subscription?.expires_at ?? null;

        const status = normalizeStatus(
          organization.status,
          subscription?.status ??
            organization.subscription_status,
          expiresAt
        );

        /*
         * 7. Organisation active
         */
        if (status === 'active') {
          router.replace(
            '/business/dashboard'
          );
          return;
        }

        const daysRemaining =
          getDaysRemaining(expiresAt);

        if (!mounted) return;

        setTrialStatus({
          status,
          daysRemaining,
          organizationId,
          organizationName:
            organization.name ?? '',
          subscriptionId:
            subscription?.id ?? null,
          planName,
          expiresAt,
        });
      } catch (err) {
        console.error(
          'Payment wall status error:',
          err
        );

        if (!mounted) return;

        setError(
          'Impossible de vérifier votre abonnement. Veuillez réessayer.'
        );

        setTrialStatus((current) => ({
          ...current,
          status: 'error',
        }));
      }
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
   * =====================================================
   * PAIEMENT
   * =====================================================
   */
  const handlePayment = async () => {
    if (!trialStatus.organizationId) {
      setError(
        'Organisation introuvable. Veuillez vous reconnecter.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      /*
       * Nouveau contrat frontend/backend :
       *
       * organizationId
       * planCode
       *
       * Le backend devra créer le paiement,
       * enregistrer subscription_payments puis
       * rediriger vers le prestataire.
       */
      const response = await fetch(
        '/api/subscriptions/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId:
              trialStatus.organizationId,
            planCode: selectedPlan,
          }),
        }
      );

      let data: {
        checkoutUrl?: string;
        error?: string;
      } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            'Impossible de créer le paiement.'
        );
      }

      if (data.checkoutUrl) {
        window.location.href =
          data.checkoutUrl;
        return;
      }

      throw new Error(
        data.error ??
          'Impossible de créer le lien de paiement. Réessayez.'
      );
    } catch (err: unknown) {
      console.error(
        'Checkout error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Erreur de connexion. Vérifiez votre connexion internet.'
      );

      setLoading(false);
    }
  };

  /*
   * =====================================================
   * DÉCONNEXION
   * =====================================================
   */
  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace('/business/login');
  };

  /*
   * =====================================================
   * CHARGEMENT
   * =====================================================
   */
  if (
    trialStatus.status === 'loading'
  ) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#0B1B3D',
        }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
            style={{
              borderColor: '#D4AF37',
              borderTopColor:
                'transparent',
            }}
          />

          <p
            className="text-xs"
            style={{
              color: '#A0AEC0',
            }}
          >
            Vérification de votre
            abonnement…
          </p>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */
  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0B1B3D',
      }}
    >
      {/* HEADER */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          borderBottom:
            '1px solid rgba(212,175,55,0.15)',
        }}
      >
        <div
          style={{
            background:
              'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
            WebkitBackgroundClip:
              'text',
            WebkitTextFillColor:
              'transparent',
            fontWeight: 800,
            fontSize: '1.1rem',
            letterSpacing:
              '0.1em',
          }}
        >
          JDV CRM
        </div>

        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{
            color: '#A0AEC0',
            border:
              '1px solid rgba(160,174,192,0.2)',
          }}
        >
          Déconnexion
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* ORGANISATION */}
        {trialStatus.organizationName && (
          <div className="text-center mb-6">
            <p
              className="text-xs uppercase tracking-widest"
              style={{
                color: '#718096',
              }}
            >
              Espace entreprise
            </p>

            <p className="text-white font-semibold mt-1">
              {trialStatus.organizationName}
            </p>
          </div>
        )}

        {/* =========================
            ESSAI
           ========================= */}
        {trialStatus.status ===
          'trial' &&
          trialStatus.daysRemaining !==
            null && (
            <div
              className="rounded-2xl p-5 mb-8 text-center"
              style={{
                background:
                  trialStatus.daysRemaining <=
                  3
                    ? 'rgba(252,129,129,0.08)'
                    : 'rgba(183,148,244,0.08)',
                border:
                  trialStatus.daysRemaining <=
                  3
                    ? '1px solid rgba(252,129,129,0.3)'
                    : '1px solid rgba(183,148,244,0.3)',
              }}
            >
              <p className="text-2xl mb-2">
                {trialStatus.daysRemaining <=
                3
                  ? '⚠️' :'⏳'}
              </p>

              <p className="font-bold text-white text-lg">
                {trialStatus.daysRemaining ===
                0
                  ? "Votre essai expire aujourd'hui !"
                  : `Il vous reste ${trialStatus.daysRemaining} jour${
                      trialStatus.daysRemaining >
                      1
                        ? 's' :''
                    } d'essai gratuit`}
              </p>

              <p
                className="text-xs mt-1"
                style={{
                  color: '#A0AEC0',
                }}
              >
                Souscrivez maintenant
                pour conserver l&apos;accès
                à votre espace JDV CRM.
              </p>
            </div>
          )}

        {/* =========================
            EXPIRÉ
           ========================= */}
        {trialStatus.status ===
          'expired' && (
          <div
            className="rounded-2xl p-5 mb-8 text-center"
            style={{
              background:
                'rgba(252,129,129,0.08)',
              border:
                '1px solid rgba(252,129,129,0.3)',
            }}
          >
            <p className="text-2xl mb-2">
              🔒
            </p>

            <p className="font-bold text-white text-lg">
              Votre abonnement a expiré
            </p>

            <p
              className="text-xs mt-1"
              style={{
                color: '#FC8181',
              }}
            >
              Choisissez un plan pour
              réactiver l&apos;accès à votre
              organisation.
            </p>
          </div>
        )}

        {/* =========================
            SUSPENDU
           ========================= */}
        {trialStatus.status ===
          'suspended' && (
          <div
            className="rounded-2xl p-5 mb-8 text-center"
            style={{
              background:
                'rgba(252,129,129,0.08)',
              border:
                '1px solid rgba(252,129,129,0.3)',
            }}
          >
            <p className="text-2xl mb-2">
              🚫
            </p>

            <p className="font-bold text-white text-lg">
              Compte suspendu
            </p>

            <p
              className="text-xs mt-1"
              style={{
                color: '#FC8181',
              }}
            >
              Votre organisation a été
              suspendue. Contactez le
              support JDV CRM pour obtenir
              plus d&apos;informations.
            </p>
          </div>
        )}

        {/* =========================
            PENDING / INACTIF
           ========================= */}
        {(trialStatus.status ===
          'pending' ||
          trialStatus.status ===
            'inactive') && (
          <div
            className="rounded-2xl p-5 mb-8 text-center"
            style={{
              background:
                'rgba(246,224,94,0.06)',
              border:
                '1px solid rgba(246,224,94,0.2)',
            }}
          >
            <p className="text-2xl mb-2">
              ⏳
            </p>

            <p className="font-bold text-white text-lg">
              Activation de votre espace
            </p>

            <p
              className="text-xs mt-1"
              style={{
                color: '#A0AEC0',
              }}
            >
              Sélectionnez un abonnement
              ci-dessous pour activer votre
              espace JDV CRM.
            </p>
          </div>
        )}

        {/* TITRE */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Choisissez votre Plan
          </h1>

          <p
            className="text-sm"
            style={{
              color: '#718096',
            }}
          >
            Choisissez la durée d&apos;abonnement
            adaptée à votre entreprise.
          </p>
        </div>

        {/* PLANS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() =>
                setSelectedPlan(
                  plan.id
                )
              }
              className="text-left rounded-2xl p-6 transition-all relative"
              style={{
                background:
                  selectedPlan ===
                  plan.id
                    ? 'rgba(212,175,55,0.06)'
                    : '#0F2347',

                border:
                  selectedPlan ===
                  plan.id
                    ? `2px solid ${plan.color}`
                    : '2px solid rgba(255,255,255,0.06)',

                boxShadow:
                  selectedPlan ===
                  plan.id
                    ? `0 0 20px ${plan.color}20`
                    : 'none',
              }}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap"
                    style={{
                      background:
                        '#D4AF37',
                      color: '#000',
                    }}
                  >
                    ★ Recommandé
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-white text-lg">
                    {plan.name}
                  </p>

                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className="text-2xl font-extrabold"
                      style={{
                        color:
                          plan.color,
                      }}
                    >
                      {plan.price}
                    </span>

                    <span
                      className="text-xs"
                      style={{
                        color:
                          '#718096',
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1"
                  style={{
                    borderColor:
                      selectedPlan ===
                      plan.id
                        ? plan.color
                        : 'rgba(255,255,255,0.2)',

                    background:
                      selectedPlan ===
                      plan.id
                        ? plan.color
                        : 'transparent',
                  }}
                >
                  {selectedPlan ===
                    plan.id && (
                    <div className="w-2 h-2 rounded-full bg-black" />
                  )}
                </div>
              </div>

              <p
                className="text-[10px] uppercase tracking-wider mb-4"
                style={{
                  color:
                    '#718096',
                }}
              >
                {plan.duration}
              </p>

              <ul className="space-y-2">
                {plan.features.map(
                  (feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-xs"
                      style={{
                        color:
                          '#A0AEC0',
                      }}
                    >
                      <span
                        style={{
                          color:
                            plan.color,
                        }}
                      >
                        ✓
                      </span>

                      <span>
                        {feature}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </button>
          ))}
        </div>

        {/* MÉTHODES DE PAIEMENT */}
        <div
          className="rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap"
          style={{
            background:
              '#0F2347',
            border:
              '1px solid rgba(212,175,55,0.1)',
          }}
        >
          <p
            className="text-xs font-semibold"
            style={{
              color:
                '#718096',
            }}
          >
            Paiement sécurisé :
          </p>

          {[
            '📱 Mobile Money',
            '💳 Carte Bancaire',
            '🏦 Virement',
          ].map((method) => (
            <span
              key={method}
              className="text-xs px-3 py-1 rounded-full"
              style={{
                background:
                  'rgba(212,175,55,0.08)',
                color:
                  '#D4AF37',
                border:
                  '1px solid rgba(212,175,55,0.15)',
              }}
            >
              {method}
            </span>
          ))}
        </div>

        {/* ERREUR */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm text-center"
            style={{
              color:
                '#FC8181',
              background:
                'rgba(252,129,129,0.1)',
              border:
                '1px solid rgba(252,129,129,0.2)',
            }}
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handlePayment}
          disabled={
            loading ||
            !trialStatus.organizationId
          }
          className="w-full py-4 rounded-2xl font-bold text-base tracking-wider uppercase transition-all active:scale-95"
          style={{
            background:
              loading ||
              !trialStatus.organizationId
                ? 'rgba(212,175,55,0.3)'
                : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',

            color:
              loading ||
              !trialStatus.organizationId
                ? '#D4AF37' :'#0B1B3D',

            boxShadow:
              loading ||
              !trialStatus.organizationId
                ? 'none' :'0 4px 30px rgba(212,175,55,0.4)',
          }}
        >
          {loading
            ? 'Redirection vers le paiement…'
            : `💳 Payer ${
                PLANS.find(
                  (plan) =>
                    plan.id ===
                    selectedPlan
                )?.price ?? '50'
              } USD`}
        </button>

        <p
          className="text-center text-xs mt-4"
          style={{
            color:
              '#4A5568',
          }}
        >
          Paiement sécurisé ·
          Abonnement renouvelable ·
          Support JDV CRM
        </p>
      </div>
    </div>
  );
}
