import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

const platformLinks = [
  {
    label: 'Fonctionnalités',
    href: '#features',
  },
  {
    label: 'Tarifs',
    href: '#pricing',
  },
];

const portalLinks = [
  {
    label: 'Portail Administrateur Entreprise',
    href: '/business/login',
  },
  {
    label: 'Portail Prospecteur Terrain',
    href: '/terrain/login',
  },
  {
    label: "Guide d\'Intégration",
    href: '/guide-onboarding',
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/20 py-12 px-6 lg:px-10">
      <div className="max-w-screen-2xl mx-auto">
        {/* MAIN FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* BRAND */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <AppLogo size={32} />

              <span className="font-sans text-lg font-bold tracking-tight text-foreground">
                JDV <span className="gold-gradient-text">CRM</span>
              </span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              JDV CRM est une plateforme de gestion commerciale conçue pour
              les entreprises qui pilotent une force de vente terrain.
              Centralisez vos prospects, clients, ventes, paiements, stocks,
              commissions et performances depuis un seul espace.
            </p>
          </div>

          {/* PLATFORM */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Plateforme
            </h4>

            <ul className="space-y-2.5">
              {platformLinks?.map((item) => (
                <li key={`footer-platform-${item?.label}`}>
                  <a
                    href={item?.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item?.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* PORTALS */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Portails
            </h4>

            <ul className="space-y-2.5">
              {portalLinks?.map((item) => (
                <li key={`footer-portal-${item?.label}`}>
                  <Link
                    href={item?.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {item?.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            © 2026 JDV CRM. Tous droits réservés. Plateforme d&apos;Intelligence
            Commerciale — Bénin, Afrique de l&apos;Ouest.
          </p>

          <Link
            href="/business/login"
            className="text-xs font-semibold text-primary hover:text-accent transition-colors duration-200 px-4 py-2 rounded-md border border-primary/30 hover:border-primary/60"
          >
            Connexion Portail Entreprise →
          </Link>
        </div>
      </div>
    </footer>
  );
}
