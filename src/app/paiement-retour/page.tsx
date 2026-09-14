'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

type VerificationState =
  | 'verifying'
  | 'success' |'pending' |'cancelled' |'error';

interface VerificationResponse {
  success?: boolean;
  verified?: boolean;
  paid?: boolean;
  status?: string;
  message?: string;
  error?: string;
  organizationId?: string;
  subscriptionId?: string;
  planCode?: string;
  transactionId?: string | number;
  transactionStatus?: string;
  startedAt?: string;
  expiresAt?: string;
}

function PaiementRetourContent() {
  const searchParams = useSearchParams();

  const [state, setState] =
    useState<VerificationState>('verifying');

  const [result, setResult] =
    useState<VerificationResponse | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string>('');

  const status =
    searchParams.get('status')?.toLowerCase() || '';

  const organizationId =
    searchParams.get('organization_id') || '';

  const subscriptionId =
    searchParams.get('subscription_id') || '';

  /*
   * FedaPay peut utiliser différents paramètres selon
   * le flux de redirection. On accepte plusieurs noms
   * sans jamais considérer leur valeur comme une preuve
   * de paiement.
   */
  const transactionId =
    searchParams.get('id') ||
    searchParams.get('transaction_id') ||
    searchParams.get('transactionId') ||
    '';

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      /*
       * Sans ces identifiants, impossible de vérifier
       * le paiement côté serveur.
       */
      if (!organizationId || !subscriptionId) {
        if (!cancelled) {
          setState('error');
          setErrorMessage(
            'Les informations nécessaires à la vérification du paiement sont incomplètes.',
          );
        }
        return;
      }

      /*
       * Une transaction FedaPay est indispensable pour
       * effectuer la vérification serveur.
       */
      if (!transactionId) {
        /*
         * Si FedaPay indique explicitement une annulation
         * mais ne fournit pas d'identifiant, on peut afficher
         * l'état annulé sans jamais prétendre que le paiement
         * est réussi.
         */
        if (
          status === 'canceled' ||
          status === 'cancelled' ||
          status === 'declined' ||
          status === 'failed'
        ) {
          if (!cancelled) {
            setState('cancelled');
          }
          return;
        }

        if (!cancelled) {
          setState('pending');
          setErrorMessage(
            'La transaction FedaPay n’a pas encore été identifiée. Vous pouvez réessayer la vérification.',
          );
        }

        return;
      }

      try {
        const response = await fetch(
          '/api/subscriptions/verify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transactionId,
              organizationId,
              subscriptionId,
            }),
            cache: 'no-store',
          },
        );

        const data =
          (await response.json()) as VerificationResponse;

        if (cancelled) {
          return;
        }

        setResult(data);

        /*
         * IMPORTANT :
         * Seul "paid === true" retourné par notre serveur
         * après vérification FedaPay permet d'afficher
         * le paiement confirmé.
         */
        if (
          response.ok &&
          data.success === true &&
          data.verified === true &&
          data.paid === true
        ) {
          setState('success');
          return;
        }

        /*
         * Paiement encore en traitement.
         */
        if (
          data.verified === true &&
          data.paid === false
        ) {
          const transactionStatus =
            data.status?.toLowerCase() || '';

          if (
            transactionStatus === 'canceled' ||
            transactionStatus === 'cancelled' ||
            transactionStatus === 'declined' ||
            transactionStatus === 'failed' ||
            transactionStatus === 'refunded'
          ) {
            setState('cancelled');
          } else {
            setState('pending');
          }

          return;
        }

        setState('error');
        setErrorMessage(
          data.error ||
            data.message ||
            'La vérification du paiement n’a pas pu être finalisée.',
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          '[JDV CRM] Erreur vérification paiement:',
          error,
        );

        setState('error');
        setErrorMessage(
          'Impossible de contacter le serveur de vérification. Votre paiement n’est pas considéré comme confirmé.',
        );
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [
    organizationId,
    subscriptionId,
    transactionId,
    status,
  ]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#0B1B3D',
      }}
    >
      <div className="w-full max-w-md text-center">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <AppLogo size={48} />
        </div>

        {/* =====================================================
            VÉRIFICATION EN COURS
           ===================================================== */}
        {state === 'verifying' && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(212,175,55,0.3)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'rgba(212,175,55,0.1)',
              }}
            >
              <Loader2
                size={32}
                className="animate-spin"
                style={{
                  color: '#D4AF37',
                }}
              />
            </div>

            <h1 className="text-white text-2xl font-bold mb-3">
              Vérification du paiement
            </h1>

            <p
              className="text-sm"
              style={{
                color: '#A0AEC0',
              }}
            >
              Nous vérifions votre transaction auprès
              de FedaPay. Ne fermez pas cette page.
            </p>

            <div
              className="flex items-center justify-center gap-2 mt-6 text-xs"
              style={{
                color: '#718096',
              }}
            >
              <ShieldCheck size={15} />
              Vérification sécurisée côté serveur
            </div>
          </div>
        )}

        {/* =====================================================
            PAIEMENT CONFIRMÉ
           ===================================================== */}
        {state === 'success' && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(72,187,120,0.3)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'rgba(72,187,120,0.15)',
              }}
            >
              <CheckCircle2
                size={32}
                style={{
                  color: '#68D391',
                }}
              />
            </div>

            <h1 className="text-white text-2xl font-bold mb-3">
              Paiement Confirmé !
            </h1>

            <p
              className="text-sm mb-6"
              style={{
                color: '#A0AEC0',
              }}
            >
              Votre paiement JDV CRM a été vérifié
              avec succès. Votre abonnement est
              maintenant actif.
            </p>

            {/* ORGANISATION */}
            {organizationId && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{
                    color: '#718096',
                  }}
                >
                  Organisation
                </p>

                <p
                  className="text-xs font-mono break-all"
                  style={{
                    color: '#A0AEC0',
                  }}
                >
                  {organizationId}
                </p>
              </div>
            )}

            {/* FORFAIT */}
            {result?.planCode && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{
                  background:
                    'rgba(212,175,55,0.06)',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{
                    color: '#718096',
                  }}
                >
                  Forfait
                </p>

                <p
                  className="text-sm font-bold"
                  style={{
                    color: '#D4AF37',
                  }}
                >
                  {result.planCode}
                </p>
              </div>
            )}

            {/* EXPIRATION */}
            {result?.expiresAt && (
              <div
                className="rounded-xl p-3 mb-6"
                style={{
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{
                    color: '#718096',
                  }}
                >
                  Abonnement valable jusqu&apos;au
                </p>

                <p
                  className="text-sm font-semibold"
                  style={{
                    color: '#FFFFFF',
                  }}
                >
                  {new Date(
                    result.expiresAt,
                  ).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}

            <div
              className="rounded-xl p-4 mb-6"
              style={{
                background:
                  'rgba(212,175,55,0.08)',
                border:
                  '1px solid rgba(212,175,55,0.2)',
              }}
            >
              <p
                className="text-xs"
                style={{
                  color: '#D4AF37',
                }}
              >
                Votre espace entreprise est maintenant
                disponible. Vous pouvez vous connecter
                au portail administrateur.
              </p>
            </div>

            <Link
              href="/business/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background:
                  'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: '#0B1B3D',
              }}
            >
              Accéder au Portail Entreprise
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* =====================================================
            PAIEMENT EN ATTENTE
           ===================================================== */}
        {state === 'pending' && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(246,224,94,0.3)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'rgba(246,224,94,0.1)',
              }}
            >
              <Clock
                size={32}
                style={{
                  color: '#F6E05E',
                }}
              />
            </div>

            <h1 className="text-white text-2xl font-bold mb-3">
              Paiement en Attente
            </h1>

            <p
              className="text-sm mb-6"
              style={{
                color: '#A0AEC0',
              }}
            >
              FedaPay n’a pas encore confirmé votre
              paiement. Votre abonnement reste en
              attente d’activation.
            </p>

            {organizationId && (
              <div
                className="rounded-xl p-3 mb-6"
                style={{
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{
                    color: '#718096',
                  }}
                >
                  Organisation
                </p>

                <p
                  className="text-xs font-mono break-all"
                  style={{
                    color: '#A0AEC0',
                  }}
                >
                  {organizationId}
                </p>
              </div>
            )}

            <Link
              href="/business/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background:
                  'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: '#0B1B3D',
              }}
            >
              Retour au Portail
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* =====================================================
            PAIEMENT ANNULÉ / REFUSÉ
           ===================================================== */}
        {state === 'cancelled' && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(252,129,129,0.3)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'rgba(252,129,129,0.1)',
              }}
            >
              <XCircle
                size={32}
                style={{
                  color: '#FC8181',
                }}
              />
            </div>

            <h1 className="text-white text-2xl font-bold mb-3">
              Paiement Annulé ou Refusé
            </h1>

            <p
              className="text-sm mb-6"
              style={{
                color: '#A0AEC0',
              }}
            >
              FedaPay indique que le paiement n’a pas
              été validé. Votre organisation reste
              inactive et aucun accès payant n’a été
              activé.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background:
                  'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: '#0B1B3D',
              }}
            >
              Retour à l&apos;Accueil
            </Link>
          </div>
        )}

        {/* =====================================================
            ERREUR DE VÉRIFICATION
           ===================================================== */}
        {state === 'error' && (
          <div
            className="rounded-2xl p-8"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(252,129,129,0.3)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'rgba(252,129,129,0.1)',
              }}
            >
              <XCircle
                size={32}
                style={{
                  color: '#FC8181',
                }}
              />
            </div>

            <h1 className="text-white text-2xl font-bold mb-3">
              Vérification impossible
            </h1>

            <p
              className="text-sm mb-6"
              style={{
                color: '#A0AEC0',
              }}
            >
              {errorMessage ||
                'Nous ne pouvons pas confirmer votre paiement pour le moment.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                style={{
                  background:
                    'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                  color: '#0B1B3D',
                }}
              >
                Réessayer
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                style={{
                  background:
                    'rgba(255,255,255,0.06)',
                  color: '#FFFFFF',
                  border:
                    '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaiementRetourPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background: '#0B1B3D',
          }}
        >
          <div className="flex items-center gap-2 text-white text-sm">
            <Loader2
              size={18}
              className="animate-spin"
            />
            Vérification du paiement...
          </div>
        </div>
      }
    >
      <PaiementRetourContent />
    </Suspense>
  );
}