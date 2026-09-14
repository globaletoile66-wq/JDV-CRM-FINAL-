'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Prospecteur = Record<string, unknown>;
type Sale = Record<string, unknown>;

function getText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = ''
): string {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return String(value);
    }
  }

  return fallback;
}

function getNumber(
  row: Record<string, unknown>,
  keys: string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = Number(row[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

export default function ProspectorTargetBar() {
  const [sales, setSales] = useState(0);
  const [target, setTarget] = useState(30);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadTargetProgress = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setSales(0);
        setTarget(30);
        return;
      }

      /*
       * 1. Récupération du prospecteur connecté
       */
      let prospecteur: Prospecteur | null = null;

      const prospecteurAttempts = [
        'user_id',
        'profile_id',
        'account_id',
      ];

      for (const column of prospecteurAttempts) {
        const { data, error } = await supabase
          .from('prospecteurs')
          .select('*')
          .eq(column, user.id)
          .maybeSingle();

        if (!error && data) {
          prospecteur = data as Prospecteur;
          break;
        }
      }

      /*
       * Si aucun profil prospecteur n'est trouvé,
       * on conserve l'objectif par défaut.
       */
      if (!prospecteur) {
        setSales(0);
        setTarget(30);
        return;
      }

      const prospecteurId = getText(prospecteur, [
        'id',
        'prospecteur_id',
        'agent_id',
      ]);

      /*
       * 2. Objectif du prospecteur
       *
       * Plusieurs noms sont pris en charge afin d'éviter * de dépendre d'une colonne qui n'a pas encore été
       * confirmée dans le schéma actuel.
       */
      const configuredTarget = getNumber(
        prospecteur,
        [
          'daily_target',
          'today_target',
          'target',
          'daily_goal',
          'sales_target',
        ],
        30
      );

      setTarget(configuredTarget > 0 ? configuredTarget : 30);

      /*
       * 3. Ventes réalisées aujourd'hui
       */
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', {
          ascending: false,
        });

      if (salesError) {
        console.error(
          'Erreur chargement ventes du jour:',
          salesError
        );

        setSales(0);
        return;
      }

      const rows = (salesData ?? []) as Sale[];

      /*
       * 4. On conserve uniquement les ventes du prospecteur connecté.
       */
      const agentSales = rows.filter((sale) => {
        const saleProspecteurId = getText(sale, [
          'prospecteur_id',
          'agent_id',
          'seller_id',
          'created_by',
          'user_id',
        ]);

        if (!saleProspecteurId) {
          return false;
        }

        return (
          saleProspecteurId === prospecteurId ||
          saleProspecteurId === user.id
        );
      });

      setSales(agentSales.length);
    } catch (error) {
      console.error(
        'Erreur chargement objectif prospecteur:',
        error
      );

      setSales(0);
      setTarget(30);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTargetProgress();

    /*
     * Actualisation temps réel dès qu'une vente est créée,
     * modifiée ou supprimée.
     */
    const channel = supabase
      .channel('prospector-target-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        () => {
          loadTargetProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTargetProgress, supabase]);

  const pct =
    target > 0
      ? Math.min(100, Math.round((sales / target) * 100))
      : 0;

  const remaining = Math.max(0, target - sales);

  return (
    <div className="bg-card border border-border rounded-xl p-4 card-glow">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target
            size={16}
            className="text-primary"
          />

          <span className="text-sm font-600 text-foreground">
            Daily Target Progress
          </span>
        </div>

        <span className="text-sm font-700 font-mono-data text-primary">
          {loading ? '…' : `${pct}%`}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className="h-full rounded-full gold-gradient-bg transition-all duration-500"
          style={{
            width: loading ? '0%' : `${pct}%`,
          }}
        />
      </div>

      {/* STATS */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {loading
            ? '…'
            : `${sales} vente${sales !== 1 ? 's' : ''} enregistrée${
                sales !== 1 ? 's' : ''
              }`}
        </span>

        <span className="text-xs text-muted-foreground">
          {loading
            ? '…'
            : `${remaining} restante${
                remaining !== 1 ? 's' : ''
              } pour atteindre l'objectif`}
        </span>
      </div>

      {/* ALMOST THERE */}
      {!loading && pct >= 80 && pct < 100 && (
        <div className="mt-2 text-xs font-600 text-warning flex items-center gap-1.5">
          <span>🔥</span>

          <span>
            Presque atteint — encore {remaining} vente
            {remaining !== 1 ? 's' : ''} pour atteindre
            l'objectif !
          </span>
        </div>
      )}

      {/* TARGET ACHIEVED */}
      {!loading && pct >= 100 && (
        <div className="mt-2 text-xs font-600 text-success flex items-center gap-1.5">
          <span>✅</span>

          <span>
            Objectif atteint ! Commission bonus débloquée.
          </span>
        </div>
      )}
    </div>
  );
}