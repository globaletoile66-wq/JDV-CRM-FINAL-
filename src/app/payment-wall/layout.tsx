'use client';

import React from 'react';

interface PaymentWallLayoutProps {
  children: React.ReactNode;
}

export default function PaymentWallLayout({
  children,
}: PaymentWallLayoutProps) {
  return (
    <div
      className="payment-wall-app min-h-screen w-full"
      style={{
        background: '#0B1B3D',
        color: '#FFFFFF',
      }}
    >
      {children}
    </div>
  );
}
