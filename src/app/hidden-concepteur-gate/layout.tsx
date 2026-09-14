'use client';

import React from 'react';

interface ConcepteurLayoutProps {
  children: React.ReactNode;
}

export default function ConcepteurLayout({
  children,
}: ConcepteurLayoutProps) {
  return (
    <div
      className="concepteur-app min-h-screen w-full"
      style={{
        background: '#000000',
        color: '#FFFFFF',
      }}
    >
      {children}
    </div>
  );
}
