import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-primary/10">
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="JDV CRM - Accueil"
        >
          <AppLogo size={36} />

          <span className="font-sans text-xl font-bold tracking-tight text-foreground">
            JDV{' '}
            <span className="gold-gradient-text font-extrabold">
              CRM
            </span>
          </span>
        </Link>

        {/* NAVIGATION DESKTOP */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Fonctionnalités
          </a>

          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Tarifs
          </a>

          <a
            href="#testimonials"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            À propos
          </a>

          <Link
            href="/guide-onboarding"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Guide
          </Link>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">
          <Link
            href="/business/login"
            className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 px-4 py-2 rounded-md border border-border hover:border-primary/40"
          >
            Portail Entreprise
          </Link>

          {/* 
           * Ce bouton conserve l'identifiant open-onboarding
           * utilisé par OnboardingModalWrapper.
           */}
          <button
            id="open-onboarding"
            type="button"
            className="text-sm font-semibold px-5 py-2.5 rounded-md gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 shadow-gold-sm"
          >
            Inscrire Mon Entreprise
          </button>
        </div>
      </div>
    </nav>
  );
}
