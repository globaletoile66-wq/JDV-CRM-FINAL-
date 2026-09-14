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
          className="text-sm font-500 px-4 py-2 rounded-md border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
        >
          Exporter Rapport
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