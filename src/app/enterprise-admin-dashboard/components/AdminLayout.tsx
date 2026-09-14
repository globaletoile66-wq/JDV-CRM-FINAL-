'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard,
  Users,
  Coins,
  Package,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  MapPin,
  FileText,
  AlertTriangle,
} from 'lucide-react';

const navGroups = [
  {
    id: 'nav-group-main',
    label: 'Opérations',
    items: [
      {
        id: 'nav-dashboard',
        icon: LayoutDashboard,
        label: 'Tableau de Bord',
        href: '/enterprise-admin-dashboard',
        badge: null,
      },
      {
        id: 'nav-prospectors',
        icon: Users,
        label: 'Prospecteurs',
        href: '#',
        badge: null,
      },
      {
        id: 'nav-tokens',
        icon: Coins,
        label: 'Gestionnaire Jetons',
        href: '#',
        badge: null,
      },
      {
        id: 'nav-stock',
        icon: Package,
        label: 'Inventaire Stock',
        href: '#',
        badge: null,
      },
    ],
  },
  {
    id: 'nav-group-analytics',
    label: 'Analytique',
    items: [
      {
        id: 'nav-sales',
        icon: TrendingUp,
        label: 'Rapports de Ventes',
        href: '#',
        badge: null,
      },
      {
        id: 'nav-commissions',
        icon: FileText,
        label: 'Commissions',
        href: '#',
        badge: null,
      },
      {
        id: 'nav-agent-perf',
        icon: MapPin,
        label: 'Performance Agents',
        href: '/agent-performance',
        badge: null,
      },
      {
        id: 'nav-field',
        icon: MapPin,
        label: 'Carte Terrain',
        href: '#',
        badge: null,
      },
    ],
  },
  {
    id: 'nav-group-system',
    label: 'Système',
    items: [
      {
        id: 'nav-alerts',
        icon: AlertTriangle,
        label: 'Alertes',
        href: '#',
        badge: null,
      },
      {
        id: 'nav-settings',
        icon: Settings,
        label: 'Paramètres',
        href: '#',
        badge: null,
      },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('nav-dashboard');

  const [adminName, setAdminName] = useState('Administrateur');
  const [adminInitials, setAdminInitials] = useState('AD');
  const [organizationName, setOrganizationName] =
    useState('Mon Entreprise');

  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const loadAdminInfo = async () => {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        /*
         * ---------------------------------------------------------
         * 1. PROFIL ADMINISTRATEUR
         * Nouvelle architecture :
         * profiles
         * ---------------------------------------------------------
         */
        const { data: profile } = await supabase
          .from('profiles')
          .select(
            'first_name, last_name, display_name, phone, country'
          )
          .eq('id', user.id)
          .maybeSingle();

        let name = 'Administrateur';

        if (profile?.display_name?.trim()) {
          name = profile.display_name.trim();
        } else if (
          profile?.first_name ||
          profile?.last_name
        ) {
          name =
            `${profile?.first_name || ''} ${
              profile?.last_name || ''
            }`.trim();
        } else if (user.email) {
          name = user.email
            .split('@')[0]
            .replace(/[._-]/g, ' ')
            .trim()
            .split(' ')
            .filter(Boolean)
            .map(
              (word: string) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
            )
            .join(' ');
        }

        setAdminName(name);

        const parts = name
          .split(' ')
          .filter(Boolean);

        const initials =
          parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name
                .replace(/\s/g, '')
                .slice(0, 2)
                .toUpperCase();

        setAdminInitials(initials || 'AD');

        /*
         * ---------------------------------------------------------
         * 2. ORGANISATION DE L'ADMIN
         * Nouvelle architecture :
         * organization_members
         * ---------------------------------------------------------
         */
        const { data: membership } = await supabase
          .from('organization_members')
          .select(
            'organization_id, role, status'
          )
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        /*
         * ---------------------------------------------------------
         * 3. VERIFICATION DU ROLE
         * L'ADMIN ENTREPRISE doit être business_admin.
         * ---------------------------------------------------------
         */
        if (
          membership?.role &&
          membership.role !== 'business_admin'
        ) {
          console.warn(
            'Le rôle connecté n’est pas business_admin:',
            membership.role
          );
        }

        /*
         * ---------------------------------------------------------
         * 4. ORGANISATION
         * Nouvelle architecture :
         * organizations
         * ---------------------------------------------------------
         */
        if (membership?.organization_id) {
          const { data: organization } = await supabase
            .from('organizations')
            .select(
              'id, name, legal_name, country, currency, subscription_status, status'
            )
            .eq(
              'id',
              membership.organization_id
            )
            .maybeSingle();

          if (organization?.name) {
            setOrganizationName(
              organization.name
            );
          }
        }
      } catch (error) {
        console.error(
          'Erreur lors du chargement des informations ADMIN:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadAdminInfo();
  }, []);

  /*
   * ---------------------------------------------------------
   * DECONNEXION
   * ---------------------------------------------------------
   */
  const handleLogout = async () => {
    try {
      const supabase = createClient();

      await supabase.auth.signOut();

      router.replace('/business/login');
      router.refresh();
    } catch (error) {
      console.error(
        'Erreur lors de la déconnexion:',
        error
      );

      router.replace('/business/login');
    }
  };

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */
  const handleNavigation = (
    itemId: string,
    href: string
  ) => {
    setActiveNav(itemId);

    if (href && href !== '#') {
      router.push(href);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside
        className={`relative flex-shrink-0 flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div
          className={`h-16 flex items-center border-b border-border px-4 ${
            collapsed
              ? 'justify-center'
              : 'gap-3'
          }`}
        >
          <AppLogo size={32} />

          {!collapsed && (
            <span className="font-sans text-base font-bold tracking-tight text-foreground whitespace-nowrap">
              JDV{' '}
              <span className="gold-gradient-text">
                CRM
              </span>
            </span>
          )}
        </div>

        {/* Organisation */}
        {!collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-primary/10 border border-primary/20">
            <div className="text-xs font-semibold text-primary truncate">
              {loading
                ? 'Chargement...'
                : organizationName}
            </div>

            <div className="text-xs text-muted-foreground">
              Compte Entreprise
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group) => (
            <div
              key={group.id}
              className="mb-4"
            >
              {!collapsed && (
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                  {group.label}
                </div>
              )}

              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isActive =
                  activeNav === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      handleNavigation(
                        item.id,
                        item.href
                      )
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 mb-0.5 group relative ${
                      isActive
                        ? 'sidebar-active text-primary' :'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                  >
                    <ItemIcon
                      size={18}
                      className="flex-shrink-0"
                    />

                    {!collapsed && (
                      <span className="flex-1 text-left truncate">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* =====================================================
            PROFIL + DECONNEXION
        ===================================================== */}
        <div className="border-t border-border p-3 space-y-1">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full gold-gradient-bg flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-foreground">
                  {adminInitials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {adminName}
                </div>

                <div className="text-xs text-muted-foreground truncate">
                  Administrateur Entreprise
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
          >
            <LogOut
              size={16}
              className="flex-shrink-0"
            />

            {!collapsed && 'Déconnexion'}
          </button>
        </div>

        {/* Collapse */}
        <button
          onClick={() =>
            setCollapsed(!collapsed)
          }
          className="absolute top-20 w-6 h-6 rounded-full bg-card border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-all duration-150 z-10"
          style={{
            left: collapsed
              ? '52px' :'228px',
          }}
          aria-label={
            collapsed
              ? 'Développer le menu' :'Réduire le menu'
          }
        >
          {collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </button>
      </aside>

      {/* =====================================================
          CONTENU PRINCIPAL
      ===================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-input border border-border rounded-md px-3 py-2">
              <Search
                size={14}
                className="text-muted-foreground"
              />

              <input
                type="text"
                placeholder="Rechercher prospecteurs, jetons..."
                className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-56"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gold-gradient-bg flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">
                  {adminInitials}
                </span>
              </div>

              <span className="text-sm font-medium text-foreground hidden md:block">
                {adminName}
              </span>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto p-6 xl:p-8">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}