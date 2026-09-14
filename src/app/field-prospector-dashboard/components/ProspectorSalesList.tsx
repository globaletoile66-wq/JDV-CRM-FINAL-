'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type SaleRow = {
  id: string;
  customer: string;
  token: string;
  product: string;
  amount: string;
  time: string;
  createdAt: string;
};

function formatAmount(value: unknown): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return '0 FCFA';
  }

  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function formatTime(value: unknown): string {
  if (!value) return '--:--';

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getText(
  row: Record<string, unknown>,
  keys: string[],
  fallback = ''
): string {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value);
    }
  }

  return fallback;
}

function getNumber(
  row: Record<string, unknown>,
  keys: string[]
): number {
  for (const key of keys) {
    const value = Number(row[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

export default function ProspectorSalesList() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleIds, setNewSaleIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const flashTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  /**
   * Récupère le prospecteur actuellement connecté.
   *
   * On privilégie user_id.
   * Les autres variantes permettent de rester compatible avec
   * une structure déjà existante de la table prospecteurs.
   */
  const getCurrentProspector = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const attempts = [
      { column: 'user_id', value: user.id },
      { column: 'profile_id', value: user.id },
      { column: 'account_id', value: user.id },
    ];

    for (const attempt of attempts) {
      const { data, error } = await supabase
        .from('prospecteurs')
        .select('*')
        .eq(attempt.column, attempt.value)
        .maybeSingle();

      if (!error && data) {
        return data as Record<string, unknown>;
      }
    }

    return null;
  }, [supabase]);

  /**
   * Charge uniquement les ventes du jour du prospecteur connecté.
   */
  const loadSales = useCallback(async () => {
    const prospecteur = await getCurrentProspector();

    if (!prospecteur) {
      setSales([]);
      return;
    }

    const prospecteurId = getText(prospecteur, [
      'id',
      'prospecteur_id',
      'agent_id',
    ]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSales([]);
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    /**
     * On récupère les ventes du jour.
     * Le filtrage par prospecteur est effectué côté requête
     * lorsque la colonne correspondante existe.
     */
    let query = supabase
      .from('sales')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    let { data, error } = await query;

    /**
     * Si la requête générale fonctionne, on filtre côté application
     * pour garantir que le prospecteur ne voit que ses ventes.
     */
    if (error) {
      console.error('Erreur chargement ventes:', error);
      setSales([]);
      return;
    }

    const rows = (data ?? []) as Record<string, unknown>[];

    const filteredRows = rows.filter((row) => {
      const rowProspectorId = getText(row, [
        'prospecteur_id',
        'agent_id',
        'seller_id',
        'created_by',
        'user_id',
      ]);

      if (!rowProspectorId) {
        return false;
      }

      return (
        rowProspectorId === prospecteurId ||
        rowProspectorId === user.id
      );
    });

    /**
     * Transformation vers le format attendu par l'interface.
     */
    const articleIds = filteredRows
      .map((row) =>
        getText(row, ['article_id', 'product_id'])
      )
      .filter(Boolean);

    let articlesById: Record<string, Record<string, unknown>> = {};

    if (articleIds.length > 0) {
      const { data: articles } = await supabase
        .from('articles')
        .select('*')
        .in('id', [...new Set(articleIds)]);

      for (const article of (articles ?? []) as Record<string, unknown>[]) {
        const id = getText(article, ['id']);

        if (id) {
          articlesById[id] = article;
        }
      }
    }

    const mappedSales: SaleRow[] = filteredRows.map((row) => {
      const articleId = getText(row, [
        'article_id',
        'product_id',
      ]);

      const article = articleId
        ? articlesById[articleId]
        : undefined;

      const customer = getText(
        row,
        [
          'customer_name',
          'client_name',
          'customer',
          'client',
          'name',
        ],
        'Client'
      );

      const token = getText(
        row,
        [
          'token_code',
          'token',
          'daily_token',
          'code_token',
        ],
        '—'
      );

      const product = getText(
        row,
        [
          'product_name',
          'article_name',
          'product',
          'article',
        ],
        article
          ? getText(
              article,
              [
                'name',
                'nom',
                'title',
                'label',
              ],
              'Article'
            )
          : 'Article'
      );

      const amount = getNumber(row, [
        'amount',
        'sale_amount',
        'total_amount',
        'price',
        'credit_price',
      ]);

      const createdAt = getText(row, [
        'created_at',
        'sale_date',
        'date',
      ]);

      return {
        id: getText(row, ['id'], crypto.randomUUID()),
        customer,
        token,
        product,
        amount: formatAmount(amount),
        time: formatTime(createdAt),
        createdAt,
      };
    });

    setSales(mappedSales);
  }, [getCurrentProspector, supabase]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await loadSales();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    /**
     * Temps réel :
     * nouvelle vente = INSERT
     * modification = UPDATE
     * suppression = DELETE
     *
     * On écoute sales et payments afin que l'écran reste synchronisé * avec l'activité commerciale.
     */
    const channel = supabase
      .channel('prospector-sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        async (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          await loadSales();

          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Record<string, unknown>;
            const insertedId = getText(inserted, ['id']);

            if (insertedId) {
              setNewSaleIds((previous) => {
                const next = new Set(previous);
                next.add(insertedId);
                return next;
              });

              if (flashTimeoutsRef.current[insertedId]) {
                clearTimeout(flashTimeoutsRef.current[insertedId]);
              }

              flashTimeoutsRef.current[insertedId] = setTimeout(() => {
                setNewSaleIds((previous) => {
                  const next = new Set(previous);
                  next.delete(insertedId);
                  return next;
                });

                delete flashTimeoutsRef.current[insertedId];
              }, 5000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        async () => {
          await loadSales();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      mounted = false;

      Object.values(flashTimeoutsRef.current).forEach((timeout) => {
        clearTimeout(timeout);
      });

      flashTimeoutsRef.current = {};

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadSales, supabase]);

  const total = sales.reduce((sum, sale) => {
    const numericAmount = Number(
      sale.amount.replace(/[^\d,-]/g, '').replace(',', '.')
    );

    return sum + (Number.isFinite(numericAmount) ? numericAmount : 0);
  }, 0);

  return (
    <div className="bg-card border border-border rounded-xl card-glow overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-600 text-foreground">
          Ventes du Jour
        </h3>

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success pulse-gold" />

          <span className="text-xs font-700 font-mono-data text-primary">
            {loading
              ? '…'
              : `${sales.length} enregistrée${
                  sales.length !== 1 ? 's' : ''
                }`}
          </span>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skel-sale-${index}`}
              className="h-12 bg-muted/40 rounded animate-pulse"
            />
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && sales.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
            <CheckCircle2
              size={18}
              className="text-muted-foreground"
            />
          </div>

          <p className="text-sm font-500 text-foreground mb-1">
            Aucune vente aujourd&apos;hui
          </p>

          <p className="text-xs text-muted-foreground">
            Enregistrez votre première vente via le formulaire
            ci-dessus.
          </p>
        </div>
      )}

      {/* SALES */}
      {!loading && sales.length > 0 && (
        <div className="divide-y divide-border/50">
          {sales.map((sale, index) => {
            const isNew = newSaleIds.has(sale.id);

            return (
              <div
                key={sale.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors duration-300 ${
                  isNew
                    ? 'bg-success/20'
                    : index === 0
                    ? 'bg-success/5' :'hover:bg-primary/5'
                }`}
              >
                {/* ICON */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isNew
                      ? 'bg-success/30' :'bg-success/15'
                  }`}
                >
                  <CheckCircle2
                    size={14}
                    className="text-success"
                  />
                </div>

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-500 text-foreground truncate">
                      {sale.customer}
                    </span>

                    {isNew && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-success/20 text-success font-600 flex-shrink-0 animate-pulse">
                        ✓ Confirmé
                      </span>
                    )}

                    {!isNew && index === 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-success/15 text-success font-600 flex-shrink-0">
                        Dernier
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono-data text-primary">
                      {sale.token}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      ·
                    </span>

                    <span className="text-xs text-muted-foreground truncate">
                      {sale.product}
                    </span>
                  </div>
                </div>

                {/* AMOUNT */}
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-700 font-mono-data text-success">
                    {sale.amount}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {sale.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TOTAL */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Total aujourd&apos;hui
          </span>

          <span className="text-sm font-700 font-mono-data text-primary">
            {loading
              ? '…'
              : `${total.toLocaleString('fr-FR')} FCFA`}
          </span>
        </div>
      </div>
    </div>
  );
}