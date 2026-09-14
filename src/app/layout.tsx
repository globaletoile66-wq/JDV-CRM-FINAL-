import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import '../styles/tailwind.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'JDV CRM — Gestion commerciale',
    template: '%s | JDV CRM',
  },

  description:
    'JDV CRM est une plateforme professionnelle de gestion commerciale, de ventes à crédit, de paiements journaliers, de stocks, de commissions et de prospection terrain.',

  applicationName: 'JDV CRM',

  keywords: [
    'JDV CRM',
    'CRM',
    'gestion commerciale',
    'vente à crédit',
    'paiement journalier',
    'prospecteur',
    'prospection terrain',
    'gestion des stocks',
    'commissions',
    'Bénin',
    'Afrique',
  ],

  authors: [
    {
      name: 'JDV CRM',
    },
  ],

  creator: 'JDV CRM',

  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
    ],
  },

  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${plusJakartaSans.className} min-h-screen antialiased`}
        style={{
          background: '#0B1B3D',
          color: '#FFFFFF',
        }}
      >
        {children}

        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#0F2040',
              border: '1px solid rgba(212,175,55,0.3)',
              color: '#FFFFFF',
              fontFamily: 'var(--font-plus-jakarta-sans)',
            },
          }}
        />

        {/* Rocket analytics / instrumentation */}

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fjdvcrm9483back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.20" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.3" /></body>
    </html>
  );
}