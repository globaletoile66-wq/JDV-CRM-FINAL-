import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FEDAPAY_ENV =
  process.env.FEDAPAY_ENV === 'live' ?'live' :'sandbox';

const FEDAPAY_BASE_URL =
  FEDAPAY_ENV === 'live' ?'https://api.fedapay.com/v1'
    : 'https://sandbox-api.fedapay.com/v1';

const VALID_PLAN_CODES = [
  'MONTHLY',
  'QUARTERLY',
  'SEMESTER',
  'ANNUAL',
] as const;

type PlanCode = (typeof VALID_PLAN_CODES)[number];

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      '[JDV CRM] NEXT_PUBLIC_SUPABASE_URL manquante.'
    );
  }

  if (!secretKey) {
    throw new Error(
      '[JDV CRM] SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY manquante.'
    );
  }

  return createClient(
    url,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function normalizePlanCode(
  value: unknown
): PlanCode | null {
  if (!value) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase();

  if (
    VALID_PLAN_CODES.includes(
      normalized as PlanCode
    )
  ) {
    return normalized as PlanCode;
  }

  return null;
}

function extractEntity(
  event: Record<string, unknown>
): Record<string, unknown> {
  if (
    event.entity &&
    typeof event.entity === 'object'
  ) {
    return event.entity as Record<
      string,
      unknown
    >;
  }

  if (
    event.data &&
    typeof event.data === 'object'
  ) {
    return event.data as Record<
      string,
      unknown
    >;
  }

  return event;
}

function extractCustomMetadata(
  entity: Record<string, unknown>
): Record<string, string> {
  const metadata =
    entity.custom_metadata;

  if (
    metadata &&
    typeof metadata === 'object'
  ) {
    return metadata as Record<
      string,
      string
    >;
  }

  return {};
}

function getTransactionId(
  entity: Record<string, unknown>
): string | null {
  const candidates = [
    entity.id,
    entity.transaction_id,
    entity.reference,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      return String(value);
    }
  }

  return null;
}

function getMerchantReference(
  entity: Record<string, unknown>
): string | null {
  const value =
    entity.merchant_reference;

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const reference =
    String(value).trim();

  return reference || null;
}

function getEventName(
  event: Record<string, unknown>
): string {
  return String(
    event.name ||
      event.type ||
      event.event ||
      ''
  )
    .trim()
    .toLowerCase();
}

async function verifyFedaPayTransaction(
  transactionId: string
) {
  const secret =
    process.env.FEDAPAY_SECRET_KEY;

  if (!secret) {
    throw new Error(
      '[JDV CRM] FEDAPAY_SECRET_KEY manquante.'
    );
  }

  const response = await fetch(
    `${FEDAPAY_BASE_URL}/transactions/${encodeURIComponent(
      transactionId
    )}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        Accept:
          'application/json',
      },
      cache: 'no-store',
    }
  );

  const payload =
    await response.json().catch(
      () => null
    );

  if (!response.ok) {
    throw new Error(
      `FedaPay verification failed (${response.status}).`
    );
  }

  return payload;
}

function extractVerifiedTransaction(
  payload: unknown
): Record<string, unknown> {
  if (
    payload &&
    typeof payload === 'object'
  ) {
    const root =
      payload as Record<
        string,
        unknown
      >;

    if (
      root.v1 &&
      typeof root.v1 === 'object'
    ) {
      return root.v1 as Record<
        string,
        unknown
      >;
    }

    if (
      root.transaction &&
      typeof root.transaction === 'object'
    ) {
      return root.transaction as Record<
        string,
        unknown
      >;
    }

    if (
      root.entity &&
      typeof root.entity === 'object'
    ) {
      return root.entity as Record<
        string,
        unknown
      >;
    }

    return root;
  }

  return {};
}

function getFedaPayStatus(
  transaction: Record<string, unknown>
): string {
  return String(
    transaction.status ||
      transaction.state ||
      ''
  )
    .trim()
    .toLowerCase();
}

function isApprovedStatus(
  status: string
): boolean {
  return [
    'approved',
    'successful',
    'success',
    'completed',
    'paid',
  ].includes(status);
}

function isFailedStatus(
  status: string
): boolean {
  return [
    'declined',
    'canceled',
    'cancelled',
    'failed',
    'failure',
    'refunded',
  ].includes(status);
}

export async function POST(
  req: NextRequest
) {
  try {
    // ============================================================
    // 1. INITIALISATION
    // ============================================================

    const supabaseAdmin =
      getSupabaseAdmin();

    const rawBody =
      await req.text();

    if (!rawBody) {
      return NextResponse.json(
        {
          error:
            'Empty webhook payload.',
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 2. PARSER LE WEBHOOK
    // ============================================================

    let event: Record<
      string,
      unknown
    >;

    try {
      event =
        JSON.parse(rawBody) as Record<
          string,
          unknown
        >;
    } catch {
      return NextResponse.json(
        {
          error:
            'Invalid JSON payload.',
        },
        { status: 400 }
      );
    }

    const eventName =
      getEventName(event);

    console.log(
      '[JDV CRM] FedaPay webhook:',
      eventName
    );

    // ============================================================
    // 3. EXTRACTION DE LA TRANSACTION
    // ============================================================

    const entity =
      extractEntity(event);

    const customMetadata =
      extractCustomMetadata(
        entity
      );

    const transactionId =
      getTransactionId(entity);

    const merchantReference =
      getMerchantReference(
        entity
      );

    // ============================================================
    // 4. IGNORER LES ÉVÉNEMENTS SANS IDENTIFIANT
    // ============================================================

    if (
      !transactionId &&
      !merchantReference
    ) {
      console.warn(
        '[JDV CRM] Webhook sans transaction_id ni merchant_reference.'
      );

      /*
       * On retourne 200 pour éviter une boucle
       * de retry inutile sur un événement que nous
       * ne pouvons pas rattacher à un paiement.
       */

      return NextResponse.json(
        {
          received: true,
          ignored: true,
          reason:
            'MISSING_TRANSACTION_REFERENCE',
        },
        { status: 200 }
      );
    }

    // ============================================================
    // 5. RETROUVER LE PAIEMENT JDV CRM
    // ============================================================

    let paymentQuery =
      supabaseAdmin
        .from(
          'subscription_payments'
        )
        .select(
          `
            id,
            organization_id,
            subscription_id,
            amount,
            currency,
            provider,
            provider_reference,
            payment_method,
            status,
            paid_at,
            metadata
          `
        )
        .eq(
          'provider',
          'fedapay'
        );

    if (transactionId) {
      paymentQuery =
        paymentQuery.eq(
          'provider_reference',
          transactionId
        );
    } else if (
      merchantReference
    ) {
      paymentQuery =
        paymentQuery.contains(
          'metadata',
          {
            merchant_reference:
              merchantReference,
          }
        );
    }

    const {
      data: payment,
      error: paymentError,
    } =
      await paymentQuery
        .limit(1)
        .maybeSingle();

    if (paymentError) {
      console.error(
        '[JDV CRM] Payment lookup error:',
        paymentError
      );

      return NextResponse.json(
        {
          error:
            'Payment lookup failed.',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 6. SI LE PAIEMENT N'EST PAS ENCORE ENREGISTRÉ
    // ============================================================

    if (!payment) {
      console.warn(
        '[JDV CRM] Aucun subscription_payment trouvé.',
        {
          transactionId,
          merchantReference,
        }
      );

      /*
       * Très important :
       *
       * On NE crée PAS ici une subscription_payment
       * à partir des données envoyées par FedaPay.
       *
       * Le paiement doit avoir été créé par notre
       * endpoint checkout.
       */

      return NextResponse.json(
        {
          received: true,
          ignored: true,
          reason:
            'PAYMENT_NOT_FOUND',
        },
        { status: 200 }
      );
    }

    // ============================================================
    // 7. VÉRIFICATION SERVEUR FedaPay
    // ============================================================

    let verifiedTransaction:
      Record<string, unknown> =
      entity;

    if (transactionId) {
      try {
        const verification =
          await verifyFedaPayTransaction(
            transactionId
          );

        verifiedTransaction =
          extractVerifiedTransaction(
            verification
          );
      } catch (verificationError) {
        console.error(
          '[JDV CRM] FedaPay transaction verification error:',
          verificationError
        );

        return NextResponse.json(
          {
            error:
              'Unable to verify FedaPay transaction.',
          },
          { status: 502 }
        );
      }
    }

    const verifiedStatus =
      getFedaPayStatus(
        verifiedTransaction
      );

    console.log(
      '[JDV CRM] Verified FedaPay status:',
      verifiedStatus
    );

    // ============================================================
    // 8. RÉCUPÉRER L'ORGANISATION
    // ============================================================

    const organizationId =
      payment.organization_id;

    if (!organizationId) {
      console.error(
        '[JDV CRM] Payment without organization_id:',
        payment.id
      );

      return NextResponse.json(
        {
          error:
            'Payment has no organization.',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 9. RÉCUPÉRER L'ABONNEMENT
    // ============================================================

    const {
      data: subscription,
      error:
        subscriptionError,
    } =
      await supabaseAdmin
        .from(
          'organization_subscriptions'
        )
        .select(
          `
            id,
            organization_id,
            plan_id,
            status,
            started_at,
            expires_at,
            auto_renew,
            external_reference
          `
        )
        .eq(
          'id',
          payment.subscription_id
        )
        .eq(
          'organization_id',
          organizationId
        )
        .single();

    if (
      subscriptionError ||
      !subscription
    ) {
      console.error(
        '[JDV CRM] Subscription lookup error:',
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            'Subscription not found.',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 10. RÉCUPÉRER LE PLAN
    // ============================================================

    const {
      data: plan,
      error: planError,
    } =
      await supabaseAdmin
        .from(
          'subscription_plans'
        )
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
        .eq(
          'id',
          subscription.plan_id
        )
        .single();

    if (
      planError ||
      !plan
    ) {
      console.error(
        '[JDV CRM] Subscription plan lookup error:',
        planError
      );

      return NextResponse.json(
        {
          error:
            'Subscription plan not found.',
        },
        { status: 500 }
      );
    }

    const planCode =
      normalizePlanCode(
        plan.code
      );

    if (!planCode) {
      console.error(
        '[JDV CRM] Invalid subscription plan:',
        plan.code
      );

      return NextResponse.json(
        {
          error:
            'Invalid subscription plan.',
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 11. PROTECTION CONTRE LES MAUVAIS PLANS
    // ============================================================

    const metadataPlan =
      normalizePlanCode(
        customMetadata.plan_code ||
          customMetadata.plan
      );

    if (
      metadataPlan &&
      metadataPlan !== planCode
    ) {
      console.error(
        '[JDV CRM] Plan mismatch.',
        {
          databasePlan:
            planCode,
          metadataPlan,
          paymentId:
            payment.id,
        }
      );

      return NextResponse.json(
        {
          error:
            'Payment plan mismatch.',
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 12. TRANSACTION APPROUVÉE
    // ============================================================

    if (
      eventName ===
        'transaction.approved' ||
      isApprovedStatus(
        verifiedStatus
      )
    ) {
      /*
       * IDPOTENCE :
       *
       * Si le webhook est reçu plusieurs fois,
       * on ne recrée pas la période d'abonnement.
       */

      const alreadySuccessful =
        payment.status ===
          'successful' &&
        subscription.status ===
          'active';

      if (
        alreadySuccessful
      ) {
        console.log(
          '[JDV CRM] Payment already processed:',
          payment.id
        );

        return NextResponse.json(
          {
            received: true,
            alreadyProcessed:
              true,
          },
          { status: 200 }
        );
      }

      const now =
        new Date();

      /*
       * Si un abonnement actif existe encore,
       * on prolonge à partir de sa date d'expiration.
       *
       * Sinon on démarre maintenant.
       */

      const currentExpiration =
        subscription.expires_at
          ? new Date(
              subscription.expires_at
            )
          : null;

      const baseDate =
        currentExpiration &&
        currentExpiration > now
          ? currentExpiration
          : now;

      const expiresAt =
        new Date(baseDate);

      expiresAt.setDate(
        expiresAt.getDate() +
          Number(
            plan.duration_days
          )
      );

      // ==========================================================
      // 12A. MARQUER LE PAIEMENT RÉUSSI
      // ==========================================================

      const {
        error:
          paymentUpdateError,
      } =
        await supabaseAdmin
          .from(
            'subscription_payments'
          )
          .update({
            status:
              'successful',
            paid_at:
              now.toISOString(),
            provider_reference:
              transactionId ||
              payment.provider_reference,
            metadata: {
              ...(payment.metadata &&
              typeof payment.metadata ===
                'object'
                ? payment.metadata
                : {}),
              fedapay_event:
                eventName,
              fedapay_status:
                verifiedStatus,
              fedapay_transaction_id:
                transactionId,
              merchant_reference:
                merchantReference,
              processed_at:
                now.toISOString(),
            },
          })
          .eq(
            'id',
            payment.id
          );

      if (
        paymentUpdateError
      ) {
        console.error(
          '[JDV CRM] Payment activation error:',
          paymentUpdateError
        );

        return NextResponse.json(
          {
            error:
              'Failed to update payment.',
          },
          { status: 500 }
        );
      }

      // ==========================================================
      // 12B. ACTIVER L'ABONNEMENT
      // ==========================================================

      const {
        error:
          subscriptionUpdateError,
      } =
        await supabaseAdmin
          .from(
            'organization_subscriptions'
          )
          .update({
            status:
              'active',
            started_at:
              subscription.started_at ||
              now.toISOString(),
            expires_at:
              expiresAt.toISOString(),
            auto_renew:
              subscription.auto_renew ??
              false,
            external_reference:
              transactionId ||
              merchantReference ||
              subscription.external_reference,
          })
          .eq(
            'id',
            subscription.id
          );

      if (
        subscriptionUpdateError
      ) {
        console.error(
          '[JDV CRM] Subscription activation error:',
          subscriptionUpdateError
        );

        return NextResponse.json(
          {
            error:
              'Payment succeeded but subscription activation failed.',
          },
          { status: 500 }
        );
      }

      // ==========================================================
      // 12C. ACTIVER L'ORGANISATION
      // ==========================================================

      const {
        error:
          organizationUpdateError,
      } =
        await supabaseAdmin
          .from(
            'organizations'
          )
          .update({
            status:
              'active',
            subscription_status:
              'active',
          })
          .eq(
            'id',
            organizationId
          );

      if (
        organizationUpdateError
      ) {
        console.error(
          '[JDV CRM] Organization activation error:',
          organizationUpdateError
        );

        return NextResponse.json(
          {
            error:
              'Subscription activated but organization status update failed.',
          },
          { status: 500 }
        );
      }

      console.log(
        '[JDV CRM] Subscription activated successfully.',
        {
          organizationId,
          subscriptionId:
            subscription.id,
          paymentId:
            payment.id,
          plan:
            planCode,
          expiresAt:
            expiresAt.toISOString(),
        }
      );

      return NextResponse.json(
        {
          received: true,
          processed: true,
          status:
            'successful',
          organizationId,
          subscriptionId:
            subscription.id,
          paymentId:
            payment.id,
          plan:
            planCode,
          expiresAt:
            expiresAt.toISOString(),
        },
        { status: 200 }
      );
    }

    // ============================================================
    // 13. TRANSACTION REFUSÉE / ANNULÉE
    // ============================================================

    if (
      eventName ===
        'transaction.declined' ||
      eventName ===
        'transaction.canceled' ||
      isFailedStatus(
        verifiedStatus
      )
    ) {
      /*
       * Une transaction échouée ne doit PAS automatiquement
       * suspendre l'organisation si celle-ci possède encore
       * un abonnement actif ou une période d'essai valide.
       */

      if (
        payment.status ===
        'successful'
      ) {
        console.warn(
          '[JDV CRM] Failed webhook received for an already successful payment:',
          payment.id
        );

        return NextResponse.json(
          {
            received: true,
            ignored: true,
            reason:
              'PAYMENT_ALREADY_SUCCESSFUL',
          },
          { status: 200 }
        );
      }

      const {
        error:
          failedPaymentError,
      } =
        await supabaseAdmin
          .from(
            'subscription_payments'
          )
          .update({
            status:
              'failed',
            metadata: {
              ...(payment.metadata &&
              typeof payment.metadata ===
                'object'
                ? payment.metadata
                : {}),
              fedapay_event:
                eventName,
              fedapay_status:
                verifiedStatus,
              fedapay_transaction_id:
                transactionId,
              merchant_reference:
                merchantReference,
              processed_at:
                new Date().toISOString(),
            },
          })
          .eq(
            'id',
            payment.id
          );

      if (
        failedPaymentError
      ) {
        console.error(
          '[JDV CRM] Failed payment update error:',
          failedPaymentError
        );

        return NextResponse.json(
          {
            error:
              'Failed to update failed payment.',
          },
          { status: 500 }
        );
      }

      /*
       * On laisse l'organisation dans son état actuel.
       *
       * Le système d'accès doit déterminer séparément
       * si son abonnement/trial est encore valide.
       */

      console.log(
        '[JDV CRM] FedaPay payment failed:',
        {
          paymentId:
            payment.id,
          organizationId,
          eventName,
          verifiedStatus,
        }
      );

      return NextResponse.json(
        {
          received: true,
          processed: true,
          status:
            'failed',
          paymentId:
            payment.id,
        },
        { status: 200 }
      );
    }

    // ============================================================
    // 14. AUTRES ÉVÉNEMENTS
    // ============================================================

    console.log(
      '[JDV CRM] FedaPay event ignored:',
      eventName
    );

    return NextResponse.json(
      {
        received: true,
        ignored: true,
        event:
          eventName,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      '[JDV CRM] FedaPay webhook error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Internal server error.',
      },
      { status: 500 }
    );
  }
}