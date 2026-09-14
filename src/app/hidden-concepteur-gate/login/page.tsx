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
    userId: '2e2b8bd7-d736-4e75-ab21-9e6e7b5cb1a1',
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
   * Vérification d'une session existante.
   */
  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        console.log(
          '=== JDV CRM — SESSION EXISTANTE ==='
        );
        console.log(
          'SESSION USER ID =',
          data.session?.user?.id ?? null
        );
        console.log(
          'SESSION EMAIL =',
          data.session?.user?.email ?? null
        );
        console.log(
          'SESSION ERROR =',
          error ?? null
        );
        console.log(
          '==================================='
        );

        if (!mounted) return;

        if (!data.session?.user) {
          return;
        }

        const sessionUserId =
          data.session.user.id;

        const authorized =
          AUTHORIZED_CONCEPTEURS.some(
            (account) =>
              account.userId === sessionUserId
          );

        if (authorized) {
          router.replace(
            '/hidden-concepteur-gate/dashboard'
          );
        }
      } catch (error) {
        console.error(
          'Erreur vérification session existante :',
          error
        );
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  /*
   * CONNEXION SUPER ADMIN
   */
  const handleLogin = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedEmail =
      email.trim().toLowerCase();

    try {
      /*
       * -----------------------------------------------------
       * 1. Vérification des champs
       * -----------------------------------------------------
       */
      if (!normalizedEmail || !password) {
        setErrorMessage(
          'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
        );
        return;
      }

      /*
       * -----------------------------------------------------
       * 2. Vérification de l'e-mail autorisé
       * -----------------------------------------------------
       */
      const authorizedAccount =
        AUTHORIZED_CONCEPTEURS.find(
          (account) =>
            account.email.toLowerCase() ===
            normalizedEmail
        );

      if (!authorizedAccount) {
        setErrorMessage(
          "Cette adresse e-mail n'est pas autorisée à accéder à l'espace SUPER ADMIN / CONCEPTEUR."
        );
        return;
      }

      /*
       * -----------------------------------------------------
       * 3. AUTHENTIFICATION SUPABASE
       * -----------------------------------------------------
       */
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      console.log(
        '=========================================='
      );
      console.log(
        'JDV CRM — AUTHENTIFICATION'
      );
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
      console.log(
        '=========================================='
      );

      if (authError) {
        setErrorMessage(
          authError.message ||
            'Impossible de vous connecter.'
        );
        return;
      }

      if (!authData.user) {
        setErrorMessage(
          "Supabase n'a retourné aucun utilisateur après la connexion."
        );
        return;
      }

      const authenticatedUserId =
        authData.user.id;

      /*
       * -----------------------------------------------------
       * 4. VÉRIFICATION DE L'UID
       * -----------------------------------------------------
       */
      if (
        authenticatedUserId !==
        authorizedAccount.userId
      ) {
        console.error(
          'UID non autorisé',
          {
            authenticatedUserId,
            authorizedUserId:
              authorizedAccount.userId,
          }
        );

        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé. L’UID ${authenticatedUserId} ne correspond pas au compte SUPER ADMIN autorisé.`
        );

        return;
      }

      console.log(
        'UID SUPER ADMIN CORRECT =',
        authenticatedUserId
      );

      /*
       * -----------------------------------------------------
       * 5. VÉRIFICATION DIRECTE DANS super_admins
       * -----------------------------------------------------
       *
       * Pas de RPC.
       * Pas de SECURITY DEFINER.
       * Pas de service_role.
       *
       * La politique RLS super_admins_select_own
       * autorise l'utilisateur à lire sa propre ligne.
       */
const {
  data: superAdminResult,
  error: superAdminError,
} = await supabase.rpc(
  'verify_current_super_admin'
);

console.log(
  '=== JDV CRM — VÉRIFICATION SUPER ADMIN ==='
);

console.log(
  'AUTH USER ID =',
  authenticatedUserId
);

console.log(
  'SUPER ADMIN RESULT =',
  superAdminResult
);

console.log(
  'SUPER ADMIN ERROR =',
  superAdminError
);

console.log(
  '=========================================='
);

if (superAdminError) {
  console.error(
    'Erreur vérification SUPER ADMIN :',
    superAdminError
  );

  setErrorMessage(
    `Impossible de vérifier les droits SUPER ADMIN : ${superAdminError.message}`
  );

  return;
}

const superAdmin = Array.isArray(superAdminResult)
  ? superAdminResult[0]
  : superAdminResult;

if (
  !superAdmin ||
  superAdmin.is_super_admin !== true
) {
  await supabase.auth.signOut();

  setErrorMessage(
    "Accès refusé. Votre compte Supabase est authentifié, mais aucune autorisation SUPER ADMIN active n’a été trouvée."
  );

  return;
}

console.log(
  'JDV CRM — SUPER ADMIN VALIDÉ',
  {
    userId: superAdmin.user_id,
    status: superAdmin.status,
    actif: superAdmin.actif,
  }
);

setSuccessMessage(
  'Connexion SUPER ADMIN réussie. Ouverture du tableau de bord…'
);

await new Promise((resolve) =>
  setTimeout(resolve, 500)
);

router.replace(
  '/hidden-concepteur-gate/dashboard'
);   

      console.log(
        '=========================================='
      );
      console.log(
        'JDV CRM — VÉRIFICATION SUPER ADMIN'
      );
      console.log(
        'SUPER ADMIN DATA =',
        superAdmin
      );
      console.log(
        'SUPER ADMIN ERROR =',
        superAdminError ?? null
      );
      console.log(
        '=========================================='
      );

      /*
       * Erreur de lecture de la table
       */
      if (superAdminError) {
        console.error(
          'Erreur lecture super_admins :',
          superAdminError
        );

        setErrorMessage(
          `Impossible de vérifier les droits SUPER ADMIN : ${superAdminError.message}`
        );

        return;
      }

      /*
       * Aucune ligne trouvée
       */
      if (!superAdmin) {
        await supabase.auth.signOut();

        setErrorMessage(
          "Accès refusé. Votre compte Supabase est authentifié, mais aucune autorisation SUPER ADMIN active n’a été trouvée."
        );

        return;
      }

      /*
       * -----------------------------------------------------
       * 6. VÉRIFICATION STATUS
       * -----------------------------------------------------
       */
      const statusActive =
        superAdmin.status === 'active';

      const accountActive =
        superAdmin.actif !== false;

      if (
        !statusActive ||
        !accountActive
      ) {
        console.error(
          'Compte SUPER ADMIN inactif',
          superAdmin
        );

        await supabase.auth.signOut();

        setErrorMessage(
          'Accès refusé. Le compte SUPER ADMIN existe mais il est actuellement inactif.'
        );

        return;
      }

      /*
       * -----------------------------------------------------
       * 7. TOUT EST VALIDÉ
       * -----------------------------------------------------
       */
      console.log(
        '=========================================='
      );
      console.log(
        'JDV CRM — SUPER ADMIN VALIDÉ'
      );
      console.log(
        'EMAIL =',
        normalizedEmail
      );
      console.log(
        'UID =',
        authenticatedUserId
      );
      console.log(
        'STATUS =',
        superAdmin.status
      );
      console.log(
        'ACTIF =',
        superAdmin.actif
      );
      console.log(
        'REDIRECTION DASHBOARD'
      );
      console.log(
        '=========================================='
      );

      setSuccessMessage(
        'Connexion SUPER ADMIN réussie. Ouverture du tableau de bord…'
      );

      /*
       * Laisser Supabase terminer la persistance
       * de l'authentification avant la navigation.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      router.replace(
        '/hidden-concepteur-gate/dashboard'
      );
    } catch (error) {
      console.error(
        'Erreur inattendue de connexion :',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Une erreur inattendue est survenue.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * MOT DE PASSE OUBLIÉ
   */
  const handlePasswordReset = async () => {
    const normalizedEmail =
      email.trim().toLowerCase();

    setErrorMessage('');
    setSuccessMessage('');

    if (!normalizedEmail) {
      setErrorMessage(
        'Veuillez saisir votre adresse e-mail.'
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

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
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
        'Erreur réinitialisation mot de passe :',
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

        <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/40 bg-[#08152f] shadow-2xl">

          {/* HEADER */}
          <div className="border-b border-white/10 px-6 py-8 text-center">

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

          {/* FORMULAIRE */}
          <form
            onSubmit={handleLogin}
            className="space-y-5 p-6"
          >

            {/* EMAIL */}
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
                className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
              />
            </div>

            {/* MOT DE PASSE */}
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
                      ? 'text' :'password'
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Votre mot de passe"
                  disabled={loading}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 pr-24 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
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
                    ? 'Masquer' :'Afficher'}
                </button>

              </div>
            </div>

            {/* ERREUR */}
            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {/* SUCCÈS */}
            {successMessage && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {successMessage}
              </div>
            )}

            {/* BOUTON CONNEXION */}
            <button
              type="submit"
              disabled={
                loading || resetLoading
              }
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-3 font-bold text-[#0B1B3D] transition hover:bg-[#e2c45b] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Vérification en cours…'
                : 'Se connecter'}
            </button>

            {/* MOT DE PASSE OUBLIÉ */}
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={
                loading || resetLoading
              }
              className="w-full text-sm text-white/60 transition hover:text-[#D4AF37] disabled:opacity-50"
            >
              {resetLoading
                ? 'Envoi en cours…' :'Mot de passe oublié ?'}
            </button>

          </form>

          {/* FOOTER */}
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
