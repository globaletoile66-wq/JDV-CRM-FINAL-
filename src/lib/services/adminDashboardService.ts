import { createClient } from '@/lib/supabase/client';

/* ============================================================================
 * JDV CRM — ADMIN / PROSPECTEUR DASHBOARD SERVICE
 *
 * Nouvelle architecture :
 *
 * auth.users
 *    ↓
 * profiles
 *    ↓
 * organization_members
 *    ↓
 * organizations
 *
 * Prospecteur :
 * prospecteurs
 *    ↓
 * sales / payments / daily_tokens / commissions
 *
 * IMPORTANT :
 * - Aucun usage de public.users
 * - Aucun enterprise_id
 * - Aucun enterprise
 * - Aucun paiements_journaliers
 * - Aucun contrats_vente
 * ========================================================================== */

const COMMISSION_FALLBACK = 0.065;

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function todayStart(): string {
  const date = new Date();

  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

function todayEnd(): string {
  const date = new Date();

  date.setHours(23, 59, 59, 999);

  return date.toISOString();
}

function daysAgoStart(days: number): Date {
  const date = new Date();

  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);

  return date;
}

function formatTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(
  amount: number,
  currency = 'XOF'
): string {
  return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency}`;
}

function formatNumber(amount: number): string {
  return Number(amount || 0).toLocaleString('fr-FR');
}

function dayLabel(daysAgo: number): string {
  const date = new Date();

  date.setDate(date.getDate() - daysAgo);

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = 'Agent'
): string {
  const name = [
    normalizeText(firstName),
    normalizeText(lastName),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || fallback;
}

function getDateValue(
  row: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = row[key];

    if (value) {
      return String(value);
    }
  }

  return null;
}

function getNumericValue(
  row: Record<string, unknown>,
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const number = Number(value);

      if (!Number.isNaN(number)) {
        return number;
      }
    }
  }

  return 0;
}

function isSuccessfulPayment(
  status: unknown
): boolean {
  const value = normalizeText(status).toLowerCase();

  return (
    value === 'successful' ||
    value === 'success' ||
    value === 'paid' ||
    value === 'approved'
  );
}

/* ============================================================================
 * ORGANIZATION CONTEXT
 * ========================================================================== */

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

async function getMyOrganizationId(): Promise<string | null> {
  const supabase = createClient();

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['business_admin', 'manager', 'accountant', 'viewer'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.organization_id;
}

async function getMyBusinessMembership(): Promise<{
  organization_id: string;
  role: string;
} | null> {
  const supabase = createClient();

  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('role', 'business_admin')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    organization_id: data.organization_id,
    role: data.role,
  };
}

/* ============================================================================
 * TYPES
 * ========================================================================== */

export interface ProspectorRow {
  id: string;
  code: string;
  name: string;
  region: string;
  team: string;
  todaySales: number;
  tokens: number;
  commission: string;
  cashVolume: string;
  status: string;
  lastSeen: string;
  target: number;
}

export interface StockRow {
  id: string;
  sku: string;
  name: string;
  total: number;
  remaining: number;
  unit: string;
}

export interface TokenDataPoint {
  date: string;
  issued: number;
  redeemed: number;
}

export interface KPIData {
  dailyTokenRedemptionPct: number;
  dailyTokenRedeemed: number;
  dailyTokenIssued: number;
  activeProspectors: number;
  offlineProspectors: number;
  totalProspectors: number;
  totalStockUnits: number;
  lowStockCount: number;
  cashSalesVolume: number;
  commissionToday: number;
  activeAlerts: number;
}

export interface RecentSaleRow {
  id: string;
  agent: string;
  code: string;
  token: string;
  product: string;
  amount: string;
  time: string;
  region: string;
}

export interface ProspectRow {
  id: string;
  name: string;
  phone: string;
  type: string;
  productName: string;
  lastContact: string;
  purchaseDate: string | null;
}

export interface AgentSaleRow {
  id: string;
  time: string;
  token: string;
  customer: string;
  product: string;
  amount: string;
}

export interface AgentKPIData {
  todaySales: number;
  todayTarget: number;
  tokenBalance: number;
  commissionToday: number;
  commissionWeek: number;
  tokensEarnedWeek: number;
  agentName: string;
  agentCode: string;
  region: string;
  team: string;
}

export interface DailySalePoint {
  day: string;
  sales: number;
  commission: number;
}

/* ============================================================================
 * PROSPECTEURS — ADMIN
 * ========================================================================== */

export async function fetchProspectors(): Promise<
  ProspectorRow[]
> {
  const supabase = createClient();

  try {
    const organizationId =
      await getMyOrganizationId();

    if (!organizationId) {
      return [];
    }

    const { data: prospectors, error } =
      await supabase
        .from('prospecteurs')
        .select(`
          id,
          organization_id,
          user_id,
          code,
          first_name,
          last_name,
          phone,
          email,
          address,
          city,
          country,
          status,
          commission_rate
        `)
        .eq('organization_id', organizationId)
        .order('created_at', {
          ascending: false,
        });

    if (error || !prospectors) {
      console.error(
        'fetchProspectors:',
        error?.message
      );

      return [];
    }

    if (prospectors.length === 0) {
      return [];
    }

    const prospectorIds =
      prospectors.map((p: { id: string }) => p.id);

    const [
      salesResult,
      paymentsResult,
      commissionsResult,
      tokensResult,
    ] = await Promise.all([
      supabase
        .from('sales')
        .select(
          'id, prospecteur_id, sale_date, amount_paid'
        )
        .eq('organization_id', organizationId)
        .in('prospecteur_id', prospectorIds)
        .gte('sale_date', todayStart())
        .lte('sale_date', todayEnd()),

      supabase
        .from('payments')
        .select(
          'id, prospecteur_id, amount, payment_date, status'
        )
        .eq('organization_id', organizationId)
        .in('prospecteur_id', prospectorIds)
        .gte('payment_date', todayStart())
        .lte('payment_date', todayEnd()),

      supabase
        .from('commissions')
        .select(
          'id, prospecteur_id, commission_amount, status'
        )
        .eq('organization_id', organizationId)
        .in('prospecteur_id', prospectorIds)
        .gte('created_at', todayStart())
        .lte('created_at', todayEnd()),

      supabase
        .from('daily_tokens')
        .select(
          'id, prospecteur_id, status, created_at'
        )
        .eq('organization_id', organizationId)
        .in('prospecteur_id', prospectorIds)
        .gte('created_at', todayStart())
        .lte('created_at', todayEnd()),
    ]);

    const sales = salesResult.data ?? [];
    const payments = paymentsResult.data ?? [];
    const commissions =
      commissionsResult.data ?? [];
    const tokens = tokensResult.data ?? [];

    return prospectors.map((prospector: any) => {
      const prospecteurId = prospector.id;

      const userSales = sales.filter(
        (sale: any) =>
          sale.prospecteur_id === prospecteurId
      );

      const userPayments = payments.filter(
        (payment: any) =>
          payment.prospecteur_id === prospecteurId &&
          isSuccessfulPayment(payment.status)
      );

      const userCommissions =
        commissions.filter(
          (commission: any) =>
            commission.prospecteur_id ===
            prospecteurId
        );

      const userTokens = tokens.filter(
        (token: any) =>
          token.prospecteur_id === prospecteurId
      );

      const cashVolume =
        userPayments.reduce(
          (sum: number, payment: any) =>
            sum + Number(payment.amount || 0),
          0
        );

      const commissionFromDb =
        userCommissions.reduce(
          (sum: number, commission: any) =>
            sum +
            Number(
              commission.commission_amount || 0
            ),
          0
        );

      const commission =
        userCommissions.length > 0
          ? commissionFromDb
          : cashVolume *
            Number(
              prospector.commission_rate ||
                COMMISSION_FALLBACK
            );

      const latestActivity =
        [
          ...userPayments.map(
            (payment: any) => payment.payment_date
          ),
          ...userSales.map(
            (sale: any) => sale.sale_date
          ),
          ...userTokens.map(
            (token: any) => token.created_at
          ),
        ]
          .filter(Boolean)
          .sort(
            (a, b) =>
              new Date(b).getTime() -
              new Date(a).getTime()
          )[0] ?? null;

      let status = 'offline';
      let lastSeen =
        "Aucune activité aujourd'hui";

      if (latestActivity) {
        const minutesAgo = Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(
                latestActivity
              ).getTime()) /
              60000
          )
        );

        if (minutesAgo < 15) {
          status = 'active';
          lastSeen =
            minutesAgo <= 1
              ? "À l'instant"
              : `Il y a ${minutesAgo} min`;
        } else if (minutesAgo < 60) {
          status = 'idle';
          lastSeen = `Il y a ${minutesAgo} min`;
        } else {
          status = 'offline';

          const hoursAgo =
            Math.floor(minutesAgo / 60);

          lastSeen = `Il y a ${hoursAgo} h`;
        }
      }

      const region =
        prospector.city ||
        prospector.country ||
        'Non assigné';

      const firstTeamWord =
        region.split(' ')[0] || 'Alpha';

      return {
        id: prospector.id,
        code:
          prospector.code ||
          `PROS-${prospector.id
            .slice(0, 6)
            .toUpperCase()}`,

        name: getDisplayName(
          prospector.first_name,
          prospector.last_name
        ),

        region,

        team: `Équipe ${firstTeamWord}`,

        todaySales: userSales.length,

        tokens: userTokens.length,

        commission: formatCurrency(
          commission
        ),

        cashVolume: formatCurrency(
          cashVolume
        ),

        status,
        lastSeen,

        target: 25,
      };
    });
  } catch (error) {
    console.error(
      'fetchProspectors error:',
      error
    );

    return [];
  }
}

/* ============================================================================
 * STOCK
 * ========================================================================== */

export async function fetchStockLevels(): Promise<
  StockRow[]
> {
  const supabase = createClient();

  try {
    const organizationId =
      await getMyOrganizationId();

    if (!organizationId) {
      return [];
    }

    const { data, error } = await supabase
      .from('stocks')
      .select(`
        id,
        organization_id,
        article_id,
        quantity,
        reserved_quantity,
        minimum_quantity,
        articles (
          id,
          code,
          name,
          unit
        )
      `)
      .eq('organization_id', organizationId)
      .order('quantity', {
        ascending: true,
      });

    if (error || !data) {
      console.error(
        'fetchStockLevels:',
        error?.message
      );

      return [];
    }

    return data.map((stock: any) => {
      const article =
        Array.isArray(stock.articles)
          ? stock.articles[0]
          : stock.articles;

      const quantity =
        Number(stock.quantity || 0);

      const reserved =
        Number(
          stock.reserved_quantity || 0
        );

      return {
        id: stock.id,

        sku:
          article?.code ||
          `ART-${stock.article_id
            ?.slice(0, 6)
            .toUpperCase()}`,

        name:
          article?.name ||
          'Article',

        total:
          quantity + reserved,

        remaining:
          Math.max(
            0,
            quantity - reserved
          ),

        unit:
          article?.unit ||
          'unités',
      };
    });
  } catch (error) {
    console.error(
      'fetchStockLevels error:',
      error
    );

    return [];
  }
}

/* ============================================================================
 * TOKEN TREND — 14 JOURS
 * ========================================================================== */

export async function fetchTokenTrend(): Promise<
  TokenDataPoint[]
> {
  const supabase = createClient();

  try {
    const organizationId =
      await getMyOrganizationId();

    if (!organizationId) {
      return buildEmptyTrend();
    }

    const since =
      daysAgoStart(13).toISOString();

    const { data, error } = await supabase
      .from('daily_tokens')
      .select(`
        id,
        token_date,
        status,
        created_at
      `)
      .eq('organization_id', organizationId)
      .gte('token_date', since.slice(0, 10))
      .order('token_date', {
        ascending: true,
      });

    if (error || !data) {
      console.error(
        'fetchTokenTrend:',
        error?.message
      );

      return buildEmptyTrend();
    }

    const byDay: Record<
      string,
      {
        issued: number;
        redeemed: number;
      }
    > = {};

    for (let i = 13; i >= 0; i--) {
      const label = dayLabel(i);

      byDay[label] = {
        issued: 0,
        redeemed: 0,
      };
    }

    for (const token of data) {
      const dateValue =
        token.token_date ||
        token.created_at;

      if (!dateValue) {
        continue;
      }

      const label =
        new Date(
          dateValue
        ).toLocaleDateString(
          'fr-FR',
          {
            day: '2-digit',
            month: 'short',
          }
        );

      if (!byDay[label]) {
        continue;
      }

      byDay[label].issued += 1;

      if (
        token.status === 'paid' ||
        token.status === 'partial'
      ) {
        byDay[label].redeemed += 1;
      }
    }

    return Object.entries(
      byDay
    ).map(([date, values]) => ({
      date,
      issued: values.issued,
      redeemed: values.redeemed,
    }));
  } catch (error) {
    console.error(
      'fetchTokenTrend error:',
      error
    );

    return buildEmptyTrend();
  }
}

function buildEmptyTrend(): TokenDataPoint[] {
  return Array.from(
    { length: 14 },
    (_, index) => ({
      date: dayLabel(
        13 - index
      ),
      issued: 0,
      redeemed: 0,
    })
  );
}

/* ============================================================================
 * ADMIN KPIs
 * ========================================================================== */

export async function fetchKPIs(): Promise<KPIData> {
  const supabase = createClient();

  try {
    const organizationId =
      await getMyOrganizationId();

    if (!organizationId) {
      return emptyKPIs();
    }

    const [
      prospectorsResult,
      tokensResult,
      salesResult,
      paymentsResult,
      commissionsResult,
      stocksResult,
    ] = await Promise.all([
      supabase
        .from('prospecteurs')
        .select(
          'id, commission_rate, status'
        )
        .eq(
          'organization_id',
          organizationId
        ),

      supabase
        .from('daily_tokens')
        .select(
          'id, prospecteur_id, status, expected_amount, paid_amount'
        )
        .eq(
          'organization_id',
          organizationId
        )
        .gte(
          'token_date',
          new Date()
            .toISOString()
            .slice(0, 10)
        ),

      supabase
        .from('sales')
        .select(
          'id, prospecteur_id, amount_paid, sale_date, status'
        )
        .eq(
          'organization_id',
          organizationId
        )
        .gte(
          'sale_date',
          todayStart()
        )
        .lte(
          'sale_date',
          todayEnd()
        ),

      supabase
        .from('payments')
        .select(
          'id, prospecteur_id, amount, payment_date, status'
        )
        .eq(
          'organization_id',
          organizationId
        )
        .gte(
          'payment_date',
          todayStart()
        )
        .lte(
          'payment_date',
          todayEnd()
        ),

      supabase
        .from('commissions')
        .select(
          'id, prospecteur_id, commission_amount, status, created_at'
        )
        .eq(
          'organization_id',
          organizationId
        )
        .gte(
          'created_at',
          todayStart()
        )
        .lte(
          'created_at',
          todayEnd()
        ),

      supabase
        .from('stocks')
        .select(
          'id, quantity, reserved_quantity, minimum_quantity'
        )
        .eq(
          'organization_id',
          organizationId
        ),
    ]);

    const prospectors =
      prospectorsResult.data ?? [];

    const tokens =
      tokensResult.data ?? [];

    const sales =
      salesResult.data ?? [];

    const payments =
      paymentsResult.data ?? [];

    const commissions =
      commissionsResult.data ?? [];

    const stocks =
      stocksResult.data ?? [];

    const totalProspectors =
      prospectors.length;

    const dailyTokenIssued =
      tokens.length;

    const dailyTokenRedeemed =
      tokens.filter(
        (token: any) =>
          token.status === 'paid'
      ).length;

    const dailyTokenRedemptionPct =
      dailyTokenIssued > 0
        ? Math.round(
            (dailyTokenRedeemed /
              dailyTokenIssued) *
              1000
          ) / 10
        : 0;

    const cashSalesVolume =
      payments
        .filter((payment: any) =>
          isSuccessfulPayment(
            payment.status
          )
        )
        .reduce(
          (sum: number, payment: any) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );

    const commissionToday =
      commissions.length > 0
        ? commissions.reduce(
            (sum: number, commission: any) =>
              sum +
              Number(
                commission.commission_amount ||
                  0
              ),
            0
          )
        : cashSalesVolume *
          COMMISSION_FALLBACK;

    const totalStockUnits =
      stocks.reduce(
        (sum: number, stock: any) =>
          sum +
          Math.max(
            0,
            Number(
              stock.quantity || 0
            ) -
              Number(
                stock.reserved_quantity ||
                  0
              )
          ),
        0
      );

    const lowStockCount =
      stocks.filter(
        (stock: any) =>
          Number(stock.quantity || 0) <=
          Number(
            stock.minimum_quantity || 0
          )
      ).length;

    const fifteenMinutesAgo =
      Date.now() -
      15 * 60 * 1000;

    const activeProspectorIds =
      new Set<string>();

    for (const payment of payments) {
      if (
        payment.prospecteur_id &&
        new Date(
          payment.payment_date
        ).getTime() >=
          fifteenMinutesAgo
      ) {
        activeProspectorIds.add(
          payment.prospecteur_id
        );
      }
    }

    for (const sale of sales) {
      if (
        sale.prospecteur_id &&
        new Date(
          sale.sale_date
        ).getTime() >=
          fifteenMinutesAgo
      ) {
        activeProspectorIds.add(
          sale.prospecteur_id
        );
      }
    }

    const activeProspectors =
      activeProspectorIds.size;

    const offlineProspectors =
      Math.max(
        0,
        totalProspectors -
          activeProspectors
      );

    const activeAlerts =
      lowStockCount +
      (offlineProspectors > 5
        ? 1
        : 0);

    return {
      dailyTokenRedemptionPct,
      dailyTokenRedeemed,
      dailyTokenIssued,
      activeProspectors,
      offlineProspectors,
      totalProspectors,
      totalStockUnits,
      lowStockCount,
      cashSalesVolume,
      commissionToday,
      activeAlerts,
    };
  } catch (error) {
    console.error(
      'fetchKPIs error:',
      error
    );

    return emptyKPIs();
  }
}

function emptyKPIs(): KPIData {
  return {
    dailyTokenRedemptionPct: 0,
    dailyTokenRedeemed: 0,
    dailyTokenIssued: 0,
    activeProspectors: 0,
    offlineProspectors: 0,
    totalProspectors: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    cashSalesVolume: 0,
    commissionToday: 0,
    activeAlerts: 0,
  };
}

/* ============================================================================
 * VENTES RÉCENTES — ADMIN
 * ========================================================================== */

export async function fetchRecentSales(): Promise<
  RecentSaleRow[]
> {
  const supabase = createClient();

  try {
    const organizationId =
      await getMyOrganizationId();

    if (!organizationId) {
      return [];
    }

    const { data, error } = await supabase
      .from('sales')
      .select(`
        id,
        sale_number,
        sale_date,
        amount_paid,
        client_phone,
        prospecteur_id,
        article_id,
        clients (
          first_name,
          last_name,
          phone,
          city
        ),
        articles (
          name,
          code
        ),
        prospecteurs (
          code,
          first_name,
          last_name,
          city
        )
      `)
      .eq(
        'organization_id',
        organizationId
      )
      .order('sale_date', {
        ascending: false,
      })
      .limit(10);

    if (error || !data) {
      console.error(
        'fetchRecentSales:',
        error?.message
      );

      return [];
    }

    return data.map((sale: any) => {
      const client =
        Array.isArray(sale.clients)
          ? sale.clients[0]
          : sale.clients;

      const article =
        Array.isArray(sale.articles)
          ? sale.articles[0]
          : sale.articles;

      const prospector =
        Array.isArray(
          sale.prospecteurs
        )
          ? sale.prospecteurs[0]
          : sale.prospecteurs;

      const agent =
        getDisplayName(
          prospector?.first_name,
          prospector?.last_name,
          'Agent'
        );

      const saleId =
        String(sale.id || '');

      return {
        id: sale.id,

        agent,

        code:
          prospector?.code ||
          `PROS-${String(
            sale.prospecteur_id || ''
          )
            .slice(0, 6)
            .toUpperCase()}`,

        token:
          sale.sale_number ||
          `SALE-${saleId
            .slice(0, 8)
            .toUpperCase()}`,

        product:
          article?.name ||
          'Produit',

        amount:
          formatCurrency(
            Number(
              sale.amount_paid || 0
            )
          ),

        time: formatTime(
          sale.sale_date
        ),

        region:
          client?.city ||
          prospector?.city ||
          'Non renseigné',
      };
    });
  } catch (error) {
    console.error(
      'fetchRecentSales error:',
      error
    );

    return [];
  }
}

/* ============================================================================
 * KPIs PROSPECTEUR
 * ========================================================================== */

export async function fetchAgentKPIs(): Promise<
  AgentKPIData
> {
  const supabase = createClient();

  try {
    const userId =
      await getCurrentUserId();

    if (!userId) {
      return emptyAgentKPIs();
    }

    const { data: prospector, error } =
      await supabase
        .from('prospecteurs')
        .select(`
          id,
          organization_id,
          user_id,
          code,
          first_name,
          last_name,
          city,
          country,
          commission_rate,
          status
        `)
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !prospector) {
      console.error(
        'fetchAgentKPIs prospecteur:',
        error?.message
      );

      return emptyAgentKPIs();
    }

    const [
      salesResult,
      paymentsResult,
      commissionsResult,
      tokensResult,
    ] = await Promise.all([
      supabase
        .from('sales')
        .select(
          'id, sale_date, amount_paid, status'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'sale_date',
          todayStart()
        )
        .lte(
          'sale_date',
          todayEnd()
        ),

      supabase
        .from('payments')
        .select(
          'id, amount, payment_date, status'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'payment_date',
          todayStart()
        )
        .lte(
          'payment_date',
          todayEnd()
        ),

      supabase
        .from('commissions')
        .select(
          'id, commission_amount, created_at, status'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'created_at',
          todayStart()
        )
        .lte(
          'created_at',
          todayEnd()
        ),

      supabase
        .from('daily_tokens')
        .select(
          'id, status, created_at'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'created_at',
          todayStart()
        )
        .lte(
          'created_at',
          todayEnd()
        ),
    ]);

    const sales =
      salesResult.data ?? [];

    const payments =
      paymentsResult.data ?? [];

    const commissions =
      commissionsResult.data ?? [];

    const tokens =
      tokensResult.data ?? [];

    const todaySales =
      sales.length;

    const todayCash =
      payments
        .filter((payment: any) =>
          isSuccessfulPayment(
            payment.status
          )
        )
        .reduce(
          (sum: number, payment: any) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );

    const commissionToday =
      commissions.length > 0
        ? commissions.reduce(
            (sum: number, commission: any) =>
              sum +
              Number(
                commission.commission_amount ||
                  0
              ),
            0
          )
        : todayCash *
          Number(
            prospector.commission_rate ||
              COMMISSION_FALLBACK
          );

    const weekStart =
      daysAgoStart(6).toISOString();

    const [
      weekPaymentsResult,
      weekCommissionsResult,
      weekTokensResult,
    ] = await Promise.all([
      supabase
        .from('payments')
        .select(
          'id, amount, payment_date, status'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'payment_date',
          weekStart
        ),

      supabase
        .from('commissions')
        .select(
          'id, commission_amount, created_at'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'created_at',
          weekStart
        ),

      supabase
        .from('daily_tokens')
        .select(
          'id, created_at'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'created_at',
          weekStart
        ),
    ]);

    const weekPayments =
      weekPaymentsResult.data ?? [];

    const weekCommissions =
      weekCommissionsResult.data ?? [];

    const weekTokens =
      weekTokensResult.data ?? [];

    const weekCash =
      weekPayments
        .filter((payment: any) =>
          isSuccessfulPayment(
            payment.status
          )
        )
        .reduce(
          (sum: number, payment: any) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );

    const commissionWeek =
      weekCommissions.length > 0
        ? weekCommissions.reduce(
            (sum: number, commission: any) =>
              sum +
              Number(
                commission.commission_amount ||
                  0
              ),
            0
          )
        : weekCash *
          Number(
            prospector.commission_rate ||
              COMMISSION_FALLBACK
          );

    const formattedName =
      getDisplayName(
        prospector.first_name,
        prospector.last_name
      );

    const target = 30;

    return {
      todaySales,
      todayTarget: target,

      tokenBalance: Math.max(
        0,
        target - todaySales
      ),

      commissionToday,

      commissionWeek,

      tokensEarnedWeek:
        weekTokens.length,

      agentName:
        formattedName,

      agentCode:
        prospector.code ||
        `PROS-${prospector.id
          .slice(0, 6)
          .toUpperCase()}`,

      region:
        prospector.city ||
        prospector.country ||
        'Non assigné',

      team: `Équipe ${
        (
          prospector.city ||
          'Alpha' ).split(' ')[0]
      }`,
    };
  } catch (error) {
    console.error(
      'fetchAgentKPIs error:',
      error
    );

    return emptyAgentKPIs();
  }
}

function emptyAgentKPIs(): AgentKPIData {
  return {
    todaySales: 0,
    todayTarget: 30,
    tokenBalance: 30,
    commissionToday: 0,
    commissionWeek: 0,
    tokensEarnedWeek: 0,
    agentName: 'Agent',
    agentCode: '—',
    region: '—',
    team: '—',
  };
}

/* ============================================================================
 * VENTES DU JOUR — PROSPECTEUR
 * ========================================================================== */

export async function fetchAgentTodaySales(): Promise<
  AgentSaleRow[]
> {
  const supabase = createClient();

  try {
    const userId =
      await getCurrentUserId();

    if (!userId) {
      return [];
    }

    const { data: prospector } =
      await supabase
        .from('prospecteurs')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!prospector) {
      return [];
    }

    const { data, error } =
      await supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          sale_date,
          amount_paid,
          client_id,
          article_id,
          clients (
            first_name,
            last_name,
            phone
          ),
          articles (
            name
          )
        `)
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'sale_date',
          todayStart()
        )
        .lte(
          'sale_date',
          todayEnd()
        )
        .order('sale_date', {
          ascending: false,
        });

    if (error || !data) {
      console.error(
        'fetchAgentTodaySales:',
        error?.message
      );

      return [];
    }

    return data.map((sale: any) => {
      const client =
        Array.isArray(sale.clients)
          ? sale.clients[0]
          : sale.clients;

      const article =
        Array.isArray(sale.articles)
          ? sale.articles[0]
          : sale.articles;

      const customer =
        getDisplayName(
          client?.first_name,
          client?.last_name,
          'Client'
        );

      return {
        id: sale.id,

        time: formatTime(
          sale.sale_date
        ),

        token:
          sale.sale_number ||
          `SALE-${String(
            sale.id
          )
            .slice(0, 8)
            .toUpperCase()}`,

        customer,

        product:
          article?.name ||
          'Produit',

        amount:
          formatCurrency(
            Number(
              sale.amount_paid || 0
            )
          ),
      };
    });
  } catch (error) {
    console.error(
      'fetchAgentTodaySales error:',
      error
    );

    return [];
  }
}

/* ============================================================================
 * PROSPECTS — PROSPECTEUR
 * ========================================================================== */

export async function fetchAgentProspects(): Promise<
  ProspectRow[]
> {
  const supabase = createClient();

  try {
    const userId =
      await getCurrentUserId();

    if (!userId) {
      return [];
    }

    const { data: prospector } =
      await supabase
        .from('prospecteurs')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!prospector) {
      return [];
    }

    const { data, error } =
      await supabase
        .from('prospects')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          temperature,
          desired_article,
          last_contact_at,
          next_follow_up_at
        `)
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .order(
          'last_contact_at',
          {
            ascending: false,
            nullsFirst: false,
          }
        );

    if (error || !data) {
      console.error(
        'fetchAgentProspects:',
        error?.message
      );

      return [];
    }

        return data.map((prospect: any) => ({
      id: prospect.id,

      name: getDisplayName(
        prospect.first_name,
        prospect.last_name,
        'Prospect'
      ),

      phone:
        prospect.phone ||
        '—',

      type:
        prospect.temperature ||
        'cold',

      productName:
        prospect.desired_article ||
        '—',

      lastContact:
        prospect.last_contact_at
          ? formatTime(
              prospect.last_contact_at
            )
          : 'Jamais',

      purchaseDate:
        prospect.next_follow_up_at ||
        null,
    }));
  } catch (error) {
    console.error(
      'fetchAgentProspects error:',
      error
    );

    return [];
  }
}

/* ============================================================================
 * ENREGISTREMENT RAPIDE D'UNE VENTE
 * ========================================================================== */

export async function submitSaleLog(payload: {
  tokenCode: string;
  customerName: string;
  customerPhone: string;
  product: string;
  amount: string;
  notes: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();

  try {
    const userId =
      await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error:
          'Utilisateur non authentifié.',
      };
    }

    const {
      data: prospector,
      error: prospectorError,
    } = await supabase
      .from('prospecteurs')
      .select(`
        id,
        organization_id,
        commission_rate
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (
      prospectorError ||
      !prospector
    ) {
      return {
        success: false,
        error:
          "Profil prospecteur introuvable.",
      };
    }

    const organizationId =
      prospector.organization_id;

    const amount =
      Number(
        String(
          payload.amount || '0'
        )
          .replace(/\s/g, '')
          .replace(',', '.')
      ) || 0;

    if (amount <= 0) {
      return {
        success: false,
        error:
          'Le montant de la vente doit être supérieur à zéro.',
      };
    }

    /* ------------------------------------------------------------------------
     * 1. Recherche du client
     * ---------------------------------------------------------------------- */

    let clientId: string | null = null;

    if (payload.customerPhone?.trim()) {
      const {
        data: existingClient,
      } = await supabase
        .from('clients')
        .select('id')
        .eq(
          'organization_id',
          organizationId
        )
        .eq(
          'phone',
          payload.customerPhone.trim()
        )
        .maybeSingle();

      clientId =
        existingClient?.id ||
        null;
    }

    /* ------------------------------------------------------------------------
     * 2. Création du client si nécessaire
     * ---------------------------------------------------------------------- */

    if (!clientId) {
      const nameParts =
        payload.customerName
          .trim()
          .split(/\s+/);

      const firstName =
        nameParts.shift() ||
        'Client';

      const lastName =
        nameParts.join(' ') ||
        null;

      const {
        data: newClient,
        error: clientError,
      } = await supabase
        .from('clients')
        .insert({
          organization_id:
            organizationId,

          prospecteur_id:
            prospector.id,

          code: `CLI-${Date.now()
            .toString(36)
            .toUpperCase()}`,

          first_name:
            firstName,

          last_name:
            lastName,

          phone:
            payload.customerPhone?.trim() ||
            null,

          country: 'Bénin',

          status: 'client',
        })
        .select('id')
        .single();

      if (clientError) {
        return {
          success: false,
          error:
            clientError.message,
        };
      }

      clientId =
        newClient?.id || null;
    }

    /* ------------------------------------------------------------------------
     * 3. Recherche de l'article
     * ---------------------------------------------------------------------- */

    let articleId: string | null =
      null;

    const productValue =
      payload.product.trim();

    if (productValue) {
      const { data: article } =
        await supabase
          .from('articles')
          .select(`
            id,
            code,
            name,
            fixed_price,
            cash_price,
            credit_price,
            default_payment_amount
          `)
          .eq(
            'organization_id',
            organizationId
          )
          .or(
            `code.eq.${productValue},name.ilike.%${productValue}%`
          )
          .eq('active', true)
          .limit(1)
          .maybeSingle();

      articleId =
        article?.id || null;
    }

    /* ------------------------------------------------------------------------
     * 4. Numéro de vente
     * ---------------------------------------------------------------------- */

    const saleNumber =
      payload.tokenCode?.trim() ||
      `SALE-${Date.now()
        .toString(36)
        .toUpperCase()}`;

    /* ------------------------------------------------------------------------
     * 5. Création de la vente
     * ---------------------------------------------------------------------- */

    const {
      data: sale,
      error: saleError,
    } = await supabase
      .from('sales')
      .insert({
        organization_id:
          organizationId,

        client_id:
          clientId,

        prospecteur_id:
          prospector.id,

        article_id:
          articleId,

        sale_number:
          saleNumber,

        sale_date:
          new Date().toISOString(),

        quantity: 1,

        fixed_price:
          amount,

        cash_price:
          amount,

        credit_price:
          amount,

        amount_paid:
          amount,

        amount_remaining:
          0,

        payment_frequency:
          'daily',

        payment_amount:
          amount,

        sale_type:
          'cash',

        status:
          'completed',

        client_phone:
          payload.customerPhone?.trim() ||
          null,

        notes:
          payload.notes?.trim() ||
          null,
      })
      .select('id')
      .single();

    if (saleError) {
      return {
        success: false,
        error:
          saleError.message,
      };
    }

    /* ------------------------------------------------------------------------
     * 6. Paiement
     * ---------------------------------------------------------------------- */

    const {
      data: payment,
      error: paymentError,
    } = await supabase
      .from('payments')
      .insert({
        organization_id:
          organizationId,

        sale_id:
          sale.id,

        client_id:
          clientId,

        prospecteur_id:
          prospector.id,

        amount,

        currency:
          'XOF',

        payment_date:
          new Date().toISOString(),

        payment_method:
          'cash',

        status:
          'successful',

        recorded_by:
          userId,

        notes:
          payload.notes?.trim() ||
          null,
      })
      .select('id')
      .single();

    if (paymentError) {
      return {
        success: false,
        error:
          paymentError.message,
      };
    }

    /* ------------------------------------------------------------------------
     * 7. Token journalier
     * ---------------------------------------------------------------------- */

    const {
      error: tokenError,
    } = await supabase
      .from('daily_tokens')
      .insert({
        organization_id:
          organizationId,

        client_id:
          clientId,

        sale_id:
          sale.id,

        prospecteur_id:
          prospector.id,

        token_date:
          new Date()
            .toISOString()
            .slice(0, 10),

        expected_amount:
          amount,

        paid_amount:
          amount,

        status:
          'paid',

        paid_at:
          new Date().toISOString(),

        notes:
          payload.notes?.trim() ||
          null,
      });

    if (tokenError) {
      console.error(
        'daily_tokens insert:',
        tokenError.message
      );
    }

    /* ------------------------------------------------------------------------
     * 8. Commission
     * ---------------------------------------------------------------------- */

    const commissionRate =
      Number(
        prospector.commission_rate ||
          COMMISSION_FALLBACK
      );

    const commissionAmount =
      amount *
      commissionRate;

    const {
      error: commissionError,
    } = await supabase
      .from('commissions')
      .insert({
        organization_id:
          organizationId,

        prospecteur_id:
          prospector.id,

        sale_id:
          sale.id,

        payment_id:
          payment?.id || null,

        article_id:
          articleId,

        commission_rate:
          commissionRate,

        base_amount:
          amount,

        commission_amount:
          commissionAmount,

        status:
          'pending',
      });

    if (commissionError) {
      console.error(
        'commission insert:',
        commissionError.message
      );
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error(
      'submitSaleLog error:',
      error
    );

    return {
      success: false,
      error:
        error?.message ||
        'Une erreur est survenue lors de l’enregistrement de la vente.',
    };
  }
}

/* ============================================================================
 * TENDANCE DES VENTES PROSPECTEUR — 7 JOURS
 * ========================================================================== */

export async function fetchAgentSalesTrend(): Promise<
  DailySalePoint[]
> {
  const supabase = createClient();

  try {
    const userId =
      await getCurrentUserId();

    if (!userId) {
      return buildEmptyAgentTrend();
    }

    const { data: prospector } =
      await supabase
        .from('prospecteurs')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (!prospector) {
      return buildEmptyAgentTrend();
    }

    const since =
      daysAgoStart(6).toISOString();

    const [
      salesResult,
      commissionsResult,
    ] = await Promise.all([
      supabase
        .from('sales')
        .select(
          'id, sale_date, amount_paid'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'sale_date',
          since
        )
        .order('sale_date', {
          ascending: true,
        }),

      supabase
        .from('commissions')
        .select(
          'id, created_at, commission_amount'
        )
        .eq(
          'prospecteur_id',
          prospector.id
        )
        .gte(
          'created_at',
          since
        )
        .order('created_at', {
          ascending: true,
        }),
    ]);

    const sales =
      salesResult.data ?? [];

    const commissions =
      commissionsResult.data ?? [];

    const byDay: Record<
      string,
      {
        sales: number;
        commission: number;
      }
    > = {};

    for (let i = 6; i >= 0; i--) {
      byDay[dayLabel(i)] = {
        sales: 0,
        commission: 0,
      };
    }

    for (const sale of sales) {
      const label =
        new Date(
          sale.sale_date
        ).toLocaleDateString(
          'fr-FR',
          {
            day: '2-digit',
            month: 'short',
          }
        );

      if (byDay[label]) {
        byDay[label].sales += 1;
      }
    }

    for (const commission of commissions) {
      const label =
        new Date(
          commission.created_at
        ).toLocaleDateString(
          'fr-FR',
          {
            day: '2-digit',
            month: 'short',
          }
        );

      if (byDay[label]) {
        byDay[label].commission +=
          Number(
            commission.commission_amount ||
              0
          );
      }
    }

    return Object.entries(
      byDay
    ).map(([day, values]) => ({
      day,
      sales: values.sales,
      commission:
        Math.round(
          values.commission * 100
        ) / 100,
    }));
  } catch (error) {
    console.error(
      'fetchAgentSalesTrend error:',
      error
    );

    return buildEmptyAgentTrend();
  }
}

function buildEmptyAgentTrend(): DailySalePoint[] {
  return Array.from(
    { length: 7 },
    (_, index) => ({
      day: dayLabel(
        6 - index
      ),
      sales: 0,
      commission: 0,
    })
  );
}
