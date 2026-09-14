import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * ============================================================
 * JDV CRM — SUBSCRIPTION CHECKOUT
 * ============================================================
 *
 * Architecture actuelle :
 *
 * auth.users
 *    ↓
 * organization_members
 *    ↓
 * organizations
 *    ↓
 * organization_subscriptions
 *    ↓
 * subscription_payments
 *    ↓
 * FedaPay
 *
 * IMPORTANT :
 * - Aucune table "enterprises" * - Aucun"enterpriseId"
 * - Aucun ancien status_abonnement
 * - Aucun mot de passe ou secret côté client
 * - Aucun abonnement activé depuis le callback
 *
 * La validation définitive du paiement doit être effectuée
 * par le webhook / endpoint de vérification FedaPay.
 * ============================================================
 */

/**
 * ------------------------------------------------------------
 * Variables d'environnement
 * ------------------------------------------------------------
 *
 * Le secret Supabase doit rester côté serveur.
 *
 * Recommandé :
 * SUPABASE_SECRET_KEY=...
 *
 * Compatibilité legacy temporaire :
 * SUPABASE_SERVICE_ROLE_KEY=...
 *
 * NE JAMAIS utiliser :
 * NEXT_PUBLIC_SUPABASE_ANON_KEY
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * comme clé administrative.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_URL est manquante.'
    );
  }

  if (!secretKey) {
    throw new Error(
      '[JDV CRM] SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY est manquante.'
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * ------------------------------------------------------------
 * Supabase client avec session utilisateur
 * ------------------------------------------------------------
 *
 * Ce client sert uniquement à vérifier l'utilisateur connecté.
 */
function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      '[JDV CRM] Variables Supabase publiques manquantes.'
    );
  }

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * ------------------------------------------------------------
 * FedaPay
 * ------------------------------------------------------------
 */
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY;

const FEDAPAY_ENV =
  process.env.FEDAPAY_ENV === 'live' ? 'live' : 'sandbox';

const FEDAPAY_BASE_URL =
  FEDAPAY_ENV === 'live' ?'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1';

/**
 * ------------------------------------------------------------
 * Types
 * ------------------------------------------------------------
 */
interface CheckoutRequest {
  organizationId?: string;
  planCode?: string;
}

interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  active: boolean;
}

interface Organization {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  currency: string;
}

interface OrganizationMember {
  organization_id: string;
  role: string;
  status: string;
}

/**
 * ------------------------------------------------------------
 * POST /api/subscriptions/checkout
 * ------------------------------------------------------------
 */
export async function POST(req: NextRequest) {
  try {
    /**
     * ========================================================
     * 1. Vérifier la configuration FedaPay
     * ========================================================
     */
    if (
      !FEDAPAY_SECRET_KEY ||
      FEDAPAY_SECRET_KEY === 'your-fedapay-secret-key-here'
    ) {
      return NextResponse.json(
        {
          error:
            "FedaPay n'est pas configuré. Ajoutez FEDAPAY_SECRET_KEY côté serveur.",
        },
        { status: 503 }
      );
    }

    /**
     * ========================================================
     * 2. Vérifier l'utilisateur connecté
     * ========================================================
     */
    const supabaseAuth = getSupabaseAuthClient();

    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: 'Authentification requise.',
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Session utilisateur invalide.',
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: 'Session utilisateur invalide ou expirée.',
        },
        { status: 401 }
      );
    }

    /**
     * ========================================================
     * 3. Lire la requête
     * ========================================================
     */
    const body = (await req.json()) as CheckoutRequest;

    const organizationId = body.organizationId?.trim();
    const planCode = body.planCode?.trim().toUpperCase();

    if (!organizationId || !planCode) {
      return NextResponse.json(
        {
          error:
            'organizationId et planCode sont obligatoires.',
        },
        { status: 400 }
      );
    }

    /**
     * ========================================================
     * 4. Vérifier que l'utilisateur appartient à l'organisation
     * ========================================================
     */
    const supabaseAdmin = getSupabaseAdmin();

    const { data: membership, error: membershipError } =
      await supabaseAdmin
        .from('organization_members')
        .select(
          `
            organization_id,
            role,
            status
          `
        )
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle<OrganizationMember>();

    if (membershipError) {
      console.error(
        '[JDV CRM] Membership lookup error:',
        membershipError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les droits de l'utilisateur.",
        },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "Vous n'êtes pas membre actif de cette organisation.",
        },
        { status: 403 }
      );
    }

    /**
     * Seuls les administrateurs de l'organisation
     * peuvent lancer un abonnement.
     */
    if (
      membership.role !== 'business_admin' &&
      membership.role !== 'manager'
    ) {
      return NextResponse.json(
        {
          error:
            "Vous n'avez pas les droits nécessaires pour gérer l'abonnement.",
        },
        { status: 403 }
      );
    }

    /**
     * ========================================================
     * 5. Récupérer l'organisation actuelle
     * ========================================================
     */
    const { data: organization, error: organizationError } =
      await supabaseAdmin
        .from('organizations')
        .select(
          `
            id,
            name,
            email,
            phone,
            country,
            currency
          `
        )
        .eq('id', organizationId)
        .maybeSingle<Organization>();

    if (organizationError) {
      console.error(
        '[JDV CRM] Organization lookup error:',
        organizationError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de récupérer les informations de l'organisation.",
        },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        {
          error: 'Organisation introuvable.',
        },
        { status: 404 }
      );
    }

    /**
     * ========================================================
     * 6. Vérifier le plan dans subscription_plans
     * ========================================================
     *
     * On ne fait plus de PLAN_AMOUNTS codé en dur.
     *
     * La source officielle du prix est la base Supabase.
     */
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select(
        `
          id,
          code,
          name,
          price,
          currency,
          duration_days,
          active
        `
      )
      .eq('code', planCode)
      .eq('active', true)
      .maybeSingle<SubscriptionPlan>();

    if (planError) {
      console.error(
        '[JDV CRM] Subscription plan lookup error:',
        planError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de récupérer le plan d'abonnement.",
        },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        {
          error: `Le plan ${planCode} n'existe pas ou n'est plus disponible.`,
        },
        { status: 404 }
      );
    }

    /**
     * ========================================================
     * 7. Vérification de devise
     * ========================================================
     *
     * Les plans actuels de JDV CRM sont enregistrés en USD.
     *
     * FedaPay utilise ici XOF.
     *
     * Nous refusons donc de convertir silencieusement
     * 50 USD en 50 XOF.
     *
     * Pour activer FedaPay avec ces plans, il faudra définir
     * explicitement la valeur XOF correspondante.
     */
    if (plan.currency !== 'XOF') {
      return NextResponse.json(
        {
          error:
            `Le plan ${plan.code} est configuré en ${plan.currency}. ` +
            'FedaPay doit recevoir un montant XOF explicite. ' +
            'Configurez un montant FedaPay XOF pour ce plan avant de lancer le paiement.',
        },
        { status: 409 }
      );
    }

    /**
     * ========================================================
     * 8. Vérification du montant
     * ========================================================
     */
    const amount = Math.round(Number(plan.price));

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error:
            'Le montant du plan est invalide.',
        },
        { status: 422 }
      );
    }

    /**
     * ========================================================
     * 9. URL de retour
     * ========================================================
     */
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');

    if (!siteUrl) {
      return NextResponse.json(
        {
          error:
            'NEXT_PUBLIC_SITE_URL est manquante.',
        },
        { status: 500 }
      );
    }

    /**
     * IMPORTANT :
     * Le callback sert uniquement au retour utilisateur.
     * Il ne doit jamais activer directement l'abonnement.
     */
    const callbackUrl =
      `${siteUrl}/paiement-retour` +
      `?organization_id=${encodeURIComponent(organizationId)}` +
      `&plan=${encodeURIComponent(plan.code)}`;

    /**
     * ========================================================
     * 10. Créer une souscription PENDING
     * ========================================================
     */
    const { data: subscription, error: subscriptionError } =
      await supabaseAdmin
        .from('organization_subscriptions')
        .insert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: 'pending',
          auto_renew: false,
        })
        .select(
          `
            id,
            organization_id,
            plan_id,
            status
          `
        )
        .single();

    if (subscriptionError || !subscription) {
      console.error(
        '[JDV CRM] Subscription creation error:',
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de créer la demande d'abonnement.",
        },
        { status: 500 }
      );
    }

    /**
     * ========================================================
     * 11. Référence interne unique
     * ========================================================
     */
    const merchantReference =
      `JDVCRM-${organizationId.slice(0, 8)}-` +
      `${subscription.id.slice(0, 8)}-` +
      `${Date.now()}`;

    /**
     * ========================================================
     * 12. Créer le paiement interne PENDING
     * ========================================================
     */
    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from('subscription_payments')
        .insert({
          organization_id: organizationId,
          subscription_id: subscription.id,
          amount,
          currency: plan.currency,
          provider: 'fedapay',
          payment_method: 'checkout',
          status: 'pending',
          metadata: {
            plan_code: plan.code,
            plan_name: plan.name,
            merchant_reference: merchantReference,
            environment: FEDAPAY_ENV,
          },
        })
        .select(
          `
            id,
            organization_id,
            subscription_id,
            amount,
            currency,
            status
          `
        )
        .single();

    if (paymentError || !payment) {
      console.error(
        '[JDV CRM] Payment creation error:',
        paymentError
      );

      /**
       * On annule uniquement la souscription PENDING
       * qui vient d'être créée dans cette tentative.
       */
      await supabaseAdmin
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', subscription.id)
        .eq('status', 'pending');

      return NextResponse.json(
        {
          error:
            "Impossible d'enregistrer la demande de paiement.",
        },
        { status: 500 }
      );
    }

    /**
     * ========================================================
     * 13. Créer la transaction FedaPay
     * ========================================================
     */
    const fedapayResponse = await fetch(
      `${FEDAPAY_BASE_URL}/transactions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description:
            `Abonnement JDV CRM — ${plan.name} — ${organization.name}`,

          amount,

          currency: {
            iso: 'XOF',
          },

          callback_url: callbackUrl,

          merchant_reference: merchantReference,

          custom_metadata: {
            organization_id: organizationId,
            subscription_id: subscription.id,
            payment_id: payment.id,
            plan_code: plan.code,
          },

          customer: {
            email:
              organization.email ??
              user.email ??
              undefined,
          },
        }),
      }
    );

    if (!fedapayResponse.ok) {
      const errorText = await fedapayResponse.text();

      console.error(
        '[JDV CRM] FedaPay transaction creation failed:',
        fedapayResponse.status,
        errorText
      );

      await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'failed',
          metadata: {
            plan_code: plan.code,
            merchant_reference: merchantReference,
            environment: FEDAPAY_ENV,
            fedapay_error: errorText.slice(0, 1000),
          },
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', subscription.id)
        .eq('status', 'pending');

      return NextResponse.json(
        {
          error:
            "FedaPay n'a pas pu créer la transaction.",
        },
        { status: 502 }
      );
    }

    /**
     * ========================================================
     * 14. Lire la transaction FedaPay
     * ========================================================
     */
    const fedapayData = await fedapayResponse.json();

    const transactionId =
      fedapayData?.id ??
      fedapayData?.v1?.transaction?.id ??
      fedapayData?.transaction?.id;

    const transactionReference =
      fedapayData?.reference ??
      fedapayData?.transaction?.reference ??
      null;

    if (!transactionId) {
      console.error(
        '[JDV CRM] FedaPay transaction ID introuvable:',
        fedapayData
      );

      await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'failed',
          metadata: {
            plan_code: plan.code,
            merchant_reference: merchantReference,
            environment: FEDAPAY_ENV,
            fedapay_response: fedapayData,
          },
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', subscription.id)
        .eq('status', 'pending');

      return NextResponse.json(
        {
          error:
            'Identifiant de transaction FedaPay introuvable.',
        },
        { status: 502 }
      );
    }

    /**
     * ========================================================
     * 15. Enregistrer la référence FedaPay
     * ========================================================
     */
    await supabaseAdmin
      .from('subscription_payments')
      .update({
        provider_reference: String(transactionId),
        metadata: {
          plan_code: plan.code,
          merchant_reference: merchantReference,
          fedapay_reference: transactionReference,
          fedapay_transaction_id: transactionId,
          environment: FEDAPAY_ENV,
        },
      })
      .eq('id', payment.id);

    /**
     * ========================================================
     * 16. Générer le lien de paiement FedaPay
     * ========================================================
     */
    const tokenResponse = await fetch(
      `${FEDAPAY_BASE_URL}/transactions/${transactionId}/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${FEDAPAY_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();

      console.error(
        '[JDV CRM] FedaPay token generation failed:',
        tokenResponse.status,
        errorText
      );

      await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'failed',
          metadata: {
            plan_code: plan.code,
            merchant_reference: merchantReference,
            fedapay_transaction_id: transactionId,
            environment: FEDAPAY_ENV,
            fedapay_token_error: errorText.slice(0, 1000),
          },
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', subscription.id)
        .eq('status', 'pending');

      return NextResponse.json(
        {
          error:
            'Impossible de générer le lien de paiement FedaPay.',
        },
        { status: 502 }
      );
    }

    /**
     * ========================================================
     * 17. Récupérer le checkout URL
     * ========================================================
     */
    const tokenData = await tokenResponse.json();

    const checkoutUrl =
      tokenData?.url ??
      tokenData?.token?.url;

    if (!checkoutUrl) {
      console.error(
        '[JDV CRM] FedaPay checkout URL introuvable:',
        tokenData
      );

      await supabaseAdmin
        .from('subscription_payments')
        .update({
          status: 'failed',
          metadata: {
            plan_code: plan.code,
            merchant_reference: merchantReference,
            fedapay_transaction_id: transactionId,
            environment: FEDAPAY_ENV,
            fedapay_token_response: tokenData,
          },
        })
        .eq('id', payment.id);

      await supabaseAdmin
        .from('organization_subscriptions')
        .update({
          status: 'cancelled',
        })
        .eq('id', subscription.id)
        .eq('status', 'pending');

      return NextResponse.json(
        {
          error:
            'Lien de paiement FedaPay introuvable.',
        },
        { status: 502 }
      );
    }

    /**
     * ========================================================
     * 18. Réponse finale
     * ========================================================
     *
     * L'abonnement reste PENDING.
     *
     * Il sera activé UNIQUEMENT après validation réelle
     * du paiement par le webhook / contrôle FedaPay.
     */
    return NextResponse.json({
      checkoutUrl,
      organizationId,
      subscriptionId: subscription.id,
      paymentId: payment.id,
      planCode: plan.code,
      amount,
      currency: plan.currency,
      provider: 'fedapay',
      environment: FEDAPAY_ENV,
    });
  } catch (error) {
    console.error(
      '[JDV CRM] Subscription checkout error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Une erreur interne est survenue lors de la préparation du paiement.',
      },
      { status: 500 }
    );
  }
}
