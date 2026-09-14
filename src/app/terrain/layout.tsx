import React from 'react';

export default function TerrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="terrain-app min-h-screen" style={{ background: '#0B1B3D' }}>
      {children}
    </div>
  );
}
