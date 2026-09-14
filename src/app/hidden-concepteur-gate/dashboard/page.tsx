'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AUTHORIZED_CONCEPTEURS = [
  {
    email: 'romarica15@gmail.com',
    userId: '57e90659-4ace-4824-aa4f-de84317622e8',
  },
  {
    email: 'ets.miracle.jdv@gmail.com',
    userId: '2e2b8bd7-d736-4e75-ab21-9e6e7b5cb1a1',
  },
];

export default function HiddenConcepteurLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setCheckingSession(false);
          return;
        }

        const authorized = AUTHORIZED_CONCEPTEURS.find(
          (admin) =>
            admin.userId === user.id &&
            admin.email.toLowerCase() ===
              (user.email || '').toLowerCase()
        );

        if (!authorized) {
          setCheckingSession(false);
          return;
        }

        const { data: superAdmin, error } = await supabase
          .from('super_admins')
          .select('user_id, status, actif')
          .eq('user_id', user.id)
          .maybeSingle();

        if (
          !error &&
          superAdmin &&
          superAdmin.status === 'active' &&
          superAdmin.actif === true
        ) {
          router.replace('/hidden-concepteur-gate/dashboard');
          return;
        }

        setCheckingSession(false);
      } catch (error) {
        console.error(
          '[JDV CRM] Erreur vérification session:',
          error
        );

        setCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router, supabase]);

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage(
        'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
      );
      return;
    }

    const authorizedAccount =
      AUTHORIZED_CONCEPTEURS.find(
        (admin) =>
          admin.email.toLowerCase() === cleanEmail
      );

    if (!authorizedAccount) {
      setErrorMessage(
        'Accès refusé : ce compte ne possède pas les droits SUPER ADMIN.'
      );
      return;
    }

    setLoading(true);

    try {
      console.log('=== JDV CRM — CONNEXION SUPER ADMIN ===');
      console.log('EMAIL =', cleanEmail);

      /*
       * 1. Authentification Supabase
       */
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        console.error(
          '[JDV CRM] Auth error:',
          authError
        );

        setErrorMessage(
          `Échec de connexion : ${authError.message}`
        );

        return;
      }

      if (!authData.user) {
        setErrorMessage(
          'Supabase a accepté la connexion mais aucun utilisateur n’a été retourné.'
        );

        return;
      }

      console.log(
        '[JDV CRM] Authentification réussie'
      );

      console.log(
        '[JDV CRM] USER ID =',
        authData.user.id
      );

      console.log(
        '[JDV CRM] EMAIL =',
        authData.user.email
      );

      console.log(
        '[JDV CRM] SESSION PRÉSENTE =',
        Boolean(authData.session)
      );

      /*
       * 2. Vérification UID autorisé
       */
      if (
        authData.user.id !==
        authorizedAccount.userId
      ) {
        console.error(
          '[JDV CRM] UID non autorisé:',
          authData.user.id
        );

        await supabase.auth.signOut();

        setErrorMessage(
          'Accès refusé : cet utilisateur n’est pas autorisé comme SUPER ADMIN.'
        );

        return;
      }

      /*
       * 3. Vérification réelle de la session
       *
       * On utilise getUser() plutôt que de dépendre
       * du RPC auth.uid().
       */
      const {
        data: currentUserData,
        error: currentUserError,
      } = await supabase.auth.getUser();

      console.log(
        '[JDV CRM] getUser() =',
        currentUserData.user?.id ?? null
      );

      if (currentUserError) {
        console.error(
          '[JDV CRM] getUser error:',
          currentUserError
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Session Supabase invalide : ${currentUserError.message}`
        );

        return;
      }

      if (!currentUserData.user) {
        await supabase.auth.signOut();

        setErrorMessage(
          'Supabase a authentifié le compte mais aucune session utilisateur active n’est disponible.'
        );

        return;
      }

      /*
       * 4. Vérification de la table super_admins
       *
       * RLS doit permettre à un SUPER ADMIN de lire
       * sa propre ligne.
       */
      const {
        data: superAdmin,
        error: superAdminError,
      } = await supabase
        .from('super_admins')
        .select('user_id, status, actif')
        .eq('user_id', currentUserData.user.id)
        .maybeSingle();

      console.log(
        '[JDV CRM] Résultat super_admins =',
        superAdmin
      );

      console.log(
        '[JDV CRM] Erreur super_admins =',
        superAdminError
      );

      if (superAdminError) {
        console.error(
          '[JDV CRM] Erreur lecture super_admins:',
          superAdminError
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Supabase refuse la lecture de votre compte SUPER ADMIN : ${superAdminError.message}`
        );

        return;
      }

      if (!superAdmin) {
        await supabase.auth.signOut();

        setErrorMessage(
          'Accès refusé : votre compte authentifié ne possède aucune entrée dans la table SUPER ADMIN.'
        );

        return;
      }

      /*
       * 5. Vérification statut
       */
      if (
        superAdmin.status !== 'active' ||
        superAdmin.actif !== true
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé : compte SUPER ADMIN inactif. status=${String(
            superAdmin.status
          )}, actif=${String(superAdmin.actif)}`
        );

        return;
      }

      /*
       * 6. Tout est validé
       */
      console.log(
        '========================================'
      );
      console.log(
        '[JDV CRM] SUPER ADMIN AUTHENTIFIÉ'
      );
      console.log(
        '[JDV CRM] UID =',
        currentUserData.user.id
      );
      console.log(
        '[JDV CRM] EMAIL =',
        currentUserData.user.email
      );
      console.log(
        '========================================'
      );

      router.replace(
        '/hidden-concepteur-gate/dashboard'
      );
    } catch (error) {
      console.error(
        '[JDV CRM] Erreur inattendue:',
        error
      );

      setErrorMessage(
        'Une erreur inattendue est survenue pendant la connexion.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage(
        'Entrez d’abord votre adresse e-mail.'
      );
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        setErrorMessage(
          `Erreur : ${error.message}`
        );
        return;
      }

      setErrorMessage(
        'Un lien de réinitialisation a été envoyé à cette adresse e-mail si elle existe.'
      );
    } catch (error) {
      console.error(
        '[JDV CRM] Reset password error:',
        error
      );

      setErrorMessage(
        'Impossible d’envoyer le lien de réinitialisation.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0B1B3D] text-white">
        <div className="text-center">
          <div className="mb-4 text-3xl">🔐</div>
          <p className="text-white/70">
            Vérification de la session sécurisée...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B1B3D] px-4 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#07142F] p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mb-3 text-4xl">
              🔐
            </div>

            <h1 className="text-2xl font-bold">
              SUPER ADMIN
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Espace concepteur JDV CRM
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium">
                Adresse e-mail
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                placeholder="Votre adresse e-mail"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#D4AF37]"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Mot de passe
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  placeholder="Votre mot de passe"
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-[#D4AF37]"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-bold text-[#0B1B3D] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Vérification...'
                : 'Accéder au SUPER ADMIN'}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="w-full text-center text-sm text-[#D4AF37] hover:underline disabled:opacity-50"
            >
              Mot de passe oublié ?
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}