'use client';

import React, { useEffect, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import { Bell, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type ProspectorInfo = {
  agentName: string;
  agentCode: string;
  region: string;
  team: string;
};

export default function ProspectorHeader() {
  const router = useRouter();
  const supabase = createClient();

  const [info, setInfo] = useState<ProspectorInfo>({
    agentName: 'Agent',
    agentCode: '—',
    region: '—',
    team: '—',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProspector = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/terrain/login');
          return;
        }

        /*
         * Recherche du profil utilisateur.
         * L'email provient de auth.users :
         * profiles ne possède pas de colonne email.
         */
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        /*
         * Recherche du prospecteur associé à l'utilisateur.
         *
         * select('*') permet de rester compatible avec la structure
         * actuelle de la table prospecteurs.
         */
        const { data: prospector } = await supabase
          .from('prospecteurs')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        /*
         * Certaines anciennes versions peuvent ne pas avoir user_id
         * directement sur prospecteurs.
         *
         * Dans ce cas, on essaie également les identifiants courants.
         */
        let finalProspector = prospector;

        if (!finalProspector) {
          const possibleUserColumns = [
            'profile_id',
            'agent_id',
            'account_id',
          ];

          for (const column of possibleUserColumns) {
            const { data } = await supabase
              .from('prospecteurs')
              .select('*')
              .eq(column, user.id)
              .maybeSingle();

            if (data) {
              finalProspector = data;
              break;
            }
          }
        }

        if (!mounted) return;

        const p = finalProspector ?? {};

        const firstName =
          profile?.first_name ??
          profile?.display_name ??
          '';

        const lastName =
          profile?.last_name ?? '';

        const nameFromProfile =
          `${firstName} ${lastName}`.trim();

        const agentName =
          p.name ??
          p.nom ??
          p.full_name ??
          p.fullname ??
          p.agent_name ??
          nameFromProfile ??
          user.email?.split('@')[0] ??
          'Agent';

        const agentCode =
          p.code ??
          p.prospector_code ??
          p.agent_code ??
          p.code_prospecteur ??
          '—';

        const region =
          p.region ??
          p.zone ??
          p.area ??
          p.localisation ??
          '—';

        const team =
          p.team ??
          p.team_name ??
          p.equipe ??
          p.equipe_nom ??
          '—';

        setInfo({
          agentName,
          agentCode,
          region,
          team,
        });
      } catch (error) {
        console.error(
          'Erreur chargement profil prospecteur:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProspector();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/terrain/login');
  };

  const today = new Date().toLocaleDateString(
    'fr-FR',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
  );

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-primary/15 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Identité prospecteur */}
        <div className="flex items-center gap-3">
          <AppLogo size={28} />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-700 text-foreground">
                {loading ? 'Chargement...' : info.agentName}
              </span>

              <span className="flex items-center gap-1 text-xs font-600 px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/25">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Actif
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                Code prospecteur :
              </span>

              <span className="text-xs font-700 font-mono-data text-primary">
                {info.agentCode}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
          >
            <Bell size={18} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Se déconnecter"
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all duration-150"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Informations terrain */}
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">
            Région :
          </span>

          <span className="text-xs font-600 text-foreground">
            {info.region}
          </span>
        </div>

        <div className="w-px h-3 bg-border shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">
            Équipe :
          </span>

          <span className="text-xs font-600 text-foreground">
            {info.team}
          </span>
        </div>

        <div className="w-px h-3 bg-border shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">
            {today}
          </span>
        </div>
      </div>
    </header>
  );
}
