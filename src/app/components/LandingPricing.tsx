'use client';

import React from 'react';
import { Check, Zap } from 'lucide-react';

const tiers = [
  {
    id: 'tier-monthly',
    code: 'MONTHLY',
    name: 'Mensuel',
    price: '50',
    currency: 'USD',
    period: '/ mois',
    description:
      'La formule flexible pour les entreprises qui souhaitent gérer leur activité sans engagement long terme.',
    highlight: false,
    features: [
      'Gestion complète des prospecteurs',
      'Gestion des prospects et clients',
      'Ventes au comptant et à crédit',
      'Suivi des paiements et échéances',
      'Gestion des stocks',
      'Gestion des commissions',
      'Tableau de bord entreprise',
      'Support standard',
    ],
    cta: 'Commencer',
  },
  {
    id: 'tier-quarterly',
    code: 'QUARTERLY',
    name: 'Trimestriel',
    price: '150',
    currency: 'USD',
    period: '/ 3 mois',
    description:
      'Une formule économique pour les entreprises qui souhaitent planifier leur utilisation sur un trimestre.',
    highlight: true,
    badge: 'Plus Populaire',
    features: [
      'Toutes les fonctionnalités du Mensuel',
      'Gestion complète des équipes',
      'Portefeuille des prospecteurs',
      'Suivi avancé des ventes',
      'Suivi des paiements quotidiens',
      'Suivi des commissions',
      'Gestion et traçabilité du stock',
      'Tableau de bord analytique',
      'Support prioritaire',
    ],
    cta: 'Inscrire Mon Entreprise',
  },
  {
    id: 'tier-semester',
    code: 'SEMESTER',
    name: 'Semestriel',
    price: '300',
    currency: 'USD',
    period: '/ 6 mois',
    description:
      'Pour les entreprises qui souhaitent déployer JDV CRM durablement au sein de leurs équipes.',
    highlight: false,
    features: [
      'Toutes les fonctionnalités du Trimestriel',
      'Gestion multi-équipes',
      'Analyse des performances',
      'Suivi des activités terrain',
      'Gestion avancée du portefeuille clients',
      'Historique des opérations',
      'Notifications et relances',
      'Suivi des stocks et mouvements',
      'Support prioritaire',
    ],
    cta: 'Choisir ce plan',
  },
  {
    id: 'tier-annual',
    code: 'ANNUAL',
    name: 'Annuel',
    price: '600',
    currency: 'USD',
    period: '/ an',
    description:
      'La formule complète pour les entreprises qui veulent une utilisation continue de JDV CRM.',
    highlight: false,
    features: [
      'Toutes les fonctionnalités du Semestriel',
      'Utilisation annuelle continue',
      'Gestion complète des équipes',
      'Prospects, clients et ventes',
      'Paiements et échéanciers',
      'Stocks et mouvements',
      'Commissions et performances',
      'Analytique entreprise',
      'Support prioritaire',
    ],
    cta: 'Choisir le plan annuel',
  },
];

function handleRegister() {
  const button = document.getElementById('open-onboarding');

  if (button instanceof HTMLButtonElement) {
    button?.click();
    return;
  }

  window.location.href = '/business/login';
}

export default function LandingPricing() {
  return (
    <section
      id="pricing"
      className="py-24 px-6 lg:px-10 bg-secondary/30"
    >
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">
              Tarification Transparente
            </span>
          </div>

          <h2 className="text-hero-lg text-foreground mb-4">
            Des plans adaptés à votre{' '}
            <span className="gold-gradient-text">
              entreprise
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choisissez la durée qui correspond à votre activité.
            JDV CRM centralise vos prospects, clients, ventes,
            paiements, stocks, commissions et équipes dans une seule
            plateforme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {tiers?.map((tier) => (
            <div
              key={tier?.id}
              className={`relative flex flex-col rounded-xl p-8 transition-all duration-300 ${
                tier?.highlight
                  ? 'bg-card border-2 border-primary card-glow-gold xl:scale-105' :'bg-card border border-border card-glow hover:border-primary/30'
              }`}
            >
              {tier?.highlight && (
                <>
                  <div
                    className="absolute top-0 left-0 right-0 h-px rounded-t-xl"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, #D4AF37, transparent)',
                    }}
                  />

                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full gold-gradient-bg text-primary-foreground text-xs font-bold whitespace-nowrap">
                      <Zap size={12} />
                      {tier?.badge}
                    </div>
                  </div>
                </>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {tier?.name}
                </h3>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-bold text-foreground font-mono-data text-3xl">
                    {tier?.price}
                  </span>

                  <span className="text-sm font-medium text-muted-foreground">
                    {tier?.currency}
                  </span>

                  <span className="text-sm text-muted-foreground">
                    {tier?.period}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tier?.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier?.features?.map((feature) => (
                  <li
                    key={`${tier?.id}-${feature}`}
                    className="flex items-start gap-2.5"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        tier?.highlight
                          ? 'bg-primary/20' :'bg-muted'
                      }`}
                    >
                      <Check
                        size={10}
                        className={
                          tier?.highlight
                            ? 'text-primary' :'text-muted-foreground'
                        }
                      />
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleRegister}
                className={`w-full py-3 rounded-md text-sm font-semibold transition-all duration-150 active:scale-95 ${
                  tier?.highlight
                    ? 'gold-gradient-bg text-primary-foreground hover:opacity-90 shadow-gold-sm'
                    : 'border border-border text-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {tier?.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Tous les abonnements sont associés à votre entreprise et
            gérés depuis votre portail JDV CRM.
          </p>
        </div>
      </div>
    </section>
  );
}