'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Coins, DollarSign } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type KPIData = {
  todaySales: number;
  todayTarget: number;
  tokenBalance: number;
  commissionToday: number;
};

type Row = Record<string, any>;

export default function ProspectorKPIs() {
  const [data, setData] = useState<KPIData>({
    todaySales: 0,
    todayTarget: 0,
    tokenBalance: 0,
    commissionToday: 0,
  });

  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const loadKPIs = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        return;
      }

      /*
       * Recherche du prospecteur connecté.
       */
      let prospector: Row | null = null;

      const { data: byUserId } = await supabase
        .from('prospecteurs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      prospector = byUserId;

      /*
       * Compatibilité avec différentes structures possibles
       * de rattachement du prospecteur.
       */
      if (!prospector) {
        for (const column of [
          'profile_id',
          'agent_id',
          'account_id',
        ]) {
          const { data } = await supabase
            .from('prospecteurs')
            .select('*')
            .eq(column, user.id)
            .maybeSingle();

          if (data) {
            prospector = data;
            break;
          }
        }
      }

      const prospectorId =
        prospector?.id ??
        prospector?.prospecteur_id ??
        null;

      /*
       * Organisation du prospecteur.
       */
      let organizationId: string | null = null;

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      organizationId = membership?.organization_id ?? null;

      /*
       * Début et fin de la journée.
       */
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const startISO = startOfDay.toISOString();
      const endISO = endOfDay.toISOString();

      /*
       * ---------------------------------------------------------
       * 1. VENTES DU JOUR
       * ---------------------------------------------------------
       */
      let salesRows: Row[] = [];

      let salesQuery = supabase
        .from('sales')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (organizationId) {
        salesQuery = salesQuery.eq(
          'organization_id',
          organizationId
        );
      }

      const { data: salesData } = await salesQuery;

      salesRows = salesData ?? [];

      /*
       * Filtrage supplémentaire par prospecteur lorsque
       * l'identifiant existe dans les données.
       */
      if (prospectorId) {
        const hasProspectorColumn = salesRows.some(
          (row) =>
            row.prospecteur_id !== undefined ||
            row.agent_id !== undefined ||
            row.seller_id !== undefined ||
            row.user_id !== undefined
        );

        if (hasProspectorColumn) {
          salesRows = salesRows.filter((row) => {
            const id =
              row.prospecteur_id ??
              row.agent_id ??
              row.seller_id ??
              row.user_id;

            return String(id) === String(prospectorId);
          });
        }
      }

      const todaySales = salesRows.length;

      /*
       * Objectif quotidien du prospecteur.
       * Plusieurs noms sont supportés pour rester compatible
       * avec la structure existante.
       */
      const todayTarget = Number(
        prospector?.daily_target ??
        prospector?.today_target ??
        prospector?.target ??
        prospector?.objectif_journalier ??
        0
      );

      /*
       * ---------------------------------------------------------
       * 2. SOLDE DE TOKENS
       * ---------------------------------------------------------
       */
      let tokenRows: Row[] = [];

      let tokenQuery = supabase
        .from('daily_tokens')
        .select('*');

      if (organizationId) {
        tokenQuery = tokenQuery.eq(
          'organization_id',
          organizationId
        );
      }

      const { data: tokensData } = await tokenQuery;

      tokenRows = tokensData ?? [];

      /*
       * Garder uniquement les tokens liés au prospecteur
       * lorsqu'une colonne de rattachement est disponible.
       */
      if (prospectorId) {
        const hasProspectorColumn = tokenRows.some(
          (row) =>
            row.prospecteur_id !== undefined ||
            row.agent_id !== undefined ||
            row.user_id !== undefined
        );

        if (hasProspectorColumn) {
          tokenRows = tokenRows.filter((row) => {
            const id =
              row.prospecteur_id ??
              row.agent_id ??
              row.user_id;

            return String(id) === String(prospectorId);
          });
        }
      }

      /*
       * Tokens attribués aujourd'hui.
       */
      const todayTokenRows = tokenRows.filter((row) => {
        const rawDate =
          row.created_at ??
          row.issued_at ??
          row.date ??
          row.token_date;

        if (!rawDate) return false;

        const date = new Date(rawDate);

        return (
          date >= startOfDay &&
          date <= endOfDay
        );
      });

      const issuedToday = todayTokenRows.reduce(
        (total, row) =>
          total +
          Number(
            row.quantity ??
            row.token_count ??
            row.tokens ??
            row.count ??
            1
          ),
        0
      );

      const redeemedToday = todayTokenRows.reduce(
        (total, row) => {
          const status = String(
            row.status ??
              row.state ??
              row.type ??
              row.action ??
              ''
          ).toLowerCase();

          if (
            status.includes('redeem') ||
            status.includes('used') ||
            status.includes('consume') ||
            status.includes('util')
          ) {
            return (
              total +
              Number(
                row.quantity ??
                row.token_count ??
                row.tokens ??
                row.count ??
                1
              )
            );
          }

          return total;
        },
        0
      );

      const tokenBalance = Math.max(
        0,
        issuedToday - redeemedToday
      );

      /*
       * ---------------------------------------------------------
       * 3. COMMISSION DU JOUR
       * ---------------------------------------------------------
       */
      let commissionRows: Row[] = [];

      let commissionQuery = supabase
        .from('commissions')
        .select('*')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (organizationId) {
        commissionQuery = commissionQuery.eq(
          'organization_id',
          organizationId
        );
      }

      const { data: commissionsData } =
        await commissionQuery;

      commissionRows = commissionsData ?? [];

      if (prospectorId) {
        const hasProspectorColumn =
          commissionRows.some(
            (row) =>
              row.prospecteur_id !== undefined ||
              row.agent_id !== undefined ||
              row.user_id !== undefined
          );

        if (hasProspectorColumn) {
          commissionRows = commissionRows.filter(
            (row) => {
              const id =
                row.prospecteur_id ??
                row.agent_id ??
                row.user_id;

              return (
                String(id) ===
                String(prospectorId)
              );
            }
          );
        }
      }

      const commissionToday =
        commissionRows.reduce(
          (total, row) =>
            total +
            Number(
              row.amount ??
              row.commission_amount ??
              row.value ??
              row.commission ??
              0
            ),
          0
        );

      setData({
        todaySales,
        todayTarget,
        tokenBalance,
        commissionToday,
      });
    } catch (error) {
      console.error(
        'Erreur chargement KPI prospecteur:',
        error
      );
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      setLoading(true);

      await loadKPIs();

      if (mounted) {
        setLoading(false);
      }
    };

    initialize();

    /*
     * Actualisation temps réel.
     */
    const channel = supabase
      .channel('prospector-kpi-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          loadKPIs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          loadKPIs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tokens',
        },
        () => {
          loadKPIs();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions',
        },
        () => {
          loadKPIs();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadKPIs, supabase]);

  const kpis = [
    {
      id: 'pkpi-sales',
      icon: ShoppingBag,
      label: 'Ventes du Jour',
      value: String(data.todaySales),
      sub:
        data.todayTarget > 0
          ? `sur ${data.todayTarget} objectif`
          : 'ventes enregistrées',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
      iconBg: 'bg-primary/20 text-primary',
    },
    {
      id: 'pkpi-tokens',
      icon: Coins,
      label: 'Solde Tokens',
      value: String(data.tokenBalance),
      sub: "restants aujourd\'hui",
      color: 'text-warning',
      bg: 'bg-warning/10 border-warning/20',
      iconBg: 'bg-warning/20 text-warning',
    },
    {
      id: 'pkpi-commission',
      icon: DollarSign,
      label: 'Ma Commission',
      value: `${data.commissionToday.toFixed(0)} FCFA`,
      sub: "gagnée aujourd\'hui",
      color: 'text-success',
      bg: 'bg-success/10 border-success/20',
      iconBg: 'bg-success/20 text-success',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`skel-kpi-${index}`}
            className="rounded-xl border border-border bg-card p-3 animate-pulse"
          >
            <div className="w-8 h-8 rounded-lg bg-muted mb-2" />
            <div className="h-6 w-12 bg-muted rounded mb-1" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi) => {
        const KPIIcon = kpi.icon;

        return (
          <div
            key={kpi.id}
            className={`rounded-xl border p-3 transition-all duration-300 ${kpi.bg}`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.iconBg}`}
            >
              <KPIIcon size={16} />
            </div>

            <div
              className={`text-xl font-700 font-mono-data ${kpi.color} mb-0.5`}
            >
              {kpi.value}
            </div>

            <div className="text-xs font-600 text-foreground leading-tight">
              {kpi.label}
            </div>

            <div className="text-xs text-muted-foreground mt-0.5">
              {kpi.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
