'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {
  checkCurrentSuperAdmin,
  findAuthorizedByEmail,
  SUPER_ADMIN_DASHBOARD_ROUTE,
} from '@/lib/auth/super-admin';

const SESSION_CHECK_TIMEOUT_MS = 6000;

export default function ConcepteurLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const redirectedRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const goToDashboard = () => {
    if (redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;

    router.replace(SUPER_ADMIN_DASHBOARD_ROUTE);
  };

  useEffect(() => {
    let mounted = true;

    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn(
          '[JDV CRM] Vérification de session trop longue — formulaire rendu à l\u2019utilisateur.'
        );

        setCheckingSession(false);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    const run = async () => {
      try {
        const result = await checkCurrentSuperAdmin();

        console.log('[JDV CRM] Session existante :', result);

        if (!mounted) {
          return;
        }

        if (result.ok) {
          goToDashboard();
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error(
          '[JDV CRM] Erreur vérification session existante :',
          error
        );

        if (mounted) {
          setCheckingSession(false);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    run();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage(
        'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
      );
      return;
    }

    const authorizedAccount = findAuthorizedByEmail(normalizedEmail);

    if (!authorizedAccount) {
      setErrorMessage(
        "Cette adresse e-mail n'est pas autorisée à accéder à l'espace SUPER ADMIN / CONCEPTEUR."
      );
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      console.log('[JDV CRM] Authentification :', {
        userId: authData?.user?.id ?? null,
        session: Boolean(authData?.session),
        error: authError?.message ?? null,
      });

      if (authError) {
        setErrorMessage(
          `Échec de connexion : ${authError.message}`
        );
        return;
      }

      if (!authData.user) {
        setErrorMessage(
          "Supabase n'a retourné aucun utilisateur après la connexion."
        );
        return;
      }

      if (authData.user.id !== authorizedAccount.userId) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Accès refusé : cet utilisateur n'est pas autorisé comme SUPER ADMIN."
        );
        return;
      }

      const result = await checkCurrentSuperAdmin();

      console.log('[JDV CRM] Vérification SUPER ADMIN :', result);

      if (!result.ok) {
        await supabase.auth.signOut();

        setErrorMessage(`Accès refusé. ${result.message}`);
        return;
      }

      setSuccessMessage(
        'Connexion SUPER ADMIN réussie. Ouverture du tableau de bord…'
      );

      goToDashboard();
    } catch (error) {
      console.error('[JDV CRM] Erreur inattendue :', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur inattendue est survenue.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    setErrorMessage('');
    setSuccessMessage('');

    if (!normalizedEmail) {
      setErrorMessage('Veuillez saisir votre adresse e-mail.');
      return;
    }

    if (!findAuthorizedByEmail(normalizedEmail)) {
      setErrorMessage(
        "Cette adresse e-mail n'est pas autorisée à utiliser la récupération du compte SUPER ADMIN."
      );
      return;
    }

    setResetLoading(true);

    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/hidden-concepteur-gate/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        'Un e-mail de réinitialisation du mot de passe a été envoyé.'
      );
    } catch (error) {
      console.error(
        '[JDV CRM] Erreur réinitialisation mot de passe :',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer l'e-mail de réinitialisation."
      );
    } finally {
      setResetLoading(false);
    }
  };

  const busy = loading || resetLoading;

  return (
    <main className="min-h-screen bg-[#0B1B3D] text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#08152f] shadow-2xl">
          <div className="border-b border-white/10 px-6 py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#D4AF37]">
              <span className="text-2xl font-bold text-[#D4AF37]">JDV</span>
            </div>

            <h1 className="text-2xl font-bold">SUPER ADMIN</h1>

            <p className="mt-2 text-sm text-white/60">
              Espace sécurisé CONCEPTEUR
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 p-6">
            {checkingSession && (
              <div className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/60">
                Vérification de la session en cours… Vous pouvez vous connecter
                sans attendre.
              </div>
            )}

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
                onChange={(event) => setEmail(event.target.value)}
                placeholder="votre@email.com"
                disabled={busy}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
              />
            </div>

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
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Votre mot de passe"
                  disabled={busy}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 pr-24 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={busy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#D4AF37] hover:text-white disabled:opacity-50"
                  tabIndex={-1}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-bold text-[#0B1B3D] transition hover:bg-[#e2c45b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Vérification en cours…' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={busy}
              className="w-full text-sm text-white/60 transition hover:text-[#D4AF37] disabled:opacity-50"
            >
              {resetLoading ? 'Envoi en cours…' : 'Mot de passe oublié ?'}
            </button>
          </form>

          <div className="border-t border-white/10 px-6 py-4 text-center">
            <p className="text-xs text-white/40">
              Accès réservé aux comptes SUPER ADMIN / CONCEPTEUR autorisés.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}