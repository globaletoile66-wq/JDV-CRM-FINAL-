'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface KPIData {
  totalRevenue: number;
  totalSales: number;
  tokensIssued: number;
  tokensRedeemed: number;
  totalCommissions: number;
  activeProspectors: number;
}

export default function AdminKPIBento() {
  const [kpis, setKpis] = useState<KPIData>({
    totalRevenue: 0,
    totalSales: 0,
    tokensIssued: 0,
    tokensRedeemed: 0,
    totalCommissions: 0,
    activeProspectors: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadKPIs = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership?.organization_id) return;
      const orgId = membership.organization_id;

      const [salesRes, tokensRes, commissionsRes, prospectorsRes] = await Promise.all([
        supabase.from('sales').select('amount').eq('organization_id', orgId),
        supabase.from('daily_tokens').select('issued_count, redeemed_count').eq('organization_id', orgId),
        supabase.from('commissions').select('amount').eq('organization_id', orgId),
        supabase.from('organization_members').select('id').eq('organization_id', orgId).eq('role', 'prospector').eq('status', 'active'),
      ]);

      const totalRevenue = (salesRes.data || []).reduce((sum: number, s: { amount?: unknown }) => sum + Number(s.amount || 0), 0);
      const totalSales = (salesRes.data || []).length;
      const tokensIssued = (tokensRes.data || []).reduce((sum: number, t: { issued_count?: unknown }) => sum + Number(t.issued_count || 0), 0);
      const tokensRedeemed = (tokensRes.data || []).reduce((sum: number, t: { redeemed_count?: unknown }) => sum + Number(t.redeemed_count || 0), 0);
      const totalCommissions = (commissionsRes.data || []).reduce((sum: number, c: { amount?: unknown }) => sum + Number(c.amount || 0), 0);
      const activeProspectors = (prospectorsRes.data || []).length;

      setKpis({ totalRevenue, totalSales, tokensIssued, tokensRedeemed, totalCommissions, activeProspectors });
    } catch (err) {
      console.error('Erreur KPI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIs();

    const supabase = createClient();
    const channel = supabase
      .channel('admin-kpi-bento')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => loadKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tokens' }, () => loadKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => loadKPIs())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => loadKPIs())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FCFA';

  const kpiCards = [
    {
      label: 'Chiffre d\'affaires',
      value: loading ? '—' : formatAmount(kpis.totalRevenue),
      icon: '💰',
      color: 'text-primary',
    },
    {
      label: 'Ventes totales',
      value: loading ? '—' : kpis.totalSales.toLocaleString('fr-FR'),
      icon: '📦',
      color: 'text-success',
    },
    {
      label: 'Jetons émis',
      value: loading ? '—' : kpis.tokensIssued.toLocaleString('fr-FR'),
      icon: '🎫',
      color: 'text-info',
    },
    {
      label: 'Jetons rachetés',
      value: loading ? '—' : kpis.tokensRedeemed.toLocaleString('fr-FR'),
      icon: '✅',
      color: 'text-accent',
    },
    {
      label: 'Commissions',
      value: loading ? '—' : formatAmount(kpis.totalCommissions),
      icon: '💼',
      color: 'text-warning',
    },
    {
      label: 'Prospecteurs actifs',
      value: loading ? '—' : kpis.activeProspectors.toLocaleString('fr-FR'),
      icon: '👥',
      color: 'text-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {kpiCards.map((card) => (
        <div
          key={card.label}
          className="bg-card border border-border rounded-xl p-4 card-glow flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-500 text-muted-foreground uppercase tracking-widest">
              {card.label}
            </span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <div className={`text-xl font-700 font-mono-data ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}