'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router?.push('/');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history?.length > 1) {
        window.history?.back();
      } else {
        router?.push('/');
      }
    }
  };

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8"
      style={{
        background: '#0B1B3D',
        color: '#FFFFFF',
      }}
    >
      <div className="w-full max-w-lg text-center">

        {/* Logo / identité */}
        <div className="mb-8">
          <div
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.35)',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <span
              className="text-sm font-bold tracking-widest"
              style={{ color: '#D4AF37' }}
            >
              JDV CRM
            </span>
          </div>
        </div>

        {/* 404 */}
        <div className="mb-6">
          <div
            className="text-[120px] sm:text-[150px] leading-none font-extrabold select-none"
            style={{
              color: '#D4AF37',
              opacity: 0.16,
            }}
          >
            404
          </div>
        </div>

        {/* Message */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            Page introuvable
          </h1>

          <p
            className="text-sm sm:text-base leading-7 max-w-md mx-auto"
            style={{ color: 'rgba(255, 255, 255, 0.68)' }}
          >
            Désolé, la page que vous recherchez n'existe pas ou n'est plus disponible.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">

          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: '#D4AF37',
              color: '#0B1B3D',
            }}
          >
            <Icon name="ArrowLeftIcon" size={17} />
            Retour
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.22)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#FFFFFF',
            }}
          >
            <Icon name="HomeIcon" size={17} />
            Accueil JDV CRM
          </button>

        </div>

        {/* Information discrète */}
        <p
          className="mt-10 text-xs"
          style={{ color: 'rgba(255, 255, 255, 0.38)' }}
        >
          JDV CRM — Gestion commerciale
        </p>
      </div>
    </main>
  );
}
