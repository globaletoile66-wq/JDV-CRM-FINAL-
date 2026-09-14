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

type SuperAdminResult = {
  is_super_admin: boolean;
  user_id: string | null;
  status: string | null;
  actif: boolean;
};

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
   * ============================================================
   * SESSION EXISTANTE
   * ============================================================
   */
  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        console.log(
          '=== JDV CRM — SESSION EXISTANTE ==='
        );

        console.log(
          'SESSION USER ID =',
          session?.user?.id ?? null
        );

        console.log(
          'SESSION EMAIL =',
          session?.user?.email ?? null
        );

        console.log(
          'SESSION ERROR =',
          error ?? null
        );

        console.log(
          '==================================='
        );

        if (!mounted || !session?.user) {
          return;
        }

        const sessionUserId = session.user.id;

        const authorized =
          AUTHORIZED_CONCEPTEURS.some(
            (account) =>
              account.userId === sessionUserId
          );

        if (!authorized) {
          return;
        }

        /*
         * Vérification réelle du SUPER ADMIN
         * avant de rediriger.
         */
        const {
          data: rpcData,
          error: rpcError,
        } = await supabase.rpc(
          'verify_current_super_admin'
        );

        console.log(
          '=== JDV CRM — SESSION SUPER ADMIN ==='
        );

        console.log(
          'RPC DATA =',
          rpcData
        );

        console.log(
          'RPC ERROR =',
          rpcError
        );

        console.log(
          '======================================'
        );

        if (rpcError) {
          return;
        }

        const result = Array.isArray(rpcData)
          ? rpcData[0]
          : rpcData;

        if (
          result?.is_super_admin === true &&
          result?.user_id === sessionUserId
        ) {
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
   * ============================================================
   * CONNEXION SUPER ADMIN
   * ============================================================
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
       * --------------------------------------------------------
       * 1. VALIDATION DES CHAMPS
       * --------------------------------------------------------
       */
      if (!normalizedEmail || !password) {
        setErrorMessage(
          'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
        );
        return;
      }

      /*
       * --------------------------------------------------------
       * 2. VÉRIFICATION DE L'EMAIL AUTORISÉ
       * --------------------------------------------------------
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
       * --------------------------------------------------------
       * 3. AUTHENTIFICATION SUPABASE
       * --------------------------------------------------------
       */
      console.log(
        '=========================================='
      );

      console.log(
        'JDV CRM — TENTATIVE AUTHENTIFICATION'
      );

      console.log(
        'EMAIL SAISI =',
        normalizedEmail
      );

      console.log(
        '=========================================='
      );

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
        'JDV CRM — RÉSULTAT AUTHENTIFICATION'
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
console.log(
  '=== JDV CRM — SESSION APRÈS AUTH ==='
);

console.log(
  'ACCESS TOKEN PRÉSENT =',
  !!authData.session?.access_token
);

console.log(
  'REFRESH TOKEN PRÉSENT =',
  !!authData.session?.refresh_token
);

console.log(
  'USER ID =',
  authData.user.id
);

console.log(
  '===================================='
);

if (authData.session) {
  const {
    error: setSessionError,
  } = await supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });

  console.log(
    'SET SESSION ERROR =',
    setSessionError
  );

  if (setSessionError) {
    setErrorMessage(
      `Impossible de finaliser la session Supabase : ${setSessionError.message}`
    );

    return;
  }
}
      /*
       * --------------------------------------------------------
       * 4. VÉRIFICATION UID
       * --------------------------------------------------------
       */
      console.log(
        '=== JDV CRM — VÉRIFICATION UID ==='
      );

      console.log(
        'UID AUTHENTIFIÉ =',
        authenticatedUserId
      );

      console.log(
        'UID AUTORISÉ =',
        authorizedAccount.userId
      );

      console.log(
        'UID CORRESPOND =',
        authenticatedUserId ===
          authorizedAccount.userId
      );

      console.log(
        '=================================='
      );

      if (
        authenticatedUserId !==
        authorizedAccount.userId
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé : l'UID Supabase (${authenticatedUserId}) ne correspond pas à l'UID SUPER ADMIN autorisé (${authorizedAccount.userId}).`
        );

        return;
      }

      /*
       * --------------------------------------------------------
       * 5. VÉRIFICATION SUPER ADMIN PAR RPC
       * --------------------------------------------------------
       */
      console.log(
        '=========================================='
      );

      console.log(
        'JDV CRM — APPEL RPC SUPER ADMIN'
      );

      console.log(
        'Fonction = verify_current_super_admin'
      );

      console.log(
        'UID AUTH =',
        authenticatedUserId
      );

      console.log(
        '=========================================='
      );

      const {
        data: rpcData,
        error: rpcError,
      } = await supabase.rpc(
        'verify_current_super_admin'
      );

      console.log(
        '=========================================='
      );

      console.log(
        'JDV CRM — RÉSULTAT RPC SUPER ADMIN'
      );

      console.log(
        'RPC DATA =',
        rpcData
      );

      console.log(
        'RPC ERROR =',
        rpcError
      );

      console.log(
        '=========================================='
      );

      /*
       * --------------------------------------------------------
       * 6. ERREUR RPC
       * --------------------------------------------------------
       */
      if (rpcError) {
        console.error(
          'ERREUR RPC SUPER ADMIN =',
          rpcError
        );

        setErrorMessage(
          `Erreur lors de la vérification SUPER ADMIN : ${rpcError.message}`
        );

        return;
      }

      /*
       * --------------------------------------------------------
       * 7. EXTRACTION DU RÉSULTAT
       * --------------------------------------------------------
       */
      const superAdmin =
        Array.isArray(rpcData)
          ? (rpcData[0] as
              | SuperAdminResult
              | undefined)
          : (rpcData as
              | SuperAdminResult
              | null);

      console.log(
        '=== JDV CRM — SUPER ADMIN FINAL ==='
      );

      console.log(
        'SUPER ADMIN =',
        superAdmin
      );

      console.log(
        'IS SUPER ADMIN =',
        superAdmin?.is_super_admin
      );

      console.log(
        'RPC USER ID =',
        superAdmin?.user_id
      );

      console.log(
        'RPC STATUS =',
        superAdmin?.status
      );

      console.log(
        'RPC ACTIF =',
        superAdmin?.actif
      );

      console.log(
        'AUTH USER ID =',
        authenticatedUserId
      );

      console.log(
        '===================================='
      );

      /*
       * --------------------------------------------------------
       * 8. VÉRIFICATION DÉFINITIVE
       * --------------------------------------------------------
       */
      if (!superAdmin) {
        await supabase.auth.signOut();

        setErrorMessage(
          'ERREUR : Supabase a authentifié le compte, mais la fonction SUPER ADMIN n’a retourné aucune donnée.'
        );

        return;
      }

      if (
        superAdmin.is_super_admin !== true
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé par Supabase. Résultat RPC : is_super_admin=${String(
            superAdmin.is_super_admin
          )}, user_id=${String(
            superAdmin.user_id
          )}, status=${String(
            superAdmin.status
          )}, actif=${String(
            superAdmin.actif
          )}.`
        );

        return;
      }

      if (
        superAdmin.user_id !==
        authenticatedUserId
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Sécurité : l'UID retourné par le serveur (${String(
            superAdmin.user_id
          )}) ne correspond pas à l'UID connecté (${authenticatedUserId}).`
        );

        return;
      }

      if (
        superAdmin.status !== 'active'
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          `Accès refusé : le compte SUPER ADMIN possède le statut "${String(
            superAdmin.status
          )}" au lieu de "active".`
        );

        return;
      }

      if (
        superAdmin.actif !== true
      ) {
        await supabase.auth.signOut();

        setErrorMessage(
          'Accès refusé : le compte SUPER ADMIN est marqué comme inactif.'
        );

        return;
      }

      /*
       * --------------------------------------------------------
       * 9. SUPER ADMIN VALIDÉ
       * --------------------------------------------------------
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
       * Laisser Supabase persister la session.
       */
      await new Promise(
        (resolve) =>
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
   * ============================================================
   * MOT DE PASSE OUBLIÉ
   * ============================================================
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

      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo,
          }
        );

      if (error) {
        setErrorMessage(
          error.message
        );
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

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */
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
                  setEmail(
                    event.target.value
                  )
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
                  placeholder="Votre mot de passe"
                  disabled={loading}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-3 pr-24 text-white outline-none placeholder:text-white/30 focus:border-[#D4AF37] disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
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

            {/* CONNEXION */}
            <button
              type="submit"
              disabled={
                loading ||
                resetLoading
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
              onClick={
                handlePasswordReset
              }
              disabled={
                loading ||
                resetLoading
              }
              className="w-full text-sm text-white/60 transition hover:text-[#D4AF37] disabled:opacity-50"
            >
              {resetLoading
                ? 'Envoi en cours…'
                : 'Mot de passe oublié ?'}
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