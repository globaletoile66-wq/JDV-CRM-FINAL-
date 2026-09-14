'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * ============================================================
 * JDV CRM
 * CONNEXION SUPER ADMIN / CONCEPTEUR
 * ============================================================
 *
 * IMPORTANT :
 * - Le SUPER ADMIN reste un rôle indépendant.
 * - Aucun abonnement n'est exigé pour le SUPER ADMIN.
 * - La vérification finale des droits se fait dans
 *   public.super_admins.
 * - Aucun service_role n'est utilisé dans le navigateur.
 */

/**
 * Comptes SUPER ADMIN / CONCEPTEUR autorisés.
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
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * ==========================================================
   * CONNEXION
   * ==========================================================
   */
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      /**
       * --------------------------------------------------------
       * 1. VÉRIFICATION DE L'EMAIL AUTORISÉ
       * --------------------------------------------------------
       */
      const authorizedAccount = AUTHORIZED_CONCEPTEURS.find(
        (account) =>
          account.email.toLowerCase() === normalizedEmail
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
      } = await supabase.auth.signInWithPassword({
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
       * 3. UID RÉEL DE LA SESSION
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
      } = await supabase.auth.getSession();

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
       * 6. VÉRIFICATION DIRECTE DANS super_admins
       * --------------------------------------------------------
       *
       * IMPORTANT :
       * On utilise un tableau au lieu de maybeSingle()
       * afin de voir exactement ce que Supabase retourne.
       */
      const {
        data: superAdmins,
        error: superAdminError,
      } = await supabase
        .from('super_admins')
        .select(
          'id, user_id, status, actif'
        )
        .eq(
          'user_id',
          authenticatedUserId
        );

      console.log(
        'SUPER ADMIN DATA =',
        superAdmins
      );

      console.log(
        'SUPER ADMIN ERROR =',
        superAdminError
      );

      /**
       * --------------------------------------------------------
       * 7. ERREUR DE LECTURE DE LA TABLE
       * --------------------------------------------------------
       */
      if (superAdminError) {
        console.error(
          'ERREUR LECTURE super_admins =',
          superAdminError
        );

        await supabase.auth.signOut();

        throw new Error(
          `Erreur lors de la vérification des droits SUPER ADMIN : ${superAdminError.message}`
        );
      }

      /**
       * --------------------------------------------------------
       * 8. AUCUNE LIGNE TROUVÉE
       * --------------------------------------------------------
       */
      if (
        !superAdmins ||
        superAdmins.length === 0
      ) {
        console.error(
          'AUCUN SUPER ADMIN TROUVÉ POUR UID =',
          authenticatedUserId
        );

        await supabase.auth.signOut();

        throw new Error(
          `Aucune ligne SUPER ADMIN visible pour l’UID ${authenticatedUserId}.`
        );
      }

      /**
       * --------------------------------------------------------
       * 9. RÉCUPÉRATION DU SUPER ADMIN
       * --------------------------------------------------------
       */
      const superAdmin = superAdmins[0];

      console.log(
        'SUPER ADMIN VÉRIFIÉ =',
        superAdmin
      );

      /**
       * --------------------------------------------------------
       * 10. VÉRIFICATION DU STATUT
       * --------------------------------------------------------
       */
      if (
        superAdmin.status !== 'active'
      ) {
        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte SUPER ADMIN est actuellement inactif.'
        );
      }

      /**
       * --------------------------------------------------------
       * 11. VÉRIFICATION ACTIF
       * --------------------------------------------------------
       */
      if (
        superAdmin.actif !== true
      ) {
        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte SUPER ADMIN a été désactivé.'
        );
      }

      /**
       * --------------------------------------------------------
       * 12. SESSION FINALE
       * --------------------------------------------------------
       */
      const {
        data: finalSession,
        error: finalSessionError,
      } = await supabase.auth.getSession();

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
       * 13. SUCCÈS
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
       * Redirection vers le portail SUPER ADMIN.
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

      if (
        error instanceof Error
      ) {
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

    const normalizedEmail = email.trim().toLowerCase();

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

      if (
        error instanceof Error
      ) {
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

        {/* Logo / identité */}
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

        {/* Carte */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email */}
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

            {/* Mot de passe */}
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

            {/* Mot de passe oublié */}
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

            {/* Message */}
            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {/* Connexion */}
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

          {/* Sécurité */}
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