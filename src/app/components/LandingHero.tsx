import React from 'react';

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-[0.08] blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05] blur-3xl"
        style={{
          background:
            'radial-gradient(circle, #D4AF37 0%, transparent 60%)',
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-screen-xl mx-auto px-6 lg:px-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
          <span className="w-2 h-2 rounded-full bg-success pulse-gold" />

          <span className="text-xs font-semibold text-primary tracking-widest uppercase">
            Plateforme d&apos;Intelligence Commerciale Entreprise
          </span>
        </div>

        {/* Title */}
        <h1 className="text-hero-xl text-foreground mb-6 max-w-4xl mx-auto">
          Pilotez Votre{' '}
          <span className="gold-gradient-text">Force de Vente</span>{' '}
          Avec Précision
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          JDV CRM centralise vos prospects, clients, ventes à crédit,
          paiements quotidiens, stocks, commissions et performances de votre
          force de vente terrain dans une seule plateforme.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            id="hero-register-btn"
            type="button"
            className="text-base font-semibold px-8 py-4 rounded-md gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150 shadow-gold-md w-full sm:w-auto"
          >
            Inscrire Mon Entreprise
          </button>

          <a
            href="#features"
            className="text-base font-medium px-8 py-4 rounded-md border border-border text-foreground hover:border-primary/40 hover:text-primary transition-all duration-200 w-full sm:w-auto text-center"
          >
            Explorer la Plateforme
          </a>
        </div>

        {/* Platform capabilities */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            {
              value: '100 %',
              label: 'Gestion centralisée',
            },
            {
              value: 'Temps réel',
              label: "Suivi de l'activité",
            },
            {
              value: 'Terrain',
              label: 'Force de vente connectée',
            },
            {
              value: 'Sécurisé',
              label: 'Accès par rôles',
            },
          ]?.map((stat) => (
            <div
              key={`hero-capability-${stat?.label}`}
              className="text-center"
            >
              <div className="text-xl md:text-2xl font-bold font-mono-data gold-gradient-text mb-1">
                {stat?.value}
              </div>

              <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {stat?.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background:
            'linear-gradient(transparent, var(--background))',
        }}
      />
    </section>
  );
}
