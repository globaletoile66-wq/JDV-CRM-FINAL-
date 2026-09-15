'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TerrainLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
      }

      if (!authData.user) {
        throw new Error('Connexion échouée. Réessayez.');
      }

      const userId = authData.user.id;

      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role, status')
        .eq('user_id', userId)
        .eq('role', 'prospecteur')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        throw new Error(
          'Profil prospecteur introuvable ou désactivé. Contactez votre administrateur.'
        );
      }

      const { data: prospecteur, error: prospecteurError } = await supabase
        .from('prospecteurs')
        .select('id, code, first_name, last_name, city, status')
        .eq('user_id', userId)
        .eq('organization_id', membership.organization_id)
        .maybeSingle();

      if (prospecteurError || !prospecteur || prospecteur.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error(
          'Votre compte prospecteur n’est pas encore configuré ou est désactivé.'
        );
      }

      try {
        localStorage.setItem('jdvcrm_organization_id', membership.organization_id);
        localStorage.setItem('jdvcrm_prospecteur_id', prospecteur.id);
        localStorage.setItem('jdvcrm_prospecteur_code', prospecteur.code || '');
      } catch {
        // Le stockage local est optionnel.
      }

      // Use replace to avoid back-button issues
      window.location.replace('/terrain/dashboard');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('kwame@meridian.com');
    setPassword('agent123');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#0B1B3D',
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(212,175,55,0.03) 0px, rgba(212,175,55,0.03) 1px, transparent 1px, transparent 40px)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-3xl font-extrabold tracking-widest mb-1"
            style={{
              background:
                'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            JDV CRM
          </div>
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#A0AEC0' }}>
            Portail Prospecteur
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#0F2347',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          <h1 className="text-white text-xl font-bold mb-6 text-center">Connexion Agent</h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@votreentreprise.com"
                required
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  caretColor: '#D4AF37',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(212,175,55,0.2)')}
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                Mot de Passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  caretColor: '#D4AF37',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#D4AF37')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(212,175,55,0.2)')}
              />
            </div>

            {error && (
              <p
                className="text-xs text-center rounded-lg px-3 py-2"
                style={{
                  color: '#FC8181',
                  background: 'rgba(252,129,129,0.1)',
                  border: '1px solid rgba(252,129,129,0.2)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase transition-all active:scale-95"
              style={{
                background: loading
                  ? 'rgba(212,175,55,0.4)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: '#0B1B3D',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.3)',
              }}
            >
              {loading ? 'Authentification...' : 'Accéder à Mon Tableau de Bord'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <p className="text-xs text-center mb-2" style={{ color: '#4A5568' }}>
              Compte de démonstration :
            </p>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                color: '#D4AF37',
                border: '1px solid rgba(212,175,55,0.2)',
                background: 'rgba(212,175,55,0.05)',
              }}
            >
              kwame@meridian.com / agent123
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: '#4A5568' }}>
            Contactez votre superviseur en cas de problème d&apos;accès
          </p>
        </div>
      </div>
    </div>
  );
}


src/lib/auth/super-admin-server.ts

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/server';

export async function requireSuperAdminServer() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) throw new Error('Authentification requise.');
  const admin = getAdminClient();
  const { data } = await admin.from('super_admins').select('user_id,status,actif').eq('user_id',user.id).maybeSingle();
  if (!data || data.status !== 'active' || data.actif === false) throw new Error('Accès SUPER ADMIN refusé.');
  return { user, admin };
}
