'use client';
import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface StockGaugesInnerProps {
  overallHealth?: number;
  lowStockCount?: number;
}

export default function StockGaugesInner({ overallHealth = 0, lowStockCount = 0 }: StockGaugesInnerProps) {
  const gaugeData = [{ name: 'Overall', value: overallHealth, fill: 'var(--primary)' }];

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={80} height={80}>
        <RadialBarChart
          innerRadius={24}
          outerRadius={36}
          data={gaugeData}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'var(--muted)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div>
        <div className="text-2xl font-700 font-mono-data text-primary">{overallHealth}%</div>
        <div className="text-xs text-muted-foreground">Overall stock health</div>
        {lowStockCount > 0 ? (
          <div className="text-xs text-warning font-600 mt-0.5">
            {lowStockCount} SKU{lowStockCount !== 1 ? 's' : ''} need reorder
          </div>
        ) : (
          <div className="text-xs text-success font-600 mt-0.5">All stock levels OK</div>
        )}
      </div>
    </div>
  );
}