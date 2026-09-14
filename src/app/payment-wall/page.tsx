'use client';

import React, { Suspense } from 'react';
import PaymentWallContent from './PaymentWallContent';

function PaymentWallLoading() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        background: '#0B1B3D',
        color: '#FFFFFF',
      }}
    >
      <div className="text-center">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
          style={{
            borderColor: '#D4AF37',
            borderTopColor: 'transparent',
          }}
        />

        <p
          className="text-xs"
          style={{
            color: '#A0AEC0',
          }}
        >
          Chargement…
        </p>
      </div>
    </div>
  );
}

export default function PaymentWallPage() {
  return (
    <Suspense fallback={<PaymentWallLoading />}>
      <PaymentWallContent />
    </Suspense>
  );
}
