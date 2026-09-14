'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const AUTHORIZED_CONCEPTEURS = [
  {
    email: 'romarica15@gmail.com',
    userId: '57e90659-4ace-4824-aa4f-de84317622e8',
  },
  {
    email: 'ets.miracle.jdv@gmail.com',
    userId: '2e2b8bd7-d736-4e43-97a2-dcce9444805d',
  },
];

export default function ConcepteurLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /*
   * Vérification automatique d'une session déjà existante.
   */
  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        console.log('=== VERIFICATION SESSION AU CHARGEMENT ===');
        console.log('SESSION =', data.session);
        console.log(
          'SESSION USER ID =',
          data.session?.user?.id ?? null
        );
        console.log(
          'SESSION EMAIL =',
          data.session?.user?.email ?? null
        );
        console.log('SESSION ERROR =', error ?? null);
        console.log('==========================================');

        if (!mounted) return;

        if (data.session?.user) {
          const sessionUserId = data.session.user.id;

          const authorized = AUTHORIZED_CONCEPTEURS.some(
            (account) => account.userId === sessionUserId
          );

          if (authorized) {
            router.replace('/hidden-concepteur-gate/dashboard');
          }
        }
      } catch (err) {
        console.error(
          'Erreur lors de la vérification de session :',
          err
        );
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /*
   * Connexion SUPER ADMIN
   */
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (!normalizedEmail || !password) {
        setErrorMessage(
          'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
        );
        return;
      }

      /*
       * Vérification préalable de l'adresse autorisée.
       */
      const authorizedAccount = AUTHORIZED_CONCEPTEURS.find(
        (account) =>
          account.email.toLowerCase() === normalizedEmail
      );

      if (!authorizedAccount) {
        setErrorMessage(
          'Cette adresse e-mail n’est pas autorisée à accéder à l’espace SUPER ADMIN / CONCEPTEUR.'
        );
        return;
      }

      /*
       * 1 — Authentification Supabase
       */
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      console.log('=== DIAGNOSTIC SUPABASE AUTH ===');
      console.log(
        'AUTH USER ID =',
        authData.user?.id ?? null
      );
      console.log(
        'AUTH EMAIL =',
        authData.user?.email ?? null
      );
      console.log(
        'AUTH ERROR =',
        authError ?? null
      );
      console.log('================================');

      if (authError) {
        console.error('Erreur Supabase Auth:', authError);

        setErrorMessage(
          authError.message ||
            'Impossible de vous connecter.'
        );
        return;
      }

      if (!authData.user) {
        setErrorMessage(
          'Supabase n’a retourné aucun utilisateur après la connexion.'
        );
        return;
      }

      const authenticatedUserId = authData.user.id;

      /*
       * 2 — Vérification stricte de l'UID autorisé
       */
      if (authenticatedUserId !== authorizedAccount.userId) {
        console.error(
          'UID authentifié différent de l’UID autorisé.',
          {
            authenticatedUserId,
            authorizedUserId: authorizedAccount.userId,
          }
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé. L’UID ${authenticatedUserId} ne correspond pas au compte SUPER ADMIN autorisé.`
        );
        return;
      }

      /*
       * 3 — Vérification de la session réellement créée
       */
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log('=== DIAGNOSTIC SESSION ===');
      console.log(
        'SESSION =',
        sessionData.session ?? null
      );
      console.log(
        'SESSION USER ID =',
        sessionData.session?.user?.id ?? null
      );
      console.log(
        'SESSION EMAIL =',
        sessionData.session?.user?.email ?? null
      );
      console.log(
        'SESSION ERROR =',
        sessionError ?? null
      );
      console.log('==========================');

      if (sessionError) {
        console.error(
          'Erreur récupération session:',
          sessionError
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Impossible de récupérer la session Supabase : ${sessionError.message}`
        );
        return;
      }

      if (!sessionData.session) {
        console.error(
          'Aucune session Supabase active après signInWithPassword.'
        );

        await supabase.auth.signOut();

        setErrorMessage(
          'Aucune session utilisateur Supabase active après la connexion. Vérifiez la configuration du client Supabase.'
        );
        return;
      }

      /*
       * 4 — Vérification que la session correspond bien à l'UID attendu
       */
      const sessionUserId = sessionData.session.user.id;

      if (sessionUserId !== authorizedAccount.userId) {
        console.error(
          'La session Supabase contient un UID inattendu.',
          {
            sessionUserId,
            expectedUserId: authorizedAccount.userId,
          }
        );

        await supabase.auth.signOut();

        setErrorMessage(
          'La session Supabase ne correspond pas au compte SUPER ADMIN attendu.'
        );
        return;
      }

      /*
       * 5 — Vérification SUPER ADMIN côté base via RPC
       *
       * La fonction SQL doit exister :
       * public.verify_current_super_admin
       */
      const {
        data: isSuperAdmin,
        error: superAdminError,
      } = await supabase.rpc(
        'verify_current_super_admin'
      );

      console.log('=== VERIFICATION SUPER ADMIN ===');
      console.log(
        'SUPER ADMIN RPC RESULT =',
        isSuperAdmin
      );
      console.log(
        'SUPER ADMIN RPC ERROR =',
        superAdminError ?? null
      );
      console.log('================================');

      if (superAdminError) {
        console.error(
          'Erreur RPC SUPER ADMIN:',
          superAdminError
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Erreur lors de la vérification des droits SUPER ADMIN : ${superAdminError.message}`
        );
        return;
      }

      if (isSuperAdmin !== true) {
        console.error(
          'Le compte authentifié n’est pas SUPER ADMIN actif.'
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé. L’UID ${authenticatedUserId} n’est pas reconnu comme SUPER ADMIN actif dans JDV CRM.`
        );
        return;
      }

      /*
       * 6 — Tout est validé
       */
      console.log(
        'SUPER ADMIN AUTHENTIFIÉ AVEC SUCCÈS'
      );
      console.log(
        'Redirection vers /hidden-concepteur-gate/dashboard'
      );

      setSuccessMessage(
        'Connexion SUPER ADMIN réussie. Redirection…'
      );

      /*
       * Petite temporisation pour permettre au navigateur
       * de persister la session avant la navigation.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      router.replace(
        '/hidden-concepteur-gate/dashboard'
      );
    } catch (error) {
      console.error(
        'Erreur inattendue pendant la connexion :',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur inattendue est survenue.'
      );

      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error(
          'Erreur lors de la déconnexion de sécurité :',
          signOutError
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Réinitialisation du mot de passe
   */
  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage('');
    setSuccessMessage('');

    if (!normalizedEmail) {
      setErrorMessage(
        'Veuillez saisir votre adresse e-mail avant de demander la réinitialisation du mot de passe.'
      );
      return;
    }

    const authorizedAccount = AUTHORIZED_CONCEPTEURS.find(
      (account) =>
        account.email.toLowerCase() === normalizedEmail
    );

    if (!authorizedAccount) {
      setErrorMessage(
        'Cette adresse e-mail n’est pas autorisée à utiliser la récupération du compte SUPER ADMIN.'
      );
      return;
    }

    setResetLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/hidden-concepteur-gate/reset-password`
          : undefined;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        console.error(
          'Erreur réinitialisation mot de passe:',
          error
        );

        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        'Un e-mail de réinitialisation du mot de passe a été envoyé à cette adresse.'
      );
    } catch (error) {
      console.error(
        'Erreur inattendue réinitialisation:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Impossible d’envoyer l’e-mail de réinitialisation.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1B3D] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#08152f] shadow-2xl overflow-hidden">
          {/* En-tête */}
          <div className="px-6 py-8 text-center border-b border-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#D4AF37]">
              <span className="text-2xl font-bold text-[#D4AF37]">
                JDV
              </span>
            </div>

            <h1 className="text-2xl font-bold">
              SUPER ADMIN
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Espace sécurisé CONCEPTEUR
            </p>
          </div>

          {/* Formulaire */}
          <form
            onSubmit={handleLogin}
            className="p-6 space-y-5"
          >
            {/* E-mail */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="votre@email.com"
                disabled={loading}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white/80"
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
                    setPassword(event.target.value)
                  }
                  placeholder="Votre mot de passe"
                  disabled={loading}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 pr-24 text-white outline-none transition placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#D4AF37] hover:text-white disabled:opacity-50"
                >
                  {showPassword
                    ? 'Masquer'
                    : 'Afficher'}
                </button>
              </div>
            </div>

            {/* Message erreur */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Message succès */}
            {successMessage && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {successMessage}
              </div>
            )}

            {/* Connexion */}
            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-bold text-[#0B1B3D] transition hover:bg-[#e2c45b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Vérification en cours…'
                : 'Se connecter'}
            </button>

            {/* Mot de passe oublié */}
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={loading || resetLoading}
              className="w-full text-sm text-white/60 transition hover:text-[#D4AF37] disabled:opacity-50"
            >
              {resetLoading
                ? 'Envoi en cours…'
                : 'Mot de passe oublié ?'}
            </button>
          </form>

          {/* Sécurité */}
          <div className="border-t border-white/10 px-6 py-4 text-center">
            <p className="text-xs text-white/40">
              Accès réservé aux comptes SUPER ADMIN /
              CONCEPTEUR autorisés.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
