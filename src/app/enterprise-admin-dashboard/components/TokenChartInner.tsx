'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const TokenChartInner = dynamic(
  () => import('./TokenChartInner'),
  { ssr: false }
);

export default function AdminTokenChart() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 card-glow h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-600 text-foreground">
            Token Redemption — 14 Day Trend
          </h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            Daily issued vs redeemed tokens
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: 'var(--primary)' }}
            />
            <span className="text-xs text-muted-foreground">
              Issued
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-info" />
            <span className="text-xs text-muted-foreground">
              Redeemed
            </span>
          </div>
        </div>
      </div>

      <TokenChartInner />
    </div>
  );
}