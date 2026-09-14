```tsx
'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AUTHORIZED_CONCEPTEURS = [
  {
    email: 'romarica15@gmail.com',
    userId: '57e90659-4ace-4824-aa4f-de84317622e8',
  },
  {
    email: 'ets.miracle.jdv@gmail.com',
    userId: '2e2b8bd7-d736-4e43-97a2-dcce9444805d',
  },
] as const;

export default function ConcepteurLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * ==========================================================
   * CONNEXION SUPER ADMIN / CONCEPTEUR
   * ==========================================================
   */
  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    try {
      /**
       * --------------------------------------------------------
       * 1. VÉRIFICATION DE L'EMAIL AUTORISÉ
       * --------------------------------------------------------
       */
      const authorizedAccount =
        AUTHORIZED_CONCEPTEURS.find(
          (account) =>
            account.email.toLowerCase() ===
            normalizedEmail
        );

      if (!authorizedAccount) {
        throw new Error(
          'Accès refusé. Cette adresse email n’est pas autorisée comme compte SUPER ADMIN / CONCEPTEUR.'
        );
      }

      /**
       * --------------------------------------------------------
       * 2. AUTHENTIFICATION SUPABASE
       * --------------------------------------------------------
       */
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (authError) {
        console.error(
          'ERREUR SUPABASE AUTH =',
          authError
        );

        throw new Error(
          authError.message ||
            'Email ou mot de passe incorrect.'
        );
      }

      if (!authData.user) {
        throw new Error(
          'Supabase n’a retourné aucun utilisateur après la connexion.'
        );
      }

      /**
       * --------------------------------------------------------
       * 3. UID RÉEL
       * --------------------------------------------------------
       */
      const authenticatedUserId =
        authData.user.id;

      console.log(
        '========== JDV CRM SUPER ADMIN =========='
      );

      console.log(
        'AUTH USER ID =',
        authenticatedUserId
      );

      console.log(
        'AUTHORIZED USER ID =',
        authorizedAccount.userId
      );

      console.log(
        'AUTH EMAIL =',
        authData.user.email
      );

      /**
       * --------------------------------------------------------
       * 4. VÉRIFICATION DE LA SESSION
       * --------------------------------------------------------
       */
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      console.log(
        'SESSION USER ID =',
        sessionData.session?.user?.id
      );

      console.log(
        'SESSION EMAIL =',
        sessionData.session?.user?.email
      );

      console.log(
        'SESSION ROLE =',
        sessionData.session?.user?.role
      );

      console.log(
        'SESSION ERROR =',
        sessionError
      );

      if (sessionError) {
        await supabase.auth.signOut();

        throw new Error(
          `Impossible de récupérer la session Supabase : ${sessionError.message}`
        );
      }

      if (
        !sessionData.session?.user
      ) {
        await supabase.auth.signOut();

        throw new Error(
          'Aucune session utilisateur Supabase active.'
        );
      }

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
          'UID CONCEPTEUR NON AUTORISÉ =',
          authenticatedUserId
        );

        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte Supabase utilisé ne correspond pas à l’UID du concepteur autorisé.'
        );
      }

      /**
       * --------------------------------------------------------
       * 6. VÉRIFICATION SÉCURISÉE DU SUPER ADMIN
       * --------------------------------------------------------
       *
       * La vérification est effectuée par PostgreSQL
       * via la fonction RPC.
       *
       * Le frontend ne lit plus directement la table
       * super_admins.
       */
      const {
        data: isSuperAdmin,
        error: superAdminError,
      } =
        await supabase.rpc(
          'verify_current_super_admin'
        );

      console.log(
        'SUPER ADMIN RPC RESULT =',
        isSuperAdmin
      );

      console.log(
        'SUPER ADMIN RPC ERROR =',
        superAdminError
      );

      /**
       * --------------------------------------------------------
       * 7. ERREUR RPC
       * --------------------------------------------------------
       */
      if (superAdminError) {
        console.error(
          'ERREUR RPC SUPER ADMIN =',
          superAdminError
        );

        await supabase.auth.signOut();

        throw new Error(
          `Erreur de vérification SUPER ADMIN : ${superAdminError.message}`
        );
      }

      /**
       * --------------------------------------------------------
       * 8. COMPTE NON RECONNU COMME SUPER ADMIN
       * --------------------------------------------------------
       */
      if (isSuperAdmin !== true) {
        console.error(
          'SUPER ADMIN NON AUTORISÉ POUR UID =',
          authenticatedUserId
        );

        await supabase.auth.signOut();

        throw new Error(
          `Accès refusé. L’UID ${authenticatedUserId} n’est pas reconnu comme SUPER ADMIN actif.`
        );
      }

      /**
       * --------------------------------------------------------
       * 9. SUPER ADMIN VALIDÉ
       * --------------------------------------------------------
       */
      console.log(
        'SUPER ADMIN VALIDÉ PAR SUPABASE'
      );

      /**
       * --------------------------------------------------------
       * 10. VÉRIFICATION FINALE DE SESSION
       * --------------------------------------------------------
       */
      const {
        data: finalSession,
        error: finalSessionError,
      } =
        await supabase.auth.getSession();

      if (finalSessionError) {
        await supabase.auth.signOut();

        throw new Error(
          `Erreur de session finale : ${finalSessionError.message}`
        );
      }

      if (
        !finalSession.session?.user
      ) {
        await supabase.auth.signOut();

        throw new Error(
          'La session SUPER ADMIN n’est plus disponible.'
        );
      }

      /**
       * --------------------------------------------------------
       * 11. CONNEXION RÉUSSIE
       * --------------------------------------------------------
       */
      console.log(
        'SUPER ADMIN AUTHENTIFIÉ AVEC SUCCÈS'
      );

      console.log(
        'UID FINAL =',
        finalSession.session.user.id
      );

      console.log(
        'EMAIL FINAL =',
        finalSession.session.user.email
      );

      console.log(
        '=========================================='
      );

      /**
       * Redirection vers le dashboard SUPER ADMIN.
       */
      router.replace(
        '/hidden-concepteur-gate/dashboard'
      );

      router.refresh();
    } catch (error) {
      console.error(
        'ERREUR CONNEXION CONCEPTEUR =',
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          'Une erreur inattendue est survenue lors de la connexion.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ==========================================================
   * MOT DE PASSE OUBLIÉ
   * ==========================================================
   */
  const handleForgotPassword = async () => {
    setErrorMessage('');

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        'Saisis d’abord ton adresse email.'
      );
      return;
    }

    const authorizedAccount =
      AUTHORIZED_CONCEPTEURS.find(
        (account) =>
          account.email.toLowerCase() ===
          normalizedEmail
      );

    if (!authorizedAccount) {
      setErrorMessage(
        'Cette adresse email n’est pas autorisée pour le compte SUPER ADMIN / CONCEPTEUR.'
      );
      return;
    }

    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/hidden-concepteur-gate/reset-password`;

      const {
        error: resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (resetError) {
        throw new Error(
          resetError.message
        );
      }

      setErrorMessage(
        'Un lien de réinitialisation du mot de passe vient d’être envoyé à ton adresse email.'
      );
    } catch (error) {
      console.error(
        'ERREUR MOT DE PASSE OUBLIÉ =',
        error
      );

      if (error instanceof Error) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          'Impossible d’envoyer le lien de réinitialisation.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */
  return (
    <main className="min-h-screen bg-[#0B1B3D] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#D4AF37] bg-[#111F43] shadow-lg">
            <span className="text-2xl font-bold text-[#D4AF37]">
              JDV
            </span>
          </div>

          <h1 className="text-2xl font-bold">
            SUPER ADMIN / CONCEPTEUR
          </h1>

          <p className="mt-2 text-sm text-white/70">
            Accès sécurisé à JDV CRM
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Adresse email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="Votre adresse email"
                disabled={loading}
                className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-[#D4AF37] disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Mot de passe
              </label>

              <div className="relative">
                <input
                  id="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 pr-12 text-white outline-none transition focus:border-[#D4AF37] disabled:opacity-60"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-white/70 hover:text-[#D4AF37]"
                >
                  {showPassword
                    ? '🙈'
                    : '👁'}
                </button>
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={
                  handleForgotPassword
                }
                disabled={loading}
                className="text-sm text-[#D4AF37] hover:underline disabled:opacity-50"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#D4AF37] px-4 py-3 font-bold text-[#0B1B3D] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Vérification en cours...'
                : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <p className="text-xs text-white/50">
              Accès réservé aux comptes
              SUPER ADMIN / CONCEPTEUR autorisés.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}
```
