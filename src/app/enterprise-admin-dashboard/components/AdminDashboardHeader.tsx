'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboardHeader() {
  const [organizationName, setOrganizationName] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Profil de l'administrateur
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, display_name, email, phone')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setAdminName(profile.display_name);
        } else if (profile?.first_name || profile?.last_name) {
          setAdminName(
            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
          );
        } else if (user.email) {
          const name = user.email
            .split('@')[0]
            .replace(/[._]/g, ' ');

          setAdminName(
            name
              .split(' ')
              .map(
                (w: string) =>
                  w.charAt(0).toUpperCase() + w.slice(1)
              )
              .join(' ')
          );
        }

        // Organisation de l'administrateur connecté
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id, role, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (membership?.organization_id) {
          const { data: organization } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', membership.organization_id)
            .maybeSingle();

          if (organization?.name) {
            setOrganizationName(organization.name);
          }
        }
      } catch (error) {
        console.error(
          'Erreur lors du chargement du header ADMIN:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const now = new Date();

  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeStr = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-600 text-foreground">
          Tableau de Bord Opérations
        </h1>

        <p className="text-sm text-muted-foreground mt-1">
          {loading ? (
            <span className="inline-block w-48 h-4 bg-muted/40 rounded animate-pulse" />
          ) : (
            <>
              {organizationName || 'Mon Entreprise'} · {dateStr} ·{' '}
              {timeStr} WAT
            </>
          )}
        </p>

        {!loading && adminName && (
          <p className="text-xs text-muted-foreground mt-1">
            Administrateur : {adminName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-success/10 border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success pulse-gold" />
          <span className="text-xs font-600 text-success">
            En direct
          </span>
        </div>

        <button
          onClick={() => { window.location.href = '/business/settings'; }}
          className="text-sm font-500 px-4 py-2 rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
        >
          Paramètres entreprise
        </button>

        <button
          className="text-sm font-600 px-4 py-2 rounded-md gold-gradient-bg text-primary-foreground hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          Émettre Tokens
        </button>
      </div>
    </div>
  );
}

src/app/hidden-concepteur-gate/dashboard/page.tsx

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  checkCurrentSuperAdmin,
  SUPER_ADMIN_LOGIN_ROUTE,
} from '@/lib/auth/super-admin';
import { fetchSuperAdminDashboard } from '@/lib/services/superAdminService';

/* ============================================================================
 * JDV CRM — SUPER ADMIN DASHBOARD PAGE
 * ========================================================================== */

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<Awaited<ReturnType<typeof fetchSuperAdminDashboard>> | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    setDataError(null);

    const check = await checkCurrentSuperAdmin();

    if (!check.ok) {
      router.replace(SUPER_ADMIN_LOGIN_ROUTE);
      return;
    }

    try {
      const data = await fetchSuperAdminDashboard();
      setDashboardData(data);
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Erreur lors du chargement des données.'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(SUPER_ADMIN_LOGIN_ROUTE);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Chargement du tableau de bord…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center max-w-md px-6">
          <p className="text-red-400 text-sm mb-4">{authError}</p>
          <button
            onClick={() => router.replace(SUPER_ADMIN_LOGIN_ROUTE)}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded hover:bg-gray-200 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            JDV CRM — Super Admin
          </h1>
          <p className="text-xs text-white/50 mt-0.5">Tableau de bord concepteur</p>
        </div>
        <button
          onClick={() => router.push('/hidden-concepteur-gate/prospecteurs')}
          className="px-4 py-2 bg-[#D4AF37] text-black text-sm font-semibold rounded hover:opacity-90 transition-opacity mr-2"
        >
          Gérer les prospecteurs
        </button>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-xs border border-white/20 rounded hover:bg-white/10 transition-colors"
        >
          Déconnexion
        </button>
      </header>

      {/* Main content */}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {dataError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{dataError}</p>
            <button
              onClick={loadDashboard}
              className="mt-2 text-xs text-red-300 underline hover:text-red-200"
            >
              Réessayer
            </button>
          </div>
        )}

        {dashboardData && (
          <div className="space-y-8">
            {/* KPIs */}
            <section>
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Vue d&apos;ensemble
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard label="Total entreprises" value={dashboardData.kpis.total} />
                <KPICard label="Actives" value={dashboardData.kpis.active} accent="green" />
                <KPICard label="Suspendues" value={dashboardData.kpis.suspended} accent="red" />
                <KPICard label="En attente" value={dashboardData.kpis.pending} accent="yellow" />
              </div>
            </section>

            {/* Financial */}
            <section>
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Finances
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard label="Revenu total" value={`${dashboardData.financial.totalRevenue.toFixed(0)} XOF`} />
                <KPICard label="Revenu mensuel" value={`${dashboardData.financial.monthlyRevenue.toFixed(0)} XOF`} />
                <KPICard label="Paiements" value={dashboardData.financial.paymentCount} />
                <KPICard label="Abonnements actifs" value={dashboardData.financial.activeSubscriptions} />
              </div>
            </section>

            {/* Enterprises table */}
            <section>
              <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">
                Entreprises ({dashboardData.enterprises.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left px-4 py-3 text-white/60 font-medium">Entreprise</th>
                      <th className="text-left px-4 py-3 text-white/60 font-medium">Statut</th>
                      <th className="text-left px-4 py-3 text-white/60 font-medium">Tier</th>
                      <th className="text-right px-4 py-3 text-white/60 font-medium">Prospecteurs</th>
                      <th className="text-right px-4 py-3 text-white/60 font-medium">MRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.enterprises.map((ent) => (
                      <tr key={ent.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{ent.nom_entreprise}</div>
                          <div className="text-xs text-white/40">{ent.ownerEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ent.status_abonnement} />
                        </td>
                        <td className="px-4 py-3 text-white/70">{ent.tier}</td>
                        <td className="px-4 py-3 text-right text-white/70">{ent.prospectorCount}</td>
                        <td className="px-4 py-3 text-right text-white/70">{ent.mrr}</td>
                      </tr>
                    ))}
                    {dashboardData.enterprises.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-white/30 text-sm">
                          Aucune entreprise trouvée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

/* ============================================================================
 * Sub-components
 * ========================================================================== */

interface KPICardProps {
  label: string;
  value: string | number;
  accent?: 'green' | 'red' | 'yellow';
}

function KPICard({ label, value, accent }: KPICardProps) {
  const accentClass =
    accent === 'green' ?'text-green-400'
      : accent === 'red' ?'text-red-400'
      : accent === 'yellow' ?'text-yellow-400' :'text-white';

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'Actif', className: 'bg-green-900/40 text-green-400 border-green-500/30' },
    suspendu: { label: 'Suspendu', className: 'bg-red-900/40 text-red-400 border-red-500/30' },
    trial: { label: 'Essai', className: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
    pending: { label: 'En attente', className: 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30' },
    expired: { label: 'Expiré', className: 'bg-gray-900/40 text-gray-400 border-gray-500/30' },
  };

  const config = map[status] ?? { label: status, className: 'bg-white/10 text-white/60 border-white/20' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${config.className}`}>
      {config.label}
    </span>
  );
}