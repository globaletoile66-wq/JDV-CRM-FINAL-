import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

const PLANS = new Set(['MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL']);
const LEGACY_PLAN_MAP: Record<string, string> = { STARTER: 'MONTHLY', ENTERPRISE: 'QUARTERLY' };

type Body = {
  companyName?: string; industry?: string; teamSize?: string | number;
  country?: string; city?: string; address?: string; website?: string;
  adminFirstName?: string; adminLastName?: string; adminEmail?: string;
  adminPhone?: string; adminPassword?: string; subscriptionTier?: string;
};
const clean = (v: unknown) => v == null ? null : String(v).trim() || null;

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null;
  const admin = getAdminClient();
  try {
    const body = await req.json() as Body;
    const companyName = clean(body.companyName);
    const country = clean(body.country) || 'Bénin';
    const city = clean(body.city);
    const address = clean(body.address);
    const website = clean(body.website);
    const industry = clean(body.industry);
    const teamSize = clean(body.teamSize);
    const firstName = clean(body.adminFirstName);
    const lastName = clean(body.adminLastName);
    const email = clean(body.adminEmail)?.toLowerCase() || null;
    const phone = clean(body.adminPhone);
    const password = body.adminPassword || '';
    const planCode = LEGACY_PLAN_MAP[String(body.subscriptionTier || '').trim().toUpperCase()] || String(body.subscriptionTier || '').trim().toUpperCase();

    if (!companyName || !email || !firstName || !lastName || !phone) return NextResponse.json({ error: 'Les informations obligatoires de l’entreprise et de l’administrateur sont requises.' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 });
    if (!PLANS.has(planCode)) return NextResponse.json({ error: 'Plan d’abonnement invalide.' }, { status: 400 });

    const { data: existing } = await admin.auth.admin.getUserByEmail(email);
    if (existing?.user) return NextResponse.json({ error: 'Cette adresse email possède déjà un compte JDV CRM.' }, { status: 409 });

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, display_name: `${firstName} ${lastName}`.trim(), phone, country },
    });
    if (authError || !authData.user) return NextResponse.json({ error: authError?.message || 'Impossible de créer le compte administrateur.' }, { status: 400 });
    createdUserId = authData.user.id;

    const { data: organizationId, error: rpcError } = await admin.rpc('create_company_onboarding', {
      p_user_id: createdUserId, p_company_name: companyName, p_legal_name: companyName,
      p_email: email, p_phone: phone, p_country: country, p_city: city, p_address: address,
      p_website: website, p_industry: industry, p_team_size: teamSize, p_plan_code: planCode,
      p_first_name: firstName, p_last_name: lastName,
    });
    if (rpcError || !organizationId) throw new Error(rpcError?.message || 'Création de l’organisation impossible.');

    return NextResponse.json({ success: true, organizationId, accountCreated: true });
  } catch (error) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    console.error('[JDV CRM] enterprise registration:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur interne lors de l’inscription.' }, { status: 500 });
  }
}