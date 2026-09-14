'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';

const StockGaugesInner = dynamic(
  () => import('./StockGaugesInner'),
  { ssr: false }
);

interface StockItem {
  id: string;
  article_id: string | null;
  name: string;
  sku: string;
  total: number;
  remaining: number;
  unit: string;
}

interface ArticleData {
  id: string;
  name?: string | null;
  code?: string | null;
  sku?: string | null;
  unit?: string | null;
}

interface StockData {
  id: string;
  organization_id: string;
  article_id: string | null;
  quantity?: number | null;
  initial_quantity?: number | null;
  current_quantity?: number | null;
  remaining_quantity?: number | null;
  total_quantity?: number | null;
  unit?: string | null;
}

export default function AdminStockPanel() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStock();

    const supabase = createClient();

    /*
     * Actualisation automatique du stock.
     * On écoute les mouvements de stock et les modifications
     * de la table stocks.
     */
    const channel = supabase
      .channel('admin-stock-panel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stocks',
        },
        () => {
          loadStock();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_movements',
        },
        () => {
          loadStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStock = async () => {
    try {
      setLoading(true);

      const supabase = createClient();

      /*
       * ---------------------------------------------------------
       * 1. UTILISATEUR CONNECTÉ
       * ---------------------------------------------------------
       */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStockItems([]);
        return;
      }

      /*
       * ---------------------------------------------------------
       * 2. ORGANISATION DE L'ADMIN
       * ---------------------------------------------------------
       */
      const { data: membership, error: membershipError } =
        await supabase
          .from('organization_members')
          .select(
            'organization_id, role, status'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

      if (membershipError) {
        console.error(
          'Erreur membership stock:',
          membershipError
        );

        setStockItems([]);
        return;
      }

      if (!membership?.organization_id) {
        setStockItems([]);
        return;
      }

      const organizationId =
        membership.organization_id;

      /*
       * ---------------------------------------------------------
       * 3. STOCKS DE L'ORGANISATION
       *
       * On ne récupère QUE les stocks de l'entreprise * de l'administrateur connecté.
       * ---------------------------------------------------------
       */
      const {
        data: stocks,
        error: stocksError,
      } = await supabase
        .from('stocks')
        .select('*')
        .eq(
          'organization_id',
          organizationId
        );

      if (stocksError) {
        console.error(
          'Erreur récupération stocks:',
          stocksError
        );

        setStockItems([]);
        return;
      }

      if (!stocks || stocks.length === 0) {
        setStockItems([]);
        return;
      }

      /*
       * ---------------------------------------------------------
       * 4. ARTICLES ASSOCIÉS
       * ---------------------------------------------------------
       */
      const articleIds = Array.from(
        new Set(
          stocks
            .map(
              (stock: StockData) =>
                stock.article_id
            )
            .filter(Boolean)
        )
      );

      let articles: ArticleData[] = [];

      if (articleIds.length > 0) {
        const {
          data: articleData,
          error: articlesError,
        } = await supabase
          .from('articles')
          .select('*')
          .in('id', articleIds);

        if (articlesError) {
          console.error(
            'Erreur récupération articles:',
            articlesError
          );
        } else {
          articles =
            (articleData as ArticleData[]) || [];
        }
      }

      /*
       * ---------------------------------------------------------
       * 5. CONSTRUCTION DU TABLEAU POUR L'INTERFACE
       * ---------------------------------------------------------
       */
      const formattedStocks: StockItem[] =
        (stocks as StockData[]).map(
          (stock) => {
            const article =
              articles.find(
                (item) =>
                  item.id ===
                  stock.article_id
              );

            /*
             * Plusieurs noms de colonnes sont tolérés
             * afin que le composant reste compatible avec
             * l'évolution de la structure stocks.
             */
            const total =
              Number(
                stock.initial_quantity ??
                  stock.total_quantity ??
                  stock.quantity ??
                  0
              );

            const remaining =
              Number(
                stock.current_quantity ??
                  stock.remaining_quantity ??
                  stock.quantity ??
                  0
              );

            return {
              id: stock.id,

              article_id:
                stock.article_id,

              name:
                article?.name ||
                'Article sans nom',

              sku:
                article?.sku ||
                article?.code ||
                stock.article_id ||
                'N/A',

              total: Math.max(
                0,
                total
              ),

              remaining: Math.max(
                0,
                remaining
              ),

              unit:
                stock.unit ||
                article?.unit ||
                'unités',
            };
          }
        );

      setStockItems(formattedStocks);
    } catch (error) {
      console.error(
        'Erreur chargement stock ADMIN:',
        error
      );

      setStockItems([]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * SANTÉ GLOBALE DU STOCK
   * ---------------------------------------------------------
   */
  const overallHealth =
    stockItems.length > 0
      ? Math.round(
          (stockItems.reduce(
            (sum, item) => {
              const pct =
                item.total > 0
                  ? item.remaining /
                    item.total
                  : 0;

              return sum + pct;
            },
            0
          ) /
            stockItems.length) *
            100
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * ARTICLES SOUS 20 %
   * ---------------------------------------------------------
   */
  const lowStockCount =
    stockItems.filter((item) => {
      const pct =
        item.total > 0
          ? item.remaining /
            item.total
          : 0;

      return pct < 0.2;
    }).length;

  return (
    <div className="bg-card border border-border rounded-xl p-5 card-glow h-full">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-600 text-foreground">
            Niveaux de Stock
          </h3>

          <p className="text-xs text-muted-foreground mt-0.5">
            État de l&apos;inventaire en temps réel
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-500 text-primary hover:text-accent transition-colors duration-150"
        >
          Réapprovisionner →
        </button>
      </div>

      {/* =====================================================
          CHARGEMENT
      ===================================================== */}
      {loading && (
        <div className="space-y-4">
          {Array.from({
            length: 4,
          }).map((_, i) => (
            <div
              key={`skel-stock-${i}`}
              className="h-16 bg-muted/40 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* =====================================================
          AUCUN STOCK
      ===================================================== */}
      {!loading &&
        stockItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-500 text-foreground mb-1">
              Aucun stock
            </p>

            <p className="text-xs text-muted-foreground">
              Aucun article n&apos;a encore été
              ajouté à l&apos;inventaire.
            </p>
          </div>
        )}

      {/* =====================================================
          LISTE DES STOCKS
      ===================================================== */}
      {!loading &&
        stockItems.length > 0 && (
          <div className="space-y-4">
            {stockItems.map((item) => {
              const pct =
                item.total > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (item.remaining /
                          item.total) *
                          100
                      )
                    )
                  : 0;

              const isLow =
                pct < 20;

              const isWarning =
                pct < 40 && !isLow;

              const barColor = isLow
                ? 'bg-danger'
                : isWarning
                ? 'bg-warning' :'bg-primary';

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    isLow
                      ? 'bg-danger/5 border-danger/20'
                      : isWarning
                      ? 'bg-warning/5 border-warning/20' :'bg-muted/30 border-border'
                  }`}
                >
                  {/* Article + quantité */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <div className="text-xs font-600 text-foreground">
                        {item.name}
                      </div>

                      <div className="text-xs font-mono-data text-muted-foreground">
                        {item.sku}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-700 font-mono-data ${
                          isLow
                            ? 'text-danger'
                            : isWarning
                            ? 'text-warning' :'text-foreground'
                        }`}
                      >
                        {item.remaining.toLocaleString(
                          'fr-FR'
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {item.unit}
                      </div>
                    </div>
                  </div>

                  {/* Barre */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{
                        width: `${pct}%`,
                      }}
                    />
                  </div>

                  {/* Etat */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {pct}% restant
                    </span>

                    {isLow && (
                      <span className="text-xs font-600 text-danger">
                        ⚠ Critique
                      </span>
                    )}

                    {isWarning && (
                      <span className="text-xs font-600 text-warning">
                        Stock faible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* =====================================================
          JAUGES
      ===================================================== */}
      <div className="mt-4 pt-4 border-t border-border">
        <StockGaugesInner
          overallHealth={overallHealth}
          lowStockCount={lowStockCount}
        />
      </div>
    </div>
  );
}