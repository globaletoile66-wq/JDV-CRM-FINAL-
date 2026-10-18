import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

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
      return NextResponse.json({ error: 'Empty webhook payload.' }, { status: 400 });
    }

    const webhookSecret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
    if (webhookSecret) {
      const signature = req.headers.get('x-fedapay-signature')?.trim();
      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody, 'utf8').digest('hex');
      const a = Buffer.from(expected); const b = Buffer.from(signature || '');
      if (!signature || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ error: 'Signature FedaPay invalide.' }, { status: 401 });
      }
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

      await supabaseAdmin
        .from('organization_subscriptions')
        .update({ status: 'cancelled', auto_renew: false })
        .eq('organization_id', organizationId)
        .eq('status', 'trial')
        .neq('id', subscription.id);

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

src/app/api/partner/fedapay/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { decryptSecret } from '@/lib/server/crypto';
const BASE=(env:string)=>env==='live'?'https://api.fedapay.com/v1':'https://sandbox-api.fedapay.com/v1';
type Body={organizationId?:string;saleId?:string;amount?:number;customer?:{email?:string;firstname?:string;lastname?:string;phone?:string}};
export async function POST(req:NextRequest){const admin=getAdminClient();try{const b=await req.json() as Body;const organizationId=b.organizationId?.trim();const saleId=b.saleId?.trim();const amount=Math.round(Number(b.amount));if(!organizationId||!saleId||!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:'organizationId, saleId et montant sont obligatoires.'},{status:400});const {data:account}=await admin.from('payment_provider_accounts').select('environment,secret_key_encrypted,status').eq('organization_id',organizationId).eq('provider','fedapay').maybeSingle();if(!account||account.status!=='active'||!account.secret_key_encrypted)return NextResponse.json({error:'FedaPay du partenaire n’est pas configuré.'},{status:503});const secret=decryptSecret(account.secret_key_encrypted);if(!secret)return NextResponse.json({error:'Configuration FedaPay invalide.'},{status:503});const {data:sale}=await admin.from('sales').select('id,sale_number,organization_id,client_id,amount_remaining,client_phone').eq('id',saleId).eq('organization_id',organizationId).maybeSingle();if(!sale)return NextResponse.json({error:'Vente introuvable.'},{status:404});if(Number(sale.amount_remaining||0)<=0)return NextResponse.json({error:'Cette vente est déjà soldée.'},{status:409});if(amount>Number(sale.amount_remaining))return NextResponse.json({error:'Le montant dépasse le solde restant.'},{status:422});const reference=`JDVCRM-CUST-${sale.id.slice(0,8)}-${Date.now()}`;const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin).replace(/\/$/,'');const callback=`${siteUrl}/paiement-retour?organization_id=${encodeURIComponent(organizationId)}&sale_id=${encodeURIComponent(saleId)}`;const {data:payment,error:pe}=await admin.from('payments').insert({organization_id:organizationId,sale_id:saleId,client_id:sale.client_id,amount,currency:'XOF',payment_method:'fedapay',status:'pending',provider:'fedapay',merchant_reference:reference,metadata:{customer:b.customer||null,environment:account.environment}}).select('id').single();if(pe||!payment)throw new Error(pe?.message||'Impossible d’enregistrer le paiement.');const r=await fetch(`${BASE(account.environment)}/transactions`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({description:`Paiement ${sale.sale_number}`,amount,currency:{iso:'XOF'},callback_url:callback,merchant_reference:reference,custom_metadata:{organization_id:organizationId,sale_id:saleId,payment_id:payment.id},customer:{email:b.customer?.email,firstname:b.customer?.firstname,lastname:b.customer?.lastname,phone_number:b.customer?.phone||sale.client_phone}})});const txPayload=await r.json().catch(()=>null);if(!r.ok){await admin.from('payments').update({status:'failed',metadata:{error:txPayload}}).eq('id',payment.id);return NextResponse.json({error:'FedaPay n’a pas pu créer la transaction.'},{status:502});}const tx=(txPayload?.v1||txPayload?.transaction||txPayload?.entity||txPayload) as Record<string,unknown>;const transactionId=String(tx?.id||tx?.transaction_id||'');await admin.from('payments').update({provider_transaction_id:transactionId,metadata:{transaction:tx,environment:account.environment}}).eq('id',payment.id);const tokenR=await fetch(`${BASE(account.environment)}/transactions/${encodeURIComponent(transactionId)}/token`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'}});const token=await tokenR.json().catch(()=>null);if(!tokenR.ok)return NextResponse.json({error:'Transaction créée mais lien FedaPay indisponible.'},{status:502});return NextResponse.json({checkoutUrl:token?.url||token?.token?.url,paymentId:payment.id,transactionId,reference});}catch(e){console.error('[JDV CRM] partner checkout',e);return NextResponse.json({error:e instanceof Error?e.message:'Erreur interne.'},{status:500});}}


src/app/api/partner/fedapay/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptSecret } from '@/lib/server/crypto';

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, organizationId: null };
  const { data: membership } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).eq('role', 'business_admin').eq('status', 'active').limit(1).maybeSingle();
  return { supabase, user, organizationId: membership?.organization_id ?? null };
}

export async function GET() {
  const { supabase, user, organizationId } = await context();
  if (!user) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (!organizationId) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });
  const { data, error } = await supabase.from('payment_provider_accounts').select('id,provider,environment,public_key,status,last_verified_at,created_at,updated_at').eq('organization_id', organizationId).eq('provider', 'fedapay').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ account: data ?? null });
}

export async function PUT(req: NextRequest) {
  const { supabase, user, organizationId } = await context();
  if (!user) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  if (!organizationId) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const publicKey = String(body.publicKey || '').trim();
  const secretKey = String(body.secretKey || '').trim();
  const webhookSecret = String(body.webhookSecret || '').trim();
  const environment = body.environment === 'live' ? 'live' : 'sandbox';
  if (!publicKey || !secretKey) return NextResponse.json({ error: 'La clé publique et la clé secrète FedaPay sont obligatoires.' }, { status: 400 });

  const { data, error } = await supabase.from('payment_provider_accounts').upsert({
    organization_id: organizationId, provider: 'fedapay', environment, public_key: publicKey,
    secret_key_encrypted: encryptSecret(secretKey), webhook_secret_encrypted: encryptSecret(webhookSecret),
    status: 'active', updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,provider' }).select('id,provider,environment,public_key,status,last_verified_at,created_at,updated_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, account: data });
}
src/app/api/partner/fedapay/webhook/[organizationId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getAdminClient } from '@/lib/supabase/server';
import { decryptSecret } from '@/lib/server/crypto';
const BASE=(env:string)=>env==='live'?'https://api.fedapay.com/v1':'https://sandbox-api.fedapay.com/v1';
function validSignature(raw:string,signature:string|null,secret:string){if(!signature)return false;const expected=crypto.createHmac('sha256',secret).update(raw,'utf8').digest('hex');const a=Buffer.from(expected),b=Buffer.from(signature.trim());return a.length===b.length&&crypto.timingSafeEqual(a,b);}
export async function POST(req:NextRequest,{params}:{params:Promise<{organizationId:string}>}){const admin=getAdminClient();const raw=await req.text();const {organizationId}=await params;try{const {data:account}=await admin.from('payment_provider_accounts').select('environment,secret_key_encrypted,webhook_secret_encrypted,status').eq('organization_id',organizationId).eq('provider','fedapay').maybeSingle();if(!account||account.status!=='active')return NextResponse.json({error:'FedaPay partenaire non configuré.'},{status:404});const webhookSecret=decryptSecret(account.webhook_secret_encrypted)||decryptSecret(account.secret_key_encrypted);const secret=decryptSecret(account.secret_key_encrypted);if(!webhookSecret||!secret)return NextResponse.json({error:'Secret FedaPay manquant.'},{status:503});if(!validSignature(raw,req.headers.get('x-fedapay-signature'),webhookSecret))return NextResponse.json({error:'Signature webhook invalide.'},{status:401});const event=JSON.parse(raw) as Record<string,unknown>;const entity=(event.entity||event.data||event) as Record<string,unknown>;const metadata=(entity.custom_metadata||{}) as Record<string,unknown>;const txId=String(entity.id||entity.transaction_id||'');const eventId=String(event.id||entity.event_id||txId||crypto.randomUUID());const {data:existing}=await admin.from('payment_webhook_events').select('id,processed').eq('provider','fedapay').eq('external_event_id',eventId).maybeSingle();if(existing?.processed)return NextResponse.json({received:true,duplicate:true});await admin.from('payment_webhook_events').upsert({provider:'fedapay',organization_id:organizationId,external_event_id:eventId,transaction_id:txId,event_name:String(event.name||event.type||''),payload:event,signature_valid:true,processed:false},{onConflict:'provider,external_event_id'});const vr=await fetch(`${BASE(account.environment)}/transactions/${encodeURIComponent(txId)}`,{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'});const vp=await vr.json().catch(()=>null);const tx=(vp?.v1||vp?.transaction||vp?.entity||vp) as Record<string,unknown>;const status=String(tx?.status||tx?.state||'').toLowerCase();const paymentId=String(metadata.payment_id||'');const saleId=String(metadata.sale_id||'');if(['approved','successful','success','completed','paid'].includes(status)&&paymentId){const {data:p}=await admin.from('payments').select('id,sale_id,amount,status').eq('id',paymentId).eq('organization_id',organizationId).maybeSingle();if(p&&p.status!=='successful'){await admin.from('payments').update({status:'successful',payment_date:new Date().toISOString(),provider_transaction_id:txId}).eq('id',p.id);if(saleId){const {data:s}=await admin.from('sales').select('amount_paid,amount_remaining').eq('id',saleId).eq('organization_id',organizationId).maybeSingle();if(s){const paid=Number(s.amount_paid||0)+Number(p.amount||0);const remaining=Math.max(0,Number(s.amount_remaining||0)-Number(p.amount||0));await admin.from('sales').update({amount_paid:paid,amount_remaining:remaining,status:remaining===0?'paid':'partial'}).eq('id',saleId);}}}}else if(['declined','canceled','cancelled','failed','failure'].includes(status)&&paymentId){await admin.from('payments').update({status:'failed'}).eq('id',paymentId).eq('organization_id',organizationId);}await admin.from('payment_webhook_events').update({processed:true,processed_at:new Date().toISOString()}).eq('provider','fedapay').eq('external_event_id',eventId);return NextResponse.json({received:true});}catch(e){console.error('[JDV CRM] partner webhook',e);return NextResponse.json({error:'Webhook processing failed.'},{status:500});}}
