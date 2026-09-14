'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * ============================================================
 * COMPTES CONCEPTEURS AUTORISÉS
 * ============================================================
 *
 * Ces informations correspondent aux utilisateurs présents
 * dans Supabase Authentication.
 *
 * 1. romarica15@gmail.com
 *    UID : 57e90659-4ace-4824-aa4f-de84317622e8
 *
 * 2. ets.miracle.jdv@gmail.com
 *    UID : 2e2b8bd7-d736-4e75-ab21-9e6e7b5cb1a1
 *
 * NE PAS MODIFIER LES UID.
 */
const AUTHORIZED_CONCEPTEURS = [
  {
    email: 'romarica15@gmail.com',
    userId: '57e90659-4ace-4824-aa4f-de84317622e8',
  },
  {
    email: 'ets.miracle.jdv@gmail.com',
    userId: '2e2b8bd7-d736-4e75-ab21-9e6e7b5cb1a1',
  },
] as const;

export default function ConcepteurLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * ============================================================
   * AUTHENTIFICATION
   * ============================================================
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      /**
       * --------------------------------------------------------
       * 1. NORMALISATION DE L'EMAIL
       * --------------------------------------------------------
       */
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error('Veuillez saisir votre adresse e-mail.');
      }

      if (!password) {
        throw new Error('Veuillez saisir votre mot de passe.');
      }

      /**
       * --------------------------------------------------------
       * 2. VÉRIFICATION DE L'EMAIL AUTORISÉ
       * --------------------------------------------------------
       */
      const authorizedAccount = AUTHORIZED_CONCEPTEURS.find(
        (account) =>
          account.email.toLowerCase() === normalizedEmail
      );

      if (!authorizedAccount) {
        throw new Error(
          'Accès refusé. Cette adresse e-mail n’est pas autorisée pour le portail concepteur.'
        );
      }

      /**
       * --------------------------------------------------------
       * 3. AUTHENTIFICATION SUPABASE
       * --------------------------------------------------------
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        console.error(
          'SUPABASE AUTH ERROR:',
          authError
        );

        /**
         * Message clair lorsque le mot de passe/email
         * est incorrect dans Supabase Authentication.
         */
        if (
          authError.message
            ?.toLowerCase()
            .includes('invalid login credentials')
        ) {
          throw new Error(
            'Identifiants incorrects. Vérifiez le mot de passe de ce compte Supabase.'
          );
        }

        throw new Error(
          authError.message ||
            'Supabase a refusé l’authentification.'
        );
      }

      /**
       * --------------------------------------------------------
       * 4. VÉRIFICATION DE L'UTILISATEUR AUTHENTIFIÉ
       * --------------------------------------------------------
       */
      if (!authData?.user) {
        throw new Error(
          'Supabase n’a retourné aucun utilisateur authentifié.'
        );
      }

      const authenticatedUserId =
        authData.user.id;

      /**
       * --------------------------------------------------------
       * 5. VÉRIFICATION STRICTE DE L'UID
       * --------------------------------------------------------
       */
      if (
        authenticatedUserId !==
        authorizedAccount.userId
      ) {
        console.error(
          'UID CONCEPTEUR NON AUTORISÉ:',
          authenticatedUserId
        );

        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte Supabase utilisé ne correspond pas à l’UID du concepteur autorisé.'
        );
      }

      /**
       * --------------------------------------------------------
       * 6. VÉRIFICATION DANS super_admins
       * --------------------------------------------------------
       */
      const {
        data: superAdmin,
        error: superAdminError,
      } = await supabase
        .from('super_admins')
        .select(
          'id, user_id, status, actif'
        )
        .eq(
          'user_id',
          authenticatedUserId
        )
        .eq(
          'status',
          'active'
        )
        .maybeSingle();

      /**
       * --------------------------------------------------------
       * 7. ERREUR DATABASE
       * --------------------------------------------------------
       */
      if (superAdminError) {
        console.error(
          'SUPER ADMIN DATABASE ERROR:',
          superAdminError
        );

        await supabase.auth.signOut();

        throw new Error(
          'Impossible de vérifier les autorisations SUPER ADMIN. Vérifiez la table super_admins et ses politiques RLS.'
        );
      }

      /**
       * --------------------------------------------------------
       * 8. COMPTE ABSENT DE super_admins
       * --------------------------------------------------------
       */
      if (!superAdmin) {
        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Ce compte existe dans Supabase Authentication mais ne possède pas encore les droits SUPER ADMIN dans JDV CRM.'
        );
      }

      /**
       * --------------------------------------------------------
       * 9. COMPTE DÉSACTIVÉ
       * --------------------------------------------------------
       */
      if (superAdmin.actif !== true) {
        await supabase.auth.signOut();

        throw new Error(
          'Ce compte SUPER ADMIN est actuellement désactivé.'
        );
      }

      /**
       * --------------------------------------------------------
       * 10. VÉRIFICATION FINALE DU STATUT
       * --------------------------------------------------------
       */
      if (superAdmin.status !== 'active') {
        await supabase.auth.signOut();

        throw new Error(
          'Le compte SUPER ADMIN n’est pas actif.'
        );
      }

      /**
       * --------------------------------------------------------
       * 11. CONNEXION RÉUSSIE
       * --------------------------------------------------------
       */
      console.log(
        'CONCEPTEUR AUTHENTIFIÉ:',
        authenticatedUserId
      );

      window.location.replace(
        '/hidden-concepteur-gate/dashboard'
      );
    } catch (err: unknown) {
      console.error(
        'CONCEPTEUR LOGIN ERROR:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue pendant l’authentification.';

      setError(message);
      setLoading(false);
    }
  };

  /**
   * ============================================================
   * SÉLECTION RAPIDE D'UN COMPTE
   * ============================================================
   */
  const selectAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword('');
    setError('');
  };

  /**
   * ============================================================
   * INTERFACE
   * ============================================================
   */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#000000',
        backgroundImage:
          'radial-gradient(circle, rgba(212,175,55,0.04) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }}
    >
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#050A14',
            border:
              '1px solid rgba(212,175,55,0.2)',
            boxShadow:
              '0 0 60px rgba(212,175,55,0.05), 0 8px 40px rgba(0,0,0,0.8)',
          }}
        >
          {/* =====================================================
              HEADER
          ====================================================== */}
          <div className="text-center mb-8">
            <p
              className="text-xs tracking-[0.4em] uppercase font-semibold"
              style={{
                color: '#D4AF37',
              }}
            >
              System Access
            </p>

            <div
              className="w-8 h-px mx-auto mt-3"
              style={{
                background:
                  'rgba(212,175,55,0.3)',
              }}
            />

            <p
              className="text-[10px] uppercase tracking-widest mt-4"
              style={{
                color: '#4A5568',
              }}
            >
              JDV CRM · Concepteur
            </p>
          </div>

          {/* =====================================================
              FORMULAIRE
          ====================================================== */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* EMAIL */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{
                  color: '#4A5568',
                }}
              >
                Email du concepteur
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="romarica15@gmail.com"
                required
                autoComplete="username"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                  caretColor: '#D4AF37',
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{
                  color: '#4A5568',
                }}
              >
                Mot de passe
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="••••••••••••••"
                required
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background:
                    'rgba(255,255,255,0.03)',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                  caretColor: '#D4AF37',
                  opacity: loading ? 0.6 : 1,
                }}
              />
            </div>

            {/* ERREUR */}
            {error && (
              <div
                className="text-xs text-center rounded-lg px-3 py-3"
                style={{
                  color: '#FC8181',
                  background:
                    'rgba(252,129,129,0.08)',
                  border:
                    '1px solid rgba(252,129,129,0.2)',
                  lineHeight: '1.5',
                }}
              >
                {error}
              </div>
            )}

            {/* AVERTISSEMENT */}
            <p
              className="text-xs text-center"
              style={{
                color: '#7B2D2D',
              }}
            >
              ⚠ Unauthorized access is monitored
              and prosecuted
            </p>

            {/* BOUTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-widest uppercase transition-all"
              style={{
                background: loading
                  ? 'rgba(212,175,55,0.2)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: loading
                  ? '#D4AF37' :'#000000',
                boxShadow: loading
                  ? 'none' :'0 4px 20px rgba(212,175,55,0.2)',
                cursor: loading
                  ? 'not-allowed' :'pointer',
              }}
            >
              {loading
                ? 'Vérification...'
                : 'Authentifier'}
            </button>
          </form>

          {/* =====================================================
              COMPTES CONCEPTEURS AUTORISÉS
          ====================================================== */}
          <div
            className="mt-5 pt-4"
            style={{
              borderTop:
                '1px solid rgba(212,175,55,0.08)',
            }}
          >
            <p
              className="text-[9px] uppercase tracking-widest text-center mb-3"
              style={{
                color: '#4A5568',
              }}
            >
              Comptes concepteurs autorisés
            </p>

            <div className="space-y-2">
              {AUTHORIZED_CONCEPTEURS.map(
                (account) => (
                  <button
                    key={account.userId}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      selectAccount(account.email)
                    }
                    className="w-full rounded-lg px-3 py-2 text-left transition-all"
                    style={{
                      color: '#D4AF37',
                      border:
                        '1px solid rgba(212,175,55,0.1)',
                      background:
                        'rgba(212,175,55,0.02)',
                      opacity: loading ? 0.5 : 1,
                      cursor: loading
                        ? 'not-allowed' :'pointer',
                    }}
                  >
                    <span className="text-xs font-semibold">
                      {account.email}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* =====================================================
            FOOTER
        ====================================================== */}
        <p
          className="text-center text-[9px] uppercase tracking-widest mt-5"
          style={{
            color: '#252B38',
          }}
        >
          Protected creator access · JDV CRM
        </p>
      </div>
    </div>
  );
}
