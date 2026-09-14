'use client';

import React from 'react';
import LandingNav from './components/LandingNav';
import LandingHero from './components/LandingHero';
import LandingFeatures from './components/LandingFeatures';
import LandingPricing from './components/LandingPricing';
import LandingTestimonials from './components/LandingTestimonials';
import LandingFooter from './components/LandingFooter';
import OnboardingModalWrapper from './components/OnboardingModalWrapper';

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--background)' }}>
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingTestimonials />
      <LandingFooter />
      <OnboardingModalWrapper />
    </main>
  );
}