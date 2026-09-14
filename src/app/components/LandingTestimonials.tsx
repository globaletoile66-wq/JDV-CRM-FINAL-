'use client';

import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  CheckCircle2,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const trustPoints = [
  {
    id: 'security',
    icon: ShieldCheck,
    title: 'Sécurité des accès',
    description:
      'Chaque portail est isolé selon son rôle. Les accès aux données sont contrôlés par authentification, autorisations et politiques de sécurité.',
  },
  {
    id: 'performance',
    icon: TrendingUp,
    title: 'Pilotage en temps réel',
    description:
      'Suivez les ventes, paiements, stocks, commissions et performances de vos équipes depuis un tableau de bord centralisé.',
  },
  {
    id: 'teams',
    icon: Users,
    title: 'Gestion des équipes',
    description:
      'Organisez vos prospecteurs terrain et vos équipes administratives avec des rôles et des permissions adaptés à chaque utilisateur.',
  },
  {
    id: 'traceability',
    icon: CheckCircle2,
    title: 'Traçabilité complète',
    description:
      'Chaque opération importante peut être suivie : prospects, clients, ventes, paiements, mouvements de stock et commissions.',
  },
];

export default function LandingTestimonials() {
  return (
    <section
      id="testimonials"
      className="py-24 px-6 lg:px-10"
    >
      <div className="max-w-screen-2xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">
              Pourquoi JDV CRM
            </span>
          </div>

          <h2 className="text-hero-lg text-foreground mb-4">
            Une plateforme pensée pour{' '}
            <span className="gold-gradient-text">
              votre activité commerciale
            </span>
          </h2>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            JDV CRM rassemble les outils essentiels pour gérer vos
            équipes, vos prospects, vos clients, vos ventes et vos
            opérations quotidiennes depuis une seule plateforme.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {trustPoints?.map((point) => {
            const Icon = point?.icon;

            return (
              <div
                key={point?.id}
                className="bg-card border border-border rounded-xl p-6 card-glow hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl gold-gradient-bg flex items-center justify-center mb-5">
                  <Icon
                    size={22}
                    className="text-primary-foreground"
                  />
                </div>

                <h3 className="text-base font-semibold text-foreground mb-3">
                  {point?.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {point?.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Une seule plateforme pour piloter votre activité
          </h3>

          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            De la prospection terrain au suivi des paiements, en passant
            par les ventes, les stocks et les commissions, JDV CRM vous
            permet de centraliser vos opérations et de garder une vision
            claire de votre activité.
          </p>
        </div>
      </div>
    </section>
  );
}