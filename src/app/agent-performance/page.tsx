'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  Coins,
  DollarSign,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

interface Prospecteur {
  id: string;
  organization_id: string;
  user_id: string | null;
  code: string;
  first_name: string;
  last_name: string;
  commission_rate: number | null;
  city: string | null;
  country: string | null;
}

interface SaleRow {
  id: string;
  sale_date: string;
  quantity: number | null;
  amount_paid: number | null;
  amount_remaining: number | null;
  status: string | null;
}

interface DailyTokenRow {
  id: string;
  token_date: string;
  expected_amount: number | null;
  paid_amount: number | null;
  status: string | null;
}

interface CommissionRow {
  id: string;
  commission_rate: number | null;
  base_amount: number | null;
  commission_amount: number | null;
  status: string | null;
  created_at: string;
}

interface DailyPoint {
  date: string;
  day: string;
  sales: number;
  commission: number;
  tokens: number;
}

interface PerformanceData {
  prospecteur: Prospecteur;
  sales: SaleRow[];
  tokens: DailyTokenRow[];
  commissions: CommissionRow[];
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

function formatXOF(value: number) {
  return `${currencyFormatter.format(Math.round(value))} FCFA`;
}

function formatShortXOF(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLastSevenDays() {
  const days: Date[] = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    days.push(date);
  }

  return days;
}

function isSuccessfulStatus(status: string | null | undefined) {
  if (!status) return true;

  return ['successful', 'success', 'paid', 'active', 'completed'].includes(
    status.toLowerCase()
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-3 text-xs shadow-modal">
      <div className="mb-2 font-semibold text-foreground">{label}</div>

      {payload.map((entry) => (
        <div
          key={`tooltip-${entry.name}`}
          className="mb-1 flex items-center gap-2"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background: entry.color ?? 'var(--primary)',
            }}
          />

          <span className="text-muted-foreground">{entry.name} :</span>

          <span className="font-mono-data font-semibold text-foreground">
            {entry.name.toLowerCase().includes('commission')
              ? formatShortXOF(Number(entry.value))
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const supabase = createClient();

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPerformance = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error('Utilisateur non authentifié.');
      }

      const { data: prospecteur, error: prospecteurError } = await supabase
        .from('prospecteurs')
        .select(
          `
            id,
            organization_id,
            user_id,
            code,
            first_name,
            last_name,
            commission_rate,
            city,
            country
          `
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (prospecteurError) {
        throw prospecteurError;
      }

      if (!prospecteur) {
        throw new Error(
          'Aucun compte prospecteur actif n\u2019est associé à cet utilisateur.'
        );
      }

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(
          `
            id,
            sale_date,
            quantity,
            amount_paid,
            amount_remaining,
            status
          `
        )
        .eq('organization_id', prospecteur.organization_id)
        .eq('prospecteur_id', prospecteur.id)
        .order('sale_date', { ascending: false });

      if (salesError) {
        throw salesError;
      }

      const { data: tokens, error: tokensError } = await supabase
        .from('daily_tokens')
        .select(
          `
            id,
            token_date,
            expected_amount,
            paid_amount,
            status
          `
        )
        .eq('organization_id', prospecteur.organization_id)
        .eq('prospecteur_id', prospecteur.id)
        .order('token_date', { ascending: false });

      if (tokensError) {
        throw tokensError;
      }

      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select(
          `
            id,
            commission_rate,
            base_amount,
            commission_amount,
            status,
            created_at
          `
        )
        .eq('organization_id', prospecteur.organization_id)
        .eq('prospecteur_id', prospecteur.id)
        .order('created_at', { ascending: false });

      if (commissionsError) {
        throw commissionsError;
      }

      setData({
        prospecteur,
        sales: sales ?? [],
        tokens: tokens ?? [],
        commissions: commissions ?? [],
      });
    } catch (error) {
      console.error('[JDV CRM] Erreur performance prospecteur:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger les performances du prospecteur.'
      );

      setData(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  useEffect(() => {
    if (!data?.prospecteur.organization_id || !data.prospecteur.id) {
      return;
    }

    const organizationId = data.prospecteur.organization_id;
    const prospecteurId = data.prospecteur.id;

    const channel = supabase
      .channel(`prospecteur-performance-${prospecteurId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          void loadPerformance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tokens',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          void loadPerformance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          void loadPerformance();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [data?.prospecteur.organization_id, data?.prospecteur.id, loadPerformance, supabase]);

  const dailyData = useMemo<DailyPoint[]>(() => {
    if (!data) return [];

    const days = getLastSevenDays();

    return days.map((date) => {
      const dateKey = getDateKey(date);

      const daySales = data.sales.filter(
        (sale) =>
          normalizeDate(sale.sale_date) === dateKey &&
          isSuccessfulStatus(sale.status)
      );

      const dayCommissions = data.commissions.filter(
        (commission) =>
          normalizeDate(commission.created_at) === dateKey &&
          isSuccessfulStatus(commission.status)
      );

      const dayTokens = data.tokens.filter(
        (token) =>
          normalizeDate(token.token_date) === dateKey &&
          isSuccessfulStatus(token.status)
      );

      return {
        date: dateKey,
        day: date.toLocaleDateString('fr-FR', {
          weekday: 'short',
          day: '2-digit',
        }),
        sales: daySales.reduce(
          (total, sale) => total + Number(sale.quantity ?? 1),
          0
        ),
        commission: dayCommissions.reduce(
          (total, commission) =>
            total + Number(commission.commission_amount ?? 0),
          0
        ),
        tokens: dayTokens.reduce(
          (total, token) => total + Number(token.paid_amount ?? 0),
          0
        ),
      };
    });
  }, [data]);

  const todayKey = getDateKey(new Date());

  const todaySales = useMemo(() => {
    if (!data) return 0;

    return data.sales
      .filter(
        (sale) =>
          normalizeDate(sale.sale_date) === todayKey &&
          isSuccessfulStatus(sale.status)
      )
      .reduce((total, sale) => total + Number(sale.quantity ?? 1), 0);
  }, [data, todayKey]);

  const todayCommission = useMemo(() => {
    if (!data) return 0;

    return data.commissions
      .filter(
        (commission) =>
          normalizeDate(commission.created_at) === todayKey &&
          isSuccessfulStatus(commission.status)
      )
      .reduce(
        (total, commission) =>
          total + Number(commission.commission_amount ?? 0),
        0
      );
  }, [data, todayKey]);

  const weekSales = useMemo(
    () => dailyData.reduce((total, item) => total + item.sales, 0),
    [dailyData]
  );

  const weekCommission = useMemo(
    () => dailyData.reduce((total, item) => total + item.commission, 0),
    [dailyData]
  );

  const weekTokens = useMemo(
    () => dailyData.reduce((total, item) => total + item.tokens, 0),
    [dailyData]
  );

  const tokenBalance = useMemo(() => {
    if (!data) return 0;

    const todayTokens = data.tokens.filter(
      (token) => normalizeDate(token.token_date) === todayKey
    );

    const expected = todayTokens.reduce(
      (total, token) => total + Number(token.expected_amount ?? 0),
      0
    );

    const paid = todayTokens.reduce(
      (total, token) => total + Number(token.paid_amount ?? 0),
      0
    );

    return Math.max(0, expected - paid);
  }, [data, todayKey]);

  const commissionRate = data?.prospecteur.commission_rate ?? 0;

  const dailyTarget = 30;

  const targetPercentage =
    dailyTarget > 0
      ? Math.min(100, Math.round((todaySales / dailyTarget) * 100))
      : 0;

  const initials = data?.prospecteur
    ? `${data.prospecteur.first_name?.[0] ?? ''}${
        data.prospecteur.last_name?.[0] ?? ''
      }`.toUpperCase()
    : 'PR';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-primary/15 glass-panel px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/terrain/dashboard"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              aria-label="Retour au tableau de bord"
            >
              <ArrowLeft size={16} />
            </Link>

            <AppLogo size={24} />

            <div>
              <div className="text-sm font-bold text-foreground">
                Performance du prospecteur
              </div>

              <div className="text-xs text-muted-foreground">
                {loading ? 'Chargement…' : data?.prospecteur.code ?? '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-xs font-semibold text-success">En direct</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-4">
        {errorMessage && (
          <div className="rounded-xl border border-danger/20 bg-danger/10 p-4">
            <div className="text-sm font-semibold text-danger">
              Impossible de charger les performances
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              {errorMessage}
            </div>

            <button
              type="button"
              onClick={() => void loadPerformance()}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && data && (
          <section className="flex items-center gap-4 rounded-xl border border-primary/20 bg-card p-4 card-glow-gold">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gold-gradient-bg">
              <span className="text-base font-bold text-primary-foreground">
                {initials}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold text-foreground">
                {data.prospecteur.first_name} {data.prospecteur.last_name}
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{data.prospecteur.code}</span>

                {data.prospecteur.city && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>{data.prospecteur.city}</span>
                  </>
                )}
              </div>
            </div>

            <Link
              href="/terrain/dashboard"
              className="text-xs font-semibold text-primary transition-colors hover:text-accent"
            >
              Dashboard
            </Link>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 rounded-xl border border-primary/20 bg-card p-4 card-glow">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Target size={16} className="text-primary" />
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Objectif du jour
                  </div>

                  <div className="font-mono-data text-2xl font-bold text-foreground">
                    {loading ? '…' : `${todaySales} / ${dailyTarget}`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono-data text-2xl font-bold text-primary">
                  {loading ? '…' : `${targetPercentage}%`}
                </div>

                <div className="text-xs text-muted-foreground">
                  réalisation
                </div>
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gold-gradient-bg transition-all duration-700"
                style={{
                  width: loading ? '0%' : `${targetPercentage}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {loading ? '…' : `${todaySales} vente(s) aujourd'hui`}
              </span>

              {!loading && targetPercentage >= 100 && (
                <span className="text-xs font-semibold text-success">
                  Objectif atteint
                </span>
              )}

              {!loading && targetPercentage >= 80 && targetPercentage < 100 && (
                <span className="text-xs font-semibold text-warning">
                  Presque atteint
                </span>
              )}

              {!loading && targetPercentage < 80 && (
                <span className="text-xs text-muted-foreground">
                  {Math.max(0, dailyTarget - todaySales)} restante(s)
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-warning/20 bg-warning/10 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20">
              <Coins size={16} className="text-warning" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ventes cette semaine
            </div>

            <div className="font-mono-data text-2xl font-bold text-warning">
              {loading ? '…' : weekSales}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
              ventes enregistrées
            </div>
          </div>

          <div className="rounded-xl border border-success/20 bg-success/10 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
              <DollarSign size={16} className="text-success" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Commission semaine
            </div>

            <div className="font-mono-data text-2xl font-bold text-success">
              {loading ? '…' : formatXOF(weekCommission)}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
              commission enregistrée
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 card-glow">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <DollarSign size={16} className="text-muted-foreground" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Commission aujourd'hui
            </div>

            <div className="font-mono-data text-2xl font-bold text-foreground">
              {loading ? '…' : formatXOF(todayCommission)}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
              gagnée aujourd'hui
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Wallet size={16} className="text-primary" />
            </div>

            <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Solde tokens
            </div>

            <div className="font-mono-data text-2xl font-bold text-primary">
              {loading ? '…' : formatXOF(tokenBalance)}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
              restant aujourd'hui
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 card-glow">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <TrendingUp size={16} className="text-primary" />
            </div>

            <div>
              <div className="text-sm font-semibold text-foreground">
                Évolution des ventes
              </div>

              <div className="text-xs text-muted-foreground">
                7 derniers jours
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-[200px] animate-pulse rounded bg-muted/20" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={dailyData}
                margin={{
                  top: 4,
                  right: 4,
                  left: -20,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="jdvSalesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Ventes"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#jdvSalesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4 card-glow">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15">
              <DollarSign size={16} className="text-success" />
            </div>

            <div>
              <div className="text-sm font-semibold text-foreground">
                Évolution des commissions
              </div>

              <div className="text-xs text-muted-foreground">
                Commissions quotidiennes en FCFA
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-[180px] animate-pulse rounded bg-muted/20" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={dailyData}
                barSize={24}
                margin={{
                  top: 4,
                  right: 4,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatShortXOF(Number(value))}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="commission"
                  name="Commission"
                  fill="var(--success)"
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card card-glow">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Détail des 7 derniers jours
            </h3>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Ventes, tokens et commissions
            </p>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={`performance-skeleton-${index}`}
                  className="h-10 animate-pulse rounded bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {dailyData.map((row, index) => {
                const isToday = index === dailyData.length - 1;

                return (
                  <div
                    key={row.date}
                    className={`flex items-center justify-between px-4 py-3 ${
                      isToday ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          row.sales > 0
                            ? 'bg-success' :'bg-muted-foreground/30'
                        }`}
                      />

                      <div>
                        <span
                          className={`text-sm ${
                            isToday
                              ? 'font-semibold text-primary' :'font-medium text-foreground'
                          }`}
                        >
                          {row.day}
                        </span>

                        {isToday && (
                          <span className="ml-2 text-xs font-semibold text-primary">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="font-mono-data text-sm font-semibold text-foreground">
                          {row.sales}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          ventes
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono-data text-sm font-semibold text-primary">
                          {formatShortXOF(row.tokens)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          tokens
                        </div>
                      </div>

                      <div className="min-w-[70px] text-right">
                        <div className="font-mono-data text-sm font-semibold text-success">
                          {formatShortXOF(row.commission)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          commission
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-border bg-muted/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total semaine
              </span>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <span className="font-mono-data text-sm font-bold text-foreground">
                    {loading ? '…' : weekSales}
                  </span>

                  <span className="ml-1 text-xs text-muted-foreground">
                    ventes
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono-data text-sm font-bold text-success">
                    {loading ? '…' : formatShortXOF(weekCommission)}
                  </span>

                  <div className="text-xs text-muted-foreground">commission</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {!loading && data && (
          <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Taux de commission
                </div>

                <div className="mt-1 font-mono-data text-xl font-bold text-primary">
                  {commissionRate.toFixed(2)} %
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  Tokens encaissés cette semaine
                </div>

                <div className="mt-1 font-mono-data text-lg font-bold text-foreground">
                  {formatXOF(weekTokens)}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
