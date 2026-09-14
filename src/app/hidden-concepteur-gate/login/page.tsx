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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {
      /**
       * --------------------------------------------------------
       * 1. NETTOYAGE DES INFORMATIONS
       * --------------------------------------------------------
       */
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !password) {
        throw new Error(
          'Veuillez renseigner votre adresse e-mail et votre mot de passe.'
        );
      }

      /**
       * --------------------------------------------------------
       * 2. VÉRIFICATION DU COMPTE CONCEPTEUR AUTORISÉ
       * --------------------------------------------------------
       */
      const authorizedAccount = AUTHORIZED_CONCEPTEURS.find(
        (account) =>
          account.email.toLowerCase() === normalizedEmail
      );

      if (!authorizedAccount) {
        throw new Error(
          'Accès refusé. Cette adresse e-mail n’est pas autorisée comme compte SUPER ADMIN / CONCEPTEUR.'
        );
      }

      /**
       * --------------------------------------------------------
       * 3. CONNEXION SUPABASE AUTH
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
          'SUPABASE AUTH ERROR =',
          authError
        );

        throw new Error(
          authError.message ||
            'Impossible de se connecter à Supabase Authentication.'
        );
      }

      if (!authData.user) {
        throw new Error(
          'Aucun utilisateur Supabase n’a été retourné après la connexion.'
        );
      }

      /**
       * --------------------------------------------------------
       * 4. RÉCUPÉRATION ET DIAGNOSTIC DE L'UID
       * --------------------------------------------------------
       */
      const authenticatedUserId =
        authData.user.id;

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

      console.log(
        'SUPER ADMIN DATA =',
        superAdmin
      );

      console.log(
        'SUPER ADMIN ERROR =',
        superAdminError
      );

      /**
       * --------------------------------------------------------
       * 7. GESTION D'UNE ERREUR DE BASE DE DONNÉES
       * --------------------------------------------------------
       */
      if (superAdminError) {
        console.error(
          'ERREUR LECTURE super_admins =',
          superAdminError
        );

        throw new Error(
          `Erreur lors de la vérification des droits SUPER ADMIN : ${superAdminError.message}`
        );
      }

      /**
       * --------------------------------------------------------
       * 8. VÉRIFICATION DE L'EXISTENCE DU SUPER ADMIN
       * --------------------------------------------------------
       */
      if (!superAdmin) {
        console.error(
          'AUCUN SUPER ADMIN TROUVÉ POUR UID =',
          authenticatedUserId
        );

        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Ce compte existe dans Supabase Authentication mais ne possède pas encore les droits SUPER ADMIN dans JDV CRM.'
        );
      }

      /**
       * --------------------------------------------------------
       * 9. VÉRIFICATION DU STATUT actif
       * --------------------------------------------------------
       */
      if (
        superAdmin.actif !== true
      ) {
        console.error(
          'COMPTE SUPER ADMIN DÉSACTIVÉ =',
          superAdmin
        );

        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte SUPER ADMIN est actuellement désactivé.'
        );
      }

      /**
       * --------------------------------------------------------
       * 10. VÉRIFICATION DU STATUS
       * --------------------------------------------------------
       */
      if (
        superAdmin.status !== 'active'
      ) {
        console.error(
          'STATUS SUPER ADMIN INACTIF =',
          superAdmin.status
        );

        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé. Le compte SUPER ADMIN n’est pas actif.'
        );
      }

      /**
       * --------------------------------------------------------
       * 11. CONNEXION VALIDÉE
       * --------------------------------------------------------
       */
      console.log(
        '✅ SUPER ADMIN AUTHENTIFIÉ AVEC SUCCÈS'
      );

      console.log(
        'SUPER ADMIN ID =',
        superAdmin.id
      );

      console.log(
        'SUPER ADMIN USER ID =',
        superAdmin.user_id
      );

      console.log(
        'SUPER ADMIN STATUS =',
        superAdmin.status
      );

      console.log(
        'SUPER ADMIN ACTIF =',
        superAdmin.actif
      );

      /**
       * --------------------------------------------------------
       * 12. REDIRECTION VERS LE DASHBOARD CONCEPTEUR
       * --------------------------------------------------------
       */
      router.push(
        '/hidden-concepteur-gate/dashboard'
      );

      router.refresh();
    } catch (error) {
      console.error(
        'ERREUR CONNEXION CONCEPTEUR =',
        error
      );

      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Une erreur inattendue est survenue lors de la connexion.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1B3D] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0B1B3D]">
              <span className="text-2xl font-bold text-[#D4AF37]">
                JDV
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[#0B1B3D]">
              SUPER ADMIN
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Espace CONCEPTEUR JDV CRM
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Adresse e-mail
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Votre adresse e-mail"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
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
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-gray-900 outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0B1B3D]"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0B1B3D] px-4 py-3 font-semibold text-white transition hover:bg-[#132957] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? 'Connexion en cours...'
                : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/hidden-concepteur-gate/forgot-password'
                )
              }
              className="text-sm font-medium text-[#0B1B3D] underline hover:text-[#D4AF37]"
            >
              Mot de passe oublié ?
            </button>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-5 text-center">
            <p className="text-xs text-gray-400">
              Accès sécurisé — JDV CRM
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}