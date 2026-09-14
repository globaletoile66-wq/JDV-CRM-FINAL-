import React from 'react';

interface BusinessLayoutProps {
  children: React.ReactNode;
}

export default function BusinessLayout({
  children,
}: BusinessLayoutProps) {
  return (
    <div
      className="business-app min-h-screen w-full"
      style={{
        background: '#0B1B3D',
        color: '#FFFFFF',
      }}
    >
      {children}
    </div>
  );
}
