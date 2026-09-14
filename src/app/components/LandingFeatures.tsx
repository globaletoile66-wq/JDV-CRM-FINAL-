import React from 'react';
import {
  Coins,
  MapPin,
  BarChart3,
  Shield,
  Zap,
  Users,
} from 'lucide-react';

const features = [
  {
    id: 'feat-tokens',
    icon: Coins,
    title: 'Moteur de Jetons Quotidiens',
    description:
      "Émettez, suivez et auditez les jetons de vente quotidiens sur toute votre force terrain. Suivez les encaissements, les échéances et les commissions depuis un espace centralisé.",
    highlight: 'Gestion du Cycle de Vie des Jetons',
    tags: ['Émission', 'Encaissement', 'Suivi'],
  },
  {
    id: 'feat-field',
    icon: MapPin,
    title: 'Portail Prospecteur Terrain',
    description:
      'Une interface mobile-first conçue pour les agents terrain. Enregistrez les prospects, les clients, les ventes et les paiements tout en suivant vos performances et vos commissions.',
    highlight: 'Conception Mobile-First',
    tags: ['Codes Agents', 'Prospection', 'Commissions'],
  },
  {
    id: 'feat-analytics',
    icon: BarChart3,
    title: 'Analytique Entreprise',
    description:
      'Un tableau de bord complet pour les administrateurs. Surveillez les ventes, les encaissements, les stocks, les performances des prospecteurs et les indicateurs clés de votre entreprise.',
    highlight: 'Tableaux de Bord Temps Réel',
    tags: ['Suivi des Stocks', 'Revenus', 'KPIs'],
  },
  {
    id: 'feat-security',
    icon: Shield,
    title: 'Architecture à Rôles Isolés',
    description:
      'Des espaces distincts pour les administrateurs, les prospecteurs et le concepteur de la plateforme, avec des permissions adaptées à chaque rôle et une isolation stricte des données.',
    highlight: 'Sécurité Renforcée',
    tags: ['RBAC', 'Isolation des Routes', 'Journalisation'],
  },
  {
    id: 'feat-realtime',
    icon: Zap,
    title: 'Synchronisation Temps Réel',
    description:
      "Les opérations enregistrées sur le terrain peuvent être répercutées instantanément dans l'espace administrateur. Suivez les ventes, paiements, stocks et commissions sans actualisation manuelle.",
    highlight: 'Données en Temps Réel',
    tags: ['Flux en Direct', 'Synchronisation', 'Alertes'],
  },
  {
    id: 'feat-teams',
    icon: Users,
    title: 'Gestion des Équipes',
    description:
      'Centralisez vos prospecteurs, leurs performances, leurs territoires, leurs ventes et leurs commissions afin de piloter efficacement votre force commerciale.',
    highlight: 'Pilotage des Équipes',
    tags: ['Prospecteurs', 'Territoires', 'Performance'],
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="py-24 px-6 lg:px-10"
    >
      <div className="max-w-screen-2xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <span className="text-xs font-semibold text-primary tracking-widest uppercase">
              Capacités de la Plateforme
            </span>
          </div>

          <h2 className="text-hero-lg text-foreground mb-4">
            Conçu pour les{' '}
            <span className="gold-gradient-text">
              Opérations Terrain
            </span>{' '}
            Entreprise
          </h2>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tous les outils essentiels pour piloter une activité commerciale
            terrain, gérer les clients, les ventes, les paiements, les stocks
            et les performances depuis une seule plateforme.
          </p>
        </div>

        {/* FEATURES */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {features?.map((feature) => {
            const FeatureIcon = feature?.icon;

            return (
              <article
                key={feature?.id}
                className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary/40 transition-all duration-300 card-glow hover:card-glow-gold"
              >
                {/* TOP GOLD LINE */}
                <div
                  className="absolute top-0 left-0 right-0 h-px rounded-t-xl"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
                  }}
                />

                {/* ICON + TITLE */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-200">
                    <FeatureIcon
                      size={22}
                      strokeWidth={1.8}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                      {feature?.highlight}
                    </div>

                    <h3 className="text-base font-semibold text-foreground">
                      {feature?.title}
                    </h3>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {feature?.description}
                </p>

                {/* TAGS */}
                <div className="flex flex-wrap gap-2">
                  {feature?.tags?.map((tag) => (
                    <span
                      key={`${feature?.id}-${tag}`}
                      className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
