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

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !authData.user) {
        throw new Error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
      }

      const userId = authData.user.id;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name, status')
        .eq('id', userId)
        .maybeSingle();

      if (profileError || !profile || profile.status !== 'active') {
        await supabase.auth.signOut();
        throw new Error('Profil JDV CRM introuvable ou inactif.');
      }

      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_user_id', userId)
        .limit(1)
        .maybeSingle();

      let organizationId = ownedOrg?.id || '';

      if (!organizationId) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        organizationId = membership?.organization_id || '';
      }

      if (!organizationId) {
        await supabase.auth.signOut();
        throw new Error('Aucune organisation active n’est associée à ce compte.');
      }

      const { data: portfolio } = await supabase
        .from('client_portfolios')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('owner_user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!portfolio) {
        await supabase.auth.signOut();
        throw new Error('Aucun portefeuille commercial actif n’est associé à ce compte.');
      }

      try {
        localStorage.setItem('jdvcrm_organization_id', organizationId);
        localStorage.setItem('jdvcrm_portfolio_id', portfolio.id);
      } catch {
        // localStorage may not be available
      }

      window.location.replace('/terrain/dashboard');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
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

          <p className="text-center text-xs mt-4" style={{ color: '#4A5568' }}>
            Contactez votre superviseur en cas de problème d&apos;accès
          </p>
        </div>
      </div>
    </div>
  );
}
