'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Organization = {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked' | 'trial' | 'expired';
  subscription_status: 'inactive' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
};

type Subscription = {
  id: string;
  status: 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired';
  expires_at: string | null;
  plan_id: string | null;
};

export default function BusinessLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      /*
       * 1. AUTHENTIFICATION SUPABASE
       */
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) {
        throw new Error(
          'Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe.'
        );
      }

      const user = authData.user;

      if (!user) {
        throw new Error('Connexion échouée. Veuillez réessayer.');
      }

      /*
       * 2. VÉRIFICATION DU PROFIL
       *
       * L'email vient de auth.users.
       * Les informations complémentaires viennent de profiles.
       */
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, display_name, status')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[JDV CRM] Erreur profil:', profileError);
      }

      if (!profile) {
        await supabase.auth.signOut();

        throw new Error(
          'Votre profil JDV CRM est introuvable. Contactez l’administrateur.'
        );
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();

        throw new Error(
          'Votre compte est actuellement désactivé. Contactez l’administrateur.'
        );
      }

      /*
       * 3. RECHERCHE DU MEMBRE DANS UNE ORGANISATION
       *
       * Le portail Business est réservé au business_admin.
       */
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('role', 'business_admin')
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error('[JDV CRM] Erreur membership:', membershipError);

        await supabase.auth.signOut();

        throw new Error(
          'Impossible de vérifier les droits de votre compte entreprise.'
        );
      }

      if (!membership) {
        await supabase.auth.signOut();

        throw new Error(
          'Accès refusé : ce compte ne possède pas les droits Administrateur Entreprise.'
        );
      }

      const organizationId = membership.organization_id;

      if (!organizationId) {
        await supabase.auth.signOut();

        throw new Error(
          'Aucune organisation n’est associée à votre compte.'
        );
      }

      /*
       * 4. RÉCUPÉRATION DE L'ORGANISATION
       */
      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .select(
          'id, name, status, subscription_status'
        )
        .eq('id', organizationId)
        .maybeSingle();

      if (organizationError) {
        console.error('[JDV CRM] Erreur organisation:', organizationError);

        await supabase.auth.signOut();

        throw new Error(
          'Impossible de vérifier votre organisation.'
        );
      }

      if (!organization) {
        await supabase.auth.signOut();

        throw new Error(
          'Organisation introuvable. Contactez le support JDV CRM.'
        );
      }

      const typedOrganization = organization as Organization;

      /*
       * 5. ORGANISATION BLOQUÉE
       */
      if (typedOrganization.status === 'blocked') {
        await supabase.auth.signOut();

        throw new Error(
          `L’organisation "${typedOrganization.name}" est actuellement bloquée. Contactez le support JDV CRM.`
        );
      }

      /*
       * 6. ORGANISATION SUSPENDUE
       */
      if (typedOrganization.status === 'suspended') {
        await supabase.auth.signOut();

        throw new Error(
          `L’accès de "${typedOrganization.name}" est temporairement suspendu. Contactez le support JDV CRM.`
        );
      }

      /*
       * 7. RÉCUPÉRATION DU DERNIER ABONNEMENT
       *
       * Attention :
       * organization_subscriptions.status n'accepte PAS "trial".
       * Le trial est représenté par organizations.subscription_status = "trial".
       */
      const { data: subscription, error: subscriptionError } = await supabase
        .from('organization_subscriptions')
        .select('id, status, expires_at, plan_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.error('[JDV CRM] Erreur abonnement:', subscriptionError);

        await supabase.auth.signOut();

        throw new Error(
          'Impossible de vérifier l’état de votre abonnement.'
        );
      }

      const typedSubscription = subscription as Subscription | null;

      /*
       * 8. TRIAL
       *
       * Le statut trial est porté par organizations.subscription_status.
       * On vérifie également la date d'expiration de l'abonnement associé * lorsqu'elle existe.
       */
      if (typedOrganization.subscription_status === 'trial') {
        if (
          typedSubscription?.expires_at &&
          new Date(typedSubscription.expires_at).getTime() <= Date.now()
        ) {
          /*
           * Aucun UPDATE ici.
           *
           * Le navigateur ne doit pas modifier lui-même l'état * d'abonnement de l'organisation.
           *
           * Le paiement / backend s'occupe de l'activation.
           */
          window.location.replace('/payment-wall');
          return;
        }

        router.replace('/business/dashboard');
        return;
      }

      /*
       * 9. ABONNEMENT ACTIF
       */
      if (typedOrganization.subscription_status === 'active') {
        /*
         * Si l'abonnement existe et possède une date d'expiration
         * dépassée, on ne donne pas accès au dashboard.
         */
        if (
          typedSubscription?.expires_at &&
          new Date(typedSubscription.expires_at).getTime() <= Date.now()
        ) {
          window.location.replace('/payment-wall');
          return;
        }

        if (
          typedSubscription &&
          typedSubscription.status !== 'active'
        ) {
          window.location.replace('/payment-wall');
          return;
        }

        router.replace('/business/dashboard');
        return;
      }

      /*
       * 10. ABONNEMENT EXPIRÉ / ANNULÉ / IMPAYÉ / INACTIF
       */
      if (
        typedOrganization.subscription_status === 'expired' ||
        typedOrganization.subscription_status === 'cancelled' ||
        typedOrganization.subscription_status === 'past_due' ||
        typedOrganization.subscription_status === 'inactive'
      ) {
        window.location.replace('/payment-wall');
        return;
      }

      /*
       * 11. ORGANISATION EN ATTENTE
       */
      if (typedOrganization.status === 'pending') {
        window.location.replace('/payment-wall');
        return;
      }

      /*
       * 12. ÉTAT INCONNU
       */
      await supabase.auth.signOut();

      throw new Error(
        `L’état d’accès de "${typedOrganization.name}" ne permet pas encore la connexion. Contactez le support JDV CRM.`
      );
    } catch (caughtError) {
      console.error('[JDV CRM] Connexion Business:', caughtError);

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Une erreur est survenue pendant la connexion.';

      setError(message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: '#0B1B3D' }}
    >
      <div className="w-full max-w-md">
        {/* LOGO */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-4xl font-extrabold tracking-widest mb-2"
            style={{
              background:
                'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            JDV CRM
          </div>

          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: '#A0AEC0' }}
          >
            Portail Administrateur Entreprise
          </p>
        </div>

        {/* CARD */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: '#0F2347',
            border: '1px solid rgba(212,175,55,0.25)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div className="mb-7">
            <h1 className="text-white text-2xl font-bold mb-2">
              Bienvenue
            </h1>

            <p
              className="text-sm"
              style={{ color: '#718096' }}
            >
              Connectez-vous à votre espace administrateur entreprise.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* EMAIL */}
            <div>
              <label
                htmlFor="business-email"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                Adresse Email
              </label>

              <input
                id="business-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@votreentreprise.com"
                autoComplete="email"
                required
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all disabled:opacity-60"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  caretColor: '#D4AF37',
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = '#D4AF37';
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor =
                    'rgba(212,175,55,0.2)';
                }}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label
                htmlFor="business-password"
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#A0AEC0' }}
              >
                Mot de Passe
              </label>

              <input
                id="business-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all disabled:opacity-60"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(212,175,55,0.2)',
                  caretColor: '#D4AF37',
                }}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = '#D4AF37';
                }}
                onBlur={(event) => {
                  event.currentTarget.style.borderColor =
                    'rgba(212,175,55,0.2)';
                }}
              />
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="text-xs rounded-lg px-3 py-3"
                style={{
                  color: '#FC8181',
                  background: 'rgba(252,129,129,0.1)',
                  border: '1px solid rgba(252,129,129,0.2)',
                }}
              >
                {error}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase transition-all disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? 'rgba(212,175,55,0.4)'
                  : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: '#0B1B3D',
                boxShadow: loading
                  ? 'none' :'0 4px 20px rgba(212,175,55,0.3)',
              }}
            >
              {loading
                ? 'Authentification...'
                : 'Accéder au Portail Entreprise'}
            </button>
          </form>

          {/* INFO */}
          <div
            className="mt-6 pt-5 border-t"
            style={{
              borderColor: 'rgba(212,175,55,0.1)',
            }}
          >
            <p
              className="text-xs text-center leading-relaxed"
              style={{ color: '#718096' }}
            >
              Utilisez les identifiants de votre compte administrateur
              entreprise créé dans JDV CRM.
            </p>
          </div>
        </div>

        {/* RETOUR */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: '#718096' }}
          >
            ← Retour à JDV CRM
          </Link>
        </div>
      </div>
    </div>
  );
}