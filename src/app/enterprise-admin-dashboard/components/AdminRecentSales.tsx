'use client';
import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { fetchRecentSales, type RecentSaleRow } from '@/lib/services/adminDashboardService';
import { createClient } from '@/lib/supabase/client';

export default function AdminRecentSales() {
  const [recentSales, setRecentSales] = useState<RecentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleIds, setNewSaleIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const loadSales = async () => {
    const data = await fetchRecentSales();
    setRecentSales(data);
  };

  useEffect(() => {
    loadSales().finally(() => setLoading(false));

    const supabase = createClient();

    // Subscribe to new payments in real-time
    channelRef.current = supabase
      .channel('admin-sales-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'paiements_journaliers' },
        async (_payload: unknown) => {
          // Reload the full list to get enriched data (agent name, product, etc.)
          const updated = await fetchRecentSales();
          setRecentSales(updated);
          // Mark the newest sale for flash highlight
          if (updated.length > 0) {
            const newestId = updated[0].id;
            setNewSaleIds((prev) => new Set(prev).add(newestId));
            setTimeout(() => {
              setNewSaleIds((prev) => {
                const next = new Set(prev);
                next.delete(newestId);
                return next;
              });
            }, 4000);
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl card-glow overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-success/15 flex items-center justify-center">
            <TrendingUp size={16} className="text-success" />
          </div>
          <div>
            <h3 className="text-base font-600 text-foreground">Live Sale Feed</h3>
            <p className="text-xs text-muted-foreground">Most recent transactions across all agents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success pulse-gold" />
          <span className="text-xs font-600 text-success">Temps réel</span>
        </div>
      </div>

      {loading && (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-sale-${i}`} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      )}

      {!loading && recentSales.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <TrendingUp size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground mb-1">Aucune transaction pour l&apos;instant</p>
          <p className="text-xs text-muted-foreground">Les ventes apparaîtront ici dès que les agents encaisseront.</p>
        </div>
      )}

      {!loading && recentSales.length > 0 && (
        <div className="overflow-x-auto scrollbar-gold">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                {['Heure', 'Agent', 'Code Agent', 'Token ID', 'Produit', 'Montant', 'Région'].map((h) => (
                  <th
                    key={`rth-${h}`}
                    className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale, idx) => {
                const isNew = newSaleIds.has(sale.id);
                return (
                  <tr
                    key={sale.id}
                    className={`border-b border-border/50 hover:bg-primary/5 transition-colors duration-300 ${
                      isNew
                        ? 'bg-success/20 animate-pulse'
                        : idx === 0
                        ? 'bg-success/5' :''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-600 font-mono-data text-primary">{sale.time}</span>
                      {(isNew || idx === 0) && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-success/15 text-success font-600">
                          {isNew ? '🔴 Nouveau' : 'Récent'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-500 text-foreground">{sale.agent}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono-data text-primary">{sale.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono-data text-muted-foreground">{sale.token}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sale.product}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-700 font-mono-data text-success">{sale.amount}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sale.region}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-border">
        <button className="text-xs font-500 text-primary hover:text-accent transition-colors duration-150">
          Voir toutes les transactions →
        </button>
      </div>
    </div>
  );
}