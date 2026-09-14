import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

const VALID_PLAN_CODES = [
  'MONTHLY',
  'QUARTERLY',
  'SEMESTER',
  'ANNUAL',
] as const;

const LEGACY_PLAN_MAP: Record<string, string> = {
  STARTER: 'MONTHLY',
  ENTERPRISE: 'QUARTERLY',
};

type PlanCode = (typeof VALID_PLAN_CODES)[number];

interface RegistrationBody {
  companyName?: string;
  industry?: string;
  teamSize?: string | number;
  country?: string;
  website?: string;
  adminFirstName?: string;
  adminLastName?: string;
  adminEmail?: string;
  adminPhone?: string;
  subscriptionTier?: string;
}

function normalizePlanCode(value: unknown): PlanCode | null {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();

  const mapped =
    LEGACY_PLAN_MAP[normalized] ??
    normalized;

  if (
    VALID_PLAN_CODES.includes(
      mapped as PlanCode
    )
  ) {
    return mapped as PlanCode;
  }

  return null;
}

function cleanString(
  value: unknown
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const valueAsString = String(value).trim();

  return valueAsString || null;
}

export async function POST(
  req: NextRequest
) {
  try {
    const supabase = await createClient() as any;

    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable', code: 'SUPABASE_UNAVAILABLE' },
        { status: 503 }
      );
    }

    let body: RegistrationBody;

    try {
      body = (await req.json()) as RegistrationBody;
    } catch {
      return NextResponse.json(
        {
          error: 'Les données envoyées sont invalides.',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const companyName = cleanString(body.companyName);
    const industry = cleanString(body.industry);
    const teamSize = cleanString(body.teamSize);
    const country = cleanString(body.country) ?? 'Bénin';
    const website = cleanString(body.website);
    const adminFirstName = cleanString(body.adminFirstName);
    const adminLastName = cleanString(body.adminLastName);
    const adminEmail = cleanString(body.adminEmail);
    const adminPhone = cleanString(body.adminPhone);

    if (!companyName) {
      return NextResponse.json(
        {
          error: "Le nom de l'entreprise est obligatoire.",
          code: 'COMPANY_NAME_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (!body.subscriptionTier) {
      return NextResponse.json(
        {
          error: "Le plan d'abonnement est obligatoire.",
          code: 'PLAN_REQUIRED',
        },
        { status: 400 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[JDV CRM] Authentication error:', authError);

      return NextResponse.json(
        {
          error: 'Vous devez être connecté pour créer votre compte entreprise.',
          code: 'AUTHENTICATION_REQUIRED',
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    const planCode = normalizePlanCode(body.subscriptionTier);

    if (!planCode) {
      return NextResponse.json(
        {
          error: 'Plan invalide. Les plans disponibles sont : MONTHLY, QUARTERLY, SEMESTER et ANNUAL.',
          code: 'INVALID_PLAN',
        },
        { status: 400 }
      );
    }

    const {
      data: existingMembership,
      error: membershipError,
    } = await supabase
      .from('organization_members')
      .select('id, organization_id, role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error('[JDV CRM] Membership lookup error:', membershipError);

      return NextResponse.json(
        {
          error: 'Impossible de vérifier votre compte entreprise.',
          code: 'MEMBERSHIP_CHECK_FAILED',
        },
        { status: 500 }
      );
    }

    if (existingMembership) {
      return NextResponse.json(
        {
          error: 'Ce compte possède déjà une entreprise JDV CRM.',
          code: 'ORGANIZATION_ALREADY_EXISTS',
          organizationId: existingMembership.organization_id,
        },
        { status: 409 }
      );
    }

    const {
      data: plan,
      error: planError,
    } = await supabase
      .from('subscription_plans')
      .select(`id, code, name, description, price, currency, duration_days, max_admins, max_prospecteurs, max_clients, features, active`)
      .eq('code', planCode)
      .eq('active', true)
      .maybeSingle();

    if (planError) {
      console.error('[JDV CRM] Plan query error:', planError);

      return NextResponse.json(
        {
          error: 'Impossible de récupérer le plan sélectionné.',
          code: 'PLAN_QUERY_FAILED',
        },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        {
          error: 'Le plan sélectionné est introuvable ou désactivé.',
          code: 'PLAN_NOT_FOUND',
        },
        { status: 400 }
      );
    }

    const {
      data: organizationId,
      error: companyError,
    } = await supabase.rpc('register_company', {
      p_name: companyName,
      p_phone: adminPhone,
      p_email: adminEmail ?? user.email ?? null,
      p_country: country,
      p_city: null,
    });

    if (companyError || !organizationId) {
      console.error('[JDV CRM] register_company error:', companyError);

      return NextResponse.json(
        {
          error: 'Erreur lors de la création du compte entreprise.',
          code: 'ORGANIZATION_CREATION_FAILED',
        },
        { status: 500 }
      );
    }

    const fullName =
      [adminFirstName, adminLastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      user.email?.split('@')[0] ||
      'Administrateur';

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          first_name: adminFirstName,
          last_name: adminLastName,
          display_name: fullName,
          phone: adminPhone,
          country: country,
          preferred_language: 'fr',
          status: 'active',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('[JDV CRM] Profile update error:', profileError);

      return NextResponse.json(
        {
          error: "Votre entreprise a été créée, mais le profil administrateur n'a pas pu être finalisé.",
          code: 'PROFILE_UPDATE_FAILED',
          organizationId,
        },
        { status: 500 }
      );
    }

    const {
      data: currentSettings,
      error: settingsReadError,
    } = await supabase
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (settingsReadError) {
      console.error('[JDV CRM] Settings read error:', settingsReadError);

      return NextResponse.json(
        {
          error: "L'entreprise a été créée, mais ses paramètres n'ont pas pu être vérifiés.",
          code: 'SETTINGS_READ_FAILED',
          organizationId,
        },
        { status: 500 }
      );
    }

    const existingSettings =
      currentSettings?.settings && typeof currentSettings.settings === 'object'
        ? currentSettings.settings
        : {};

    const updatedSettings = {
      ...existingSettings,
      industry: industry ?? '',
      team_size: teamSize ?? '',
      website: website ?? '',
      registration_source: 'public_business_registration',
      registration_date: new Date().toISOString(),
    };

    const { error: settingsError } = await supabase
      .from('organization_settings')
      .upsert(
        {
          organization_id: organizationId,
          settings: updatedSettings,
        },
        { onConflict: 'organization_id' }
      );

    if (settingsError) {
      console.error('[JDV CRM] Settings update error:', settingsError);

      return NextResponse.json(
        {
          error: "L'entreprise a été créée, mais ses informations complémentaires n'ont pas pu être enregistrées.",
          code: 'SETTINGS_UPDATE_FAILED',
          organizationId,
        },
        { status: 500 }
      );
    }

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: organizationId,
        plan_id: plan.id,
        status: 'pending',
        started_at: null,
        expires_at: null,
        auto_renew: false,
      })
      .select('id, organization_id, plan_id, status, started_at, expires_at')
      .single();

    if (subscriptionError || !subscription) {
      console.error('[JDV CRM] Subscription creation error:', subscriptionError);

      return NextResponse.json(
        {
          error: "L'entreprise a été créée, mais l'abonnement n'a pas pu être initialisé.",
          code: 'SUBSCRIPTION_CREATION_FAILED',
          organizationId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        organizationId,
        userId,
        subscriptionId: subscription.id,
        plan: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          durationDays: plan.duration_days,
          maxAdmins: plan.max_admins,
          maxProspecteurs: plan.max_prospecteurs,
          maxClients: plan.max_clients,
          features: plan.features,
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          startedAt: subscription.started_at,
          expiresAt: subscription.expires_at,
        },
        message: 'Votre compte entreprise JDV CRM a été créé avec succès. Votre abonnement est en attente de validation.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[JDV CRM] Business registration unexpected error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erreur interne du serveur.',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}