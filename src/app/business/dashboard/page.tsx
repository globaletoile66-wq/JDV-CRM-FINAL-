'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ProspectTab = 'hot' | 'warm' | 'cold';

type ProspectTemperature = 'hot' | 'warm' | 'cold';

interface OrganizationContext {
  id: string;
  name: string;
  currency: string;
  city: string | null;
}

interface Article {
  id: string;
  code: string;
  name: string;
  fixed_price: number;
  cash_price: number;
  credit_price: number;
  active: boolean;
}

interface Prospecteur {
  id: string;
  code: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'blocked';
  commission_rate: number;
}

interface Prospect {
  id: string;
  organization_id: string;
  prospecteur_id: string | null;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  desired_article: string | null;
  desired_article_id: string | null;
  temperature: ProspectTemperature | null;
  visit_count: number;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  article_name?: string | null;
  prospecteur?: Prospecteur | null;
}

interface NewLeadForm {
  first_name: string;
  last_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  temperature: ProspectTemperature;
  desired_article_id: string;
  estimated_amount: string;
  next_follow_up_at: string;
  notes: string;
}

interface AntiTheftOwner {
  full_name: string | null;
  code: string | null;
  phone: string | null;
  created_at: string | null;
}

interface DashboardAgent {
  id: string;
  name: string;
  code: string;
  city: string;
  visits: number;
  cash: number;
  tokens: number;
  commission: number;
  status: 'active' | 'inactive' | 'suspended' | 'blocked';
}

interface RevenuePoint {
  day: string;
  revenue: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = 'XOF') {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} ${currency}`;
}

function getTemperatureLabel(value: ProspectTemperature) {
  if (value === 'hot') return '🔥 HOT';
  if (value === 'warm') return '⚡ WARM';
  return '❄️ COLD';
}

function getTemperatureColor(value: ProspectTemperature) {
  if (value === 'hot') return '#FC8181';
  if (value === 'warm') return '#F6E05E';
  return '#63B3ED';
}

function getTemperatureBackground(value: ProspectTemperature) {
  if (value === 'hot') return 'rgba(252,129,129,0.12)';
  if (value === 'warm') return 'rgba(246,224,94,0.10)';
  return 'rgba(99,179,237,0.10)';
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return 999;
  }

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function startOfDaysAgo(days: number) {
  const date = new Date();

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);

  return date.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// ANTI-THEFT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function AntiTheftModal({
  owner,
  phone,
  onClose,
}: {
  owner: AntiTheftOwner;
  phone: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6"
        style={{
          background: '#0A1628',
          border: '2px solid #D4AF37',
          boxShadow:
            '0 0 40px rgba(212,175,55,0.3), 0 0 80px rgba(212,175,55,0.1)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{
              background: 'rgba(212,175,55,0.15)',
              border: '1px solid rgba(212,175,55,0.4)',
            }}
          >
            🚫
          </div>

          <div>
            <p
              className="font-extrabold text-sm uppercase tracking-widest"
              style={{ color: '#D4AF37' }}
            >
              PROTECTION ANTI-VOL
            </p>

            <p className="text-white font-bold text-base">
              Lead déjà enregistré
            </p>
          </div>
        </div>

        <div
          className="h-px mb-4"
          style={{
            background:
              'linear-gradient(90deg, transparent, #D4AF37, transparent)',
          }}
        />

        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: 'rgba(212,175,55,0.08)',
            border: '1px solid rgba(212,175,55,0.25)',
          }}
        >
          <p
            className="text-sm font-bold mb-1"
            style={{ color: '#F5E17A' }}
          >
            ⚠️ Ce prospect appartient déjà à un autre prospecteur.
          </p>

          <p className="text-xs" style={{ color: '#A0AEC0' }}>
            JDV CRM bloque automatiquement la duplication d&apos;un lead déjà
            enregistré dans votre organisation.
          </p>
        </div>

        <div
          className="rounded-2xl p-4 mb-5 space-y-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="text-xs uppercase tracking-wider font-semibold"
            style={{ color: '#4A5568' }}
          >
            Propriétaire du lead
          </p>

          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-white text-sm font-semibold">
              {owner.full_name || 'Prospecteur inconnu'}
            </span>
          </div>

          {owner.code && (
            <div className="flex items-center gap-2">
              <span>🪪</span>
              <span
                className="text-xs font-mono"
                style={{ color: '#D4AF37' }}
              >
                ID : {owner.code}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span>📞</span>
            <span className="text-xs" style={{ color: '#A0AEC0' }}>
              {owner.phone || phone}
            </span>
          </div>

          {owner.created_at && (
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span className="text-xs" style={{ color: '#A0AEC0' }}>
                Enregistré le {formatDate(owner.created_at)}
              </span>
            </div>
          )}
        </div>

        <p
          className="text-xs text-center mb-4"
          style={{ color: '#718096' }}
        >
          Toute tentative de duplication est bloquée par le système.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-sm tracking-wider uppercase"
          style={{
            background:
              'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
            color: '#0B1B3D',
          }}
        >
          Compris — Fermer
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW LEAD MODAL
// ─────────────────────────────────────────────────────────────────────────────

function NewLeadModal({
  open,
  onClose,
  onSuccess,
  organizationId,
  articles,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  articles: Article[];
}) {
  const initialForm: NewLeadForm = {
    first_name: '',
    last_name: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    temperature: 'warm',
    desired_article_id: '',
    estimated_amount: '',
    next_follow_up_at: '',
    notes: '',
  };

  const [form, setForm] = useState<NewLeadForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [antiTheftOwner, setAntiTheftOwner] =
    useState<AntiTheftOwner | null>(null);

  const [antiTheftPhone, setAntiTheftPhone] = useState('');

  const normalizePhone = (phone: string) =>
    phone.replace(/[^\d+]/g, '').trim();

  const checkExistingLead = async (phone: string) => {
    const normalizedPhone = normalizePhone(phone);

    if (!organizationId || normalizedPhone.length < 8) {
      return false;
    }

    const supabase = createClient();

    const { data: existing, error: lookupError } = await supabase
      .from('prospects')
      .select(
        `
          id,
          created_at,
          prospecteur_id,
          phone
        `,
      )
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (lookupError) {
      console.error('Anti-theft lookup error:', lookupError);
      return false;
    }

    if (!existing) {
      return false;
    }

    let owner: AntiTheftOwner = {
      full_name: null,
      code: null,
      phone: existing.phone,
      created_at: existing.created_at,
    };

    if (existing.prospecteur_id) {
      const { data: prospecteur } = await supabase
        .from('prospecteurs')
        .select(
          `
            id,
            code,
            first_name,
            last_name,
            phone
          `,
        )
        .eq('id', existing.prospecteur_id)
        .maybeSingle();

      if (prospecteur) {
        owner = {
          full_name: [prospecteur.first_name, prospecteur.last_name]
            .filter(Boolean)
            .join(' '),
          code: prospecteur.code,
          phone: prospecteur.phone,
          created_at: existing.created_at,
        };
      }
    }

    setAntiTheftOwner(owner);
    setAntiTheftPhone(normalizedPhone);

    return true;
  };

  const handlePhoneBlur = async () => {
    if (!form.phone || form.phone.length < 8) {
      return;
    }

    setCheckingPhone(true);

    try {
      await checkExistingLead(form.phone);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');

    const firstName = form.first_name.trim();

    if (!firstName) {
      setError('Le prénom ou nom du prospect est obligatoire.');
      return;
    }

    if (!organizationId) {
      setError('Organisation introuvable. Veuillez vous reconnecter.');
      return;
    }

    if (form.phone && form.phone.length >= 8) {
      const alreadyExists = await checkExistingLead(form.phone);

      if (alreadyExists) {
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('id, role, status')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (membershipError) {
        throw new Error(membershipError.message);
      }

      if (!membership || membership.role !== 'business_admin') {
        throw new Error(
          'Vous n’avez pas les droits nécessaires pour créer un prospect.',
        );
      }

      const selectedArticle = articles.find(
        (article) => article.id === form.desired_article_id,
      );

      const insertData = {
        organization_id: organizationId,
        first_name: firstName,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        desired_article:
          selectedArticle?.name || null,
        desired_article_id: form.desired_article_id || null,
        temperature: form.temperature,
        visit_count: 0,
        last_contact_at: new Date().toISOString(),
        next_follow_up_at: form.next_follow_up_at
          ? new Date(`${form.next_follow_up_at}T09:00:00`).toISOString()
          : null,
        status: 'new',
        notes: form.notes.trim() || null,
      };

      const { error: insertError } = await supabase
        .from('prospects')
        .insert(insertData);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setSuccess(true);

      window.setTimeout(() => {
        setSuccess(false);
        setForm(initialForm);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erreur lors de l’enregistrement du prospect.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <>
      {antiTheftOwner && (
        <AntiTheftModal
          owner={antiTheftOwner}
          phone={antiTheftPhone}
          onClose={() => setAntiTheftOwner(null)}
        />
      )}

      <div
        className="fixed inset-0 z-40 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-3xl p-6 overflow-y-auto"
          style={{
            background: '#0F2347',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 8px 40px rgba(212,175,55,0.1)',
            maxHeight: '90vh',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">➕</span>

            <div>
              <h3 className="text-white font-bold text-lg">
                Nouveau Lead
              </h3>

              <p className="text-xs" style={{ color: '#A0AEC0' }}>
                Enregistrer un nouveau prospect dans JDV CRM
              </p>
            </div>
          </div>

          {success ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(72,187,120,0.1)',
                border: '1px solid rgba(72,187,120,0.3)',
              }}
            >
              <div className="text-4xl mb-2">✅</div>

              <p className="text-white font-bold">
                Prospect enregistré !
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Prénom / Nom *
                </label>

                <input
                  type="text"
                  value={form.first_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      first_name: event.target.value,
                    }))
                  }
                  placeholder="Ex. Jean"
                  required
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Nom de famille
                </label>

                <input
                  type="text"
                  value={form.last_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      last_name: event.target.value,
                    }))
                  }
                  placeholder="Nom"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Téléphone{' '}
                  {checkingPhone && (
                    <span style={{ color: '#D4AF37' }}>
                      — vérification...
                    </span>
                  )}
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  onBlur={handlePhoneBlur}
                  placeholder="+229 XX XX XX XX"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.25)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  WhatsApp
                </label>

                <input
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      whatsapp: event.target.value,
                    }))
                  }
                  placeholder="+229 XX XX XX XX"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#A0AEC0' }}
                  >
                    Ville
                  </label>

                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    placeholder="Cotonou"
                    className="w-full rounded-xl px-3 py-3 text-white text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(212,175,55,0.15)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#A0AEC0' }}
                  >
                    Adresse
                  </label>

                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Quartier / repère"
                    className="w-full rounded-xl px-3 py-3 text-white text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(212,175,55,0.15)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Température commerciale
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {(['hot', 'warm', 'cold'] as const).map((temperature) => {
                    const selected = form.temperature === temperature;
                    const color = getTemperatureColor(temperature);

                    return (
                      <button
                        key={temperature}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            temperature,
                          }))
                        }
                        className="py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: selected
                            ? getTemperatureBackground(temperature)
                            : 'rgba(255,255,255,0.03)',
                          border: selected
                            ? `1px solid ${color}`
                            : '1px solid rgba(255,255,255,0.08)',
                          color: selected ? color : '#718096',
                        }}
                      >
                        {getTemperatureLabel(temperature)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {articles.length > 0 && (
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: '#A0AEC0' }}
                  >
                    Article désiré
                  </label>

                  <select
                    value={form.desired_article_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        desired_article_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                    style={{
                      background: '#0B1B3D',
                      border: '1px solid rgba(212,175,55,0.25)',
                    }}
                  >
                    <option value="">
                      — Sélectionner un article —
                    </option>

                    {articles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.name} —{' '}
                        {formatCurrency(article.credit_price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Montant estimé
                </label>

                <input
                  type="number"
                  min="0"
                  value={form.estimated_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estimated_amount: event.target.value,
                    }))
                  }
                  placeholder="Ex. 250000"
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    caretColor: '#D4AF37',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Prochaine relance
                </label>

                <input
                  type="date"
                  value={form.next_follow_up_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      next_follow_up_at: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: '#A0AEC0' }}
                >
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Observations, remarques..."
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(212,175,55,0.15)',
                  }}
                />
              </div>

              {error && (
                <p
                  className="text-xs rounded-xl px-3 py-3 text-center"
                  style={{
                    color: '#FC8181',
                    background: 'rgba(252,129,129,0.1)',
                    border: '1px solid rgba(252,129,129,0.2)',
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all"
                style={{
                  background: loading
                    ? 'rgba(212,175,55,0.3)'
                    : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                  color: loading ? '#D4AF37' : '#0B1B3D',
                  boxShadow: loading
                    ? 'none' :'0 4px 20px rgba(212,175,55,0.3)',
                }}
              >
                {loading
                  ? 'Enregistrement...' :'➕ Enregistrer le Lead'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECT CARD
// ─────────────────────────────────────────────────────────────────────────────

function ProspectCard({
  prospect,
  currency,
}: {
  prospect: Prospect;
  currency: string;
}) {
  const rdvToday = isToday(prospect.next_follow_up_at);
  const stale = daysSince(prospect.last_contact_at) >= 14;

  const temperature = prospect.temperature || 'cold';

  const fullName = [prospect.first_name, prospect.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`rounded-2xl p-4 mb-3 relative ${
        rdvToday ? 'biz-rdv-pulse' : ''
      }`}
      style={{
        background: '#0A1628',
        border: rdvToday
          ? '2px solid #D4AF37'
          : stale
            ? '1px solid rgba(212,175,55,0.4)'
            : '1px solid rgba(212,175,55,0.12)',
      }}
    >
      {rdvToday && (
        <div
          className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-widest"
          style={{
            background:
              'linear-gradient(135deg, #D4AF37 0%, #F5E17A 50%, #A8860C 100%)',
            color: '#0B1B3D',
            boxShadow: '0 2px 10px rgba(212,175,55,0.5)',
          }}
        >
          🔔 RELANCE AUJOURD&apos;HUI
        </div>
      )}

      <div
        className="flex items-start justify-between mb-2"
        style={{ marginTop: rdvToday ? '8px' : '0' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">
            {fullName || 'Prospect sans nom'}
          </p>

          {prospect.phone && (
            <p
              className="text-xs mt-0.5 font-mono"
              style={{ color: '#63B3ED' }}
            >
              📞 {prospect.phone}
            </p>
          )}
        </div>

        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold ml-2 whitespace-nowrap"
          style={{
            background: getTemperatureBackground(temperature),
            color: getTemperatureColor(temperature),
            border: `1px solid ${getTemperatureColor(temperature)}55`,
          }}
        >
          {getTemperatureLabel(temperature)}
        </span>
      </div>

      {(prospect.address || prospect.city) && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs">📍</span>

          <span className="text-xs" style={{ color: '#A0AEC0' }}>
            {[prospect.address, prospect.city]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
      )}

      {(prospect.article_name || prospect.desired_article) && (
        <div
          className="rounded-xl px-3 py-2 mb-2"
          style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📦</span>

            <span
              className="text-xs font-semibold"
              style={{ color: '#D4AF37' }}
            >
              {prospect.article_name || prospect.desired_article}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-2 flex-wrap">
        {prospect.created_at && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{
              background: 'rgba(99,179,237,0.08)',
              border: '1px solid rgba(99,179,237,0.2)',
            }}
          >
            <span className="text-xs">📝</span>

            <span className="text-xs" style={{ color: '#63B3ED' }}>
              Créé {formatDate(prospect.created_at)}
            </span>
          </div>
        )}

        {prospect.next_follow_up_at && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{
              background: rdvToday
                ? 'rgba(212,175,55,0.15)'
                : 'rgba(212,175,55,0.06)',
              border: rdvToday
                ? '1px solid #D4AF37' :'1px solid rgba(212,175,55,0.2)',
            }}
          >
            <span className="text-xs">📅</span>

            <span
              className="text-xs font-semibold"
              style={{ color: '#D4AF37' }}
            >
              Relance : {formatDate(prospect.next_follow_up_at)}
            </span>
          </div>
        )}
      </div>

      {prospect.prospecteur && (
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span className="text-xs">🕵️</span>

          <div className="flex-1 min-w-0">
            <span
              className="text-xs font-semibold"
              style={{ color: '#A0AEC0' }}
            >
              {[
                prospect.prospecteur.first_name,
                prospect.prospecteur.last_name,
              ]
                .filter(Boolean)
                .join(' ') || 'Prospecteur'}
            </span>

            <span
              className="text-xs ml-1.5 font-mono"
              style={{ color: '#4A5568' }}
            >
              #{prospect.prospecteur.code}
            </span>
          </div>

          <span
            className="text-xs"
            style={{
              color:
                daysSince(prospect.last_contact_at) === 0
                  ? '#68D391'
                  : daysSince(prospect.last_contact_at) < 7
                    ? '#F6E05E' :'#FC8181',
            }}
          >
            {daysSince(prospect.last_contact_at) === 0
              ? 'Auj.'
              : `${daysSince(prospect.last_contact_at)}j`}
          </span>
        </div>
      )}

      {prospect.notes && (
        <p
          className="text-xs mt-2 italic"
          style={{ color: '#718096' }}
        >
          &ldquo;{prospect.notes}&rdquo;
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECTS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function ProspectsPanel({
  organizationId,
  currency,
}: {
  organizationId: string;
  currency: string;
}) {
  const [activeTab, setActiveTab] =
    useState<ProspectTab>('hot');

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProspects = useCallback(async () => {
    if (!organizationId) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const [articlesResult, prospectsResult] =
        await Promise.all([
          supabase
            .from('articles')
            .select(
              'id, code, name, fixed_price, cash_price, credit_price, active',
            )
            .eq('organization_id', organizationId)
            .eq('active', true)
            .order('name'),

          supabase
            .from('prospects')
            .select(
              `
                id,
                organization_id,
                prospecteur_id,
                first_name,
                last_name,
                phone,
                whatsapp,
                address,
                city,
                desired_article,
                desired_article_id,
                temperature,
                visit_count,
                last_contact_at,
                next_follow_up_at,
                status,
                notes,
                created_at
              `,
            )
            .eq('organization_id', organizationId)
            .neq('status', 'inactive')
            .order('next_follow_up_at', {
              ascending: true,
              nullsFirst: false,
            })
            .order('last_contact_at', {
              ascending: true,
              nullsFirst: true,
            }),
        ]);

      if (articlesResult.error) {
        console.error(
          'Articles error:',
          articlesResult.error.message,
        );
      }

      if (prospectsResult.error) {
        throw new Error(prospectsResult.error.message);
      }

      const articleData = (articlesResult.data || []) as Article[];

      setArticles(articleData);

      const rawProspects = prospectsResult.data || [];

      const prospecteurIds = Array.from(
        new Set(
          rawProspects
            .map((prospect: any) => prospect.prospecteur_id)
            .filter(Boolean),
        ),
      ) as string[];

      let prospecteurs: Prospecteur[] = [];

      if (prospecteurIds.length > 0) {
        const { data: prospecteurData } = await supabase
          .from('prospecteurs')
          .select(
            `
              id,
              code,
              first_name,
              last_name,
              phone,
              city,
              status,
              commission_rate
            `,
          )
          .in('id', prospecteurIds);

        prospecteurs = (prospecteurData || []) as Prospecteur[];
      }

      const articleMap = new Map(
        articleData.map((article) => [
          article.id,
          article.name,
        ]),
      );

      const prospecteurMap = new Map(
        prospecteurs.map((prospecteur) => [
          prospecteur.id,
          prospecteur,
        ]),
      );

      const mapped: Prospect[] = rawProspects.map((prospect: unknown) => ({
        ...(prospect as Prospect),
        article_name:
          (prospect as Prospect).desired_article_id
            ? articleMap.get((prospect as Prospect).desired_article_id!) || null
            : (prospect as Prospect).desired_article || null,
        prospecteur: (prospect as Prospect).prospecteur_id
          ? prospecteurMap.get((prospect as Prospect).prospecteur_id!) || null
          : null,
      }));

      setProspects(mapped);
    } catch (error) {
      console.error('loadProspects error:', error);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadProspects();
  }, [loadProspects, refreshKey]);

  const tabProspects = useMemo(
    () =>
      prospects.filter(
        (prospect) =>
          (prospect.temperature || 'cold') === activeTab,
      ),
    [prospects, activeTab],
  );

  const hotCount = prospects.filter(
    (prospect) => prospect.temperature === 'hot',
  ).length;

  const warmCount = prospects.filter(
    (prospect) => prospect.temperature === 'warm',
  ).length;

  const coldCount = prospects.filter(
    (prospect) =>
      !prospect.temperature || prospect.temperature === 'cold',
  ).length;

  const followUpTodayCount = prospects.filter((prospect) =>
    isToday(prospect.next_follow_up_at),
  ).length;

  const staleCount = prospects.filter(
    (prospect) =>
      daysSince(prospect.last_contact_at) >= 14,
  ).length;

  const tabConfig = {
    hot: {
      label: '🔥 HOT',
      color: '#FC8181',
      bg: 'rgba(252,129,129,0.1)',
      border: 'rgba(252,129,129,0.3)',
      count: hotCount,
    },
    warm: {
      label: '⚡ WARM',
      color: '#F6E05E',
      bg: 'rgba(246,224,94,0.1)',
      border: 'rgba(246,224,94,0.3)',
      count: warmCount,
    },
    cold: {
      label: '❄️ COLD',
      color: '#63B3ED',
      bg: 'rgba(99,179,237,0.1)',
      border: 'rgba(99,179,237,0.3)',
      count: coldCount,
    },
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Leads',
            value: prospects.length,
            icon: '🎯',
            color: '#D4AF37',
          },
          {
            label: 'Relances aujourd’hui',
            value: followUpTodayCount,
            icon: '🔔',
            color:
              followUpTodayCount > 0
                ? '#D4AF37' :'#68D391',
          },
          {
            label: 'Sans contact +14j',
            value: staleCount,
            icon: '⚠️',
            color:
              staleCount > 0 ? '#FC8181' : '#68D391',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl p-4"
            style={{
              background: '#0F2347',
              border:
                '1px solid rgba(212,175,55,0.15)',
            }}
          >
            <div className="text-xl mb-1">
              {kpi.icon}
            </div>

            <div
              className="text-2xl font-extrabold"
              style={{ color: kpi.color }}
            >
              {kpi.value}
            </div>

            <div
              className="text-xs mt-0.5"
              style={{ color: '#718096' }}
            >
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {followUpTodayCount > 0 && (
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: 'rgba(212,175,55,0.08)',
            border: '2px solid #D4AF37',
            boxShadow:
              '0 0 20px rgba(212,175,55,0.15)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: 'rgba(212,175,55,0.2)',
                border:
                  '1px solid rgba(212,175,55,0.4)',
              }}
            >
              🔔
            </div>

            <div>
              <p
                className="font-extrabold text-sm"
                style={{ color: '#D4AF37' }}
              >
                {followUpTodayCount} relance
                {followUpTodayCount > 1 ? 's' : ''}{' '}
                aujourd&apos;hui
              </p>

              <p
                className="text-xs mt-0.5"
                style={{ color: '#A0AEC0' }}
              >
                Ces prospects nécessitent une action
                commerciale aujourd&apos;hui.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setNewLeadOpen(true)}
        className="w-full py-3 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all mb-5 flex items-center justify-center gap-2"
        style={{
          background:
            'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
          color: '#0B1B3D',
          boxShadow:
            '0 4px 20px rgba(212,175,55,0.25)',
        }}
      >
        <span>➕</span>
        <span>Nouveau Lead</span>
      </button>

      <div
        className="grid grid-cols-3 rounded-2xl p-1 mb-4"
        style={{
          background: '#0A1628',
          border:
            '1px solid rgba(212,175,55,0.1)',
        }}
      >
        {(Object.entries(tabConfig) as [
          ProspectTab,
          (typeof tabConfig)['hot'],
        ][]).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="py-2.5 rounded-xl text-xs font-bold transition-all relative"
            style={{
              background:
                activeTab === key
                  ? config.bg
                  : 'transparent',
              border:
                activeTab === key
                  ? `1px solid ${config.border}`
                  : '1px solid transparent',
              color:
                activeTab === key
                  ? config.color
                  : '#4A5568',
            }}
          >
            {config.label}

            {config.count > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                style={{
                  background: config.color,
                  color: '#000',
                  fontSize: '9px',
                }}
              >
                {config.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl p-4 animate-pulse"
              style={{
                background: '#0F2347',
                border:
                  '1px solid rgba(212,175,55,0.1)',
              }}
            >
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : tabProspects.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: '#0F2347',
            border:
              '1px solid rgba(212,175,55,0.1)',
          }}
        >
          <p className="text-3xl mb-2">
            {activeTab === 'hot' ?'🔥'
              : activeTab === 'warm' ?'⚡' :'❄️'}
          </p>

          <p className="text-white font-semibold text-sm">
            Aucun prospect{' '}
            {activeTab === 'hot' ?'chaud'
              : activeTab === 'warm' ?'tiède' :'froid'}
          </p>

          <p
            className="text-xs mt-1"
            style={{ color: '#4A5568' }}
          >
            Cliquez sur « Nouveau Lead » pour en
            ajouter un.
          </p>
        </div>
      ) : (
        <div>
          {tabProspects.map((prospect) => (
            <ProspectCard
              key={prospect.id}
              prospect={prospect}
              currency={currency}
            />
          ))}
        </div>
      )}

      <NewLeadModal
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onSuccess={() =>
          setRefreshKey((current) => current + 1)
        }
        organizationId={organizationId}
        articles={articles}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BUSINESS DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function BusinessDashboardPage() {
  const router = useRouter();

  const [activeNav, setActiveNav] =
    useState('Dashboard');

  const [organization, setOrganization] =
    useState<OrganizationContext | null>(null);

  const [adminName, setAdminName] =
    useState('Administrateur');

  const [adminEmail, setAdminEmail] =
    useState('');

  const [revenueData, setRevenueData] =
    useState<RevenuePoint[]>([]);

  const [agents, setAgents] =
    useState<DashboardAgent[]>([]);

  const [loadingDashboard, setLoadingDashboard] =
    useState(true);

  const [dashboardError, setDashboardError] =
    useState('');

  const [kpis, setKpis] = useState({
    revenue: 0,
    activeAgents: 0,
    tokens: 0,
    stockValue: 0,
  });

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    setDashboardError('');

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/business/login');
        return;
      }

      setAdminEmail(user.email || '');

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select(
            'first_name, last_name, display_name',
          )
          .eq('id', user.id)
          .maybeSingle();

      if (profileError) {
        console.warn(
          'Profile lookup:',
          profileError.message,
        );
      }

      const displayName =
        profile?.display_name ||
        [profile?.first_name, profile?.last_name]
          .filter(Boolean)
          .join(' ') ||
        user.email?.split('@')[0] ||
        'Administrateur';

      setAdminName(displayName);

      const { data: membership, error: membershipError } =
        await supabase
          .from('organization_members')
          .select(
            `
              id,
              organization_id,
              role,
              status
            `,
          )
          .eq('user_id', user.id)
          .eq('role', 'business_admin')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

      if (membershipError) {
        throw new Error(membershipError.message);
      }

      if (!membership) {
        throw new Error(
          'Aucune organisation active n’est associée à ce compte administrateur.',
        );
      }

      const { data: organizationData, error: organizationError } =
        await supabase
          .from('organizations')
          .select(
            'id, name, currency, city, status, subscription_status',
          )
          .eq('id', membership.organization_id)
          .maybeSingle();

      if (organizationError) {
        throw new Error(organizationError.message);
      }

      if (!organizationData) {
        throw new Error('Organisation introuvable.');
      }

      setOrganization({
        id: organizationData.id,
        name: organizationData.name,
        currency: organizationData.currency || 'XOF',
        city: organizationData.city,
      });

      const organizationId = organizationData.id;
      const fromDate = startOfDaysAgo(29);

      const [
        paymentsResult,
        agentsResult,
        tokensResult,
        stocksResult,
        articlesResult,
        visitsResult,
        commissionsResult,
      ] = await Promise.all([
        supabase
          .from('payments')
          .select(
            'amount, payment_date, status, prospecteur_id',
          )
          .eq('organization_id', organizationId)
          .eq('status', 'successful')
          .gte('payment_date', fromDate)
          .order('payment_date', {
            ascending: true,
          }),

        supabase
          .from('prospecteurs')
          .select(
            `
              id,
              code,
              first_name,
              last_name,
              phone,
              city,
              status,
              commission_rate
            `,
          )
          .eq('organization_id', organizationId)
          .order('first_name'),

        supabase
          .from('daily_tokens')
          .select(
            'id, paid_amount, expected_amount, token_date, prospecteur_id',
          )
          .eq('organization_id', organizationId)
          .gte('token_date', fromDate.slice(0, 10)),

        supabase
          .from('stocks')
          .select(
            'article_id, quantity, reserved_quantity',
          )
          .eq('organization_id', organizationId),

        supabase
          .from('articles')
          .select(
            'id, name, fixed_price, cash_price, credit_price',
          )
          .eq('organization_id', organizationId)
          .eq('active', true),

        supabase
          .from('field_visits')
          .select(
            'id, prospecteur_id, visit_date',
          )
          .eq('organization_id', organizationId)
          .gte('visit_date', fromDate),

        supabase
          .from('commissions')
          .select(
            'amount:commission_amount, prospecteur_id, status',
          )
          .eq('organization_id', organizationId),
      ]);

      const payments = paymentsResult.data || [];
      let prospecteurs =
        agentsResult.data || [];
      const tokens = tokensResult.data || [];
      const stocks = stocksResult.data || [];
      const articles = articlesResult.data || [];
      const visits = visitsResult.data || [];
      const commissions =
        commissionsResult.data || [];

      const totalRevenue = payments.reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.amount || 0),
        0,
      );

      const activeAgents = prospecteurs.filter(
        (agent: any) => agent.status === 'active',
      ).length;

      const totalTokens = tokens.reduce(
        (sum: number, token: any) =>
          sum +
          Number(
            token.paid_amount ||
              token.expected_amount ||
              0,
          ),
        0,
      );

      const articlePriceMap = new Map(
        articles.map((article: any) => [
          article.id,
          Number(
            article.credit_price ||
              article.cash_price ||
              article.fixed_price ||
              0,
          ),
        ]),
      );

      const stockValue = stocks.reduce(
        (sum: number, stock: any) => {
          const quantity =
            Number(stock.quantity || 0) -
            Number(stock.reserved_quantity || 0);

          const price: number =
            (articlePriceMap.get(stock.article_id) as number) || 0;

          return sum + Math.max(0, quantity) * price;
        },
        0,
      );

      setKpis({
        revenue: totalRevenue,
        activeAgents,
        tokens: totalTokens,
        stockValue,
      });

      const revenueMap = new Map<
        string,
        number
      >();

      for (let index = 29; index >= 0; index -= 1) {
        const date = new Date();

        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - index);

        const key = date.toISOString().slice(0, 10);

        revenueMap.set(key, 0);
      }

      payments.forEach((payment: any) => {
        const key = new Date(
          payment.payment_date,
        )
          .toISOString()
          .slice(0, 10);

        if (revenueMap.has(key)) {
          revenueMap.set(
            key,
            (revenueMap.get(key) || 0) +
              Number(payment.amount || 0),
          );
        }
      });

      setRevenueData(
        Array.from(revenueMap.entries()).map(
          ([date, revenue]) => ({
            day: new Date(
              `${date}T00:00:00`,
            ).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
            }),
            revenue,
          }),
        ),
      );

      const visitsByAgent = new Map<
        string,
        number
      >();

      visits.forEach((visit: any) => {
        if (!visit.prospecteur_id) return;

        visitsByAgent.set(
          visit.prospecteur_id,
          (visitsByAgent.get(
            visit.prospecteur_id,
          ) || 0) + 1,
        );
      });

      const cashByAgent = new Map<
        string,
        number
      >();

      payments.forEach((payment: any) => {
        if (!payment.prospecteur_id) return;

        cashByAgent.set(
          payment.prospecteur_id,
          (cashByAgent.get(
            payment.prospecteur_id,
          ) || 0) + Number(payment.amount || 0),
        );
      });

      const tokensByAgent = new Map<
        string,
        number
      >();

      tokens.forEach((token: any) => {
        if (!token.prospecteur_id) return;

        tokensByAgent.set(
          token.prospecteur_id,
          (tokensByAgent.get(
            token.prospecteur_id,
          ) || 0) +
            Number(
              token.paid_amount ||
                token.expected_amount ||
                0,
            ),
        );
      });

      const commissionsByAgent = new Map<
        string,
        number
      >();

      commissions.forEach((commission: any) => {
        if (!commission.prospecteur_id) return;

        commissionsByAgent.set(
          commission.prospecteur_id,
          (commissionsByAgent.get(
            commission.prospecteur_id,
          ) || 0) +
            Number(commission.amount || 0),
        );
      });

      setAgents(
        prospecteurs.map((agent: any) => ({
          id: agent.id,
          name:
            [agent.first_name, agent.last_name]
              .filter(Boolean)
              .join(' ') || 'Prospecteur',
          code: agent.code,
          city: agent.city || '—',
          visits:
            visitsByAgent.get(agent.id) || 0,
          cash:
            cashByAgent.get(agent.id) || 0,
          tokens:
            tokensByAgent.get(agent.id) || 0,
          commission:
            commissionsByAgent.get(agent.id) || 0,
          status: agent.status,
        })),
      );
    } catch (error) {
      console.error('Business dashboard:', error);

      setDashboardError(
        error instanceof Error
          ? error.message
          : 'Impossible de charger le dashboard.',
      );
    } finally {
      setLoadingDashboard(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!organization?.id) return;

    const supabase = createClient();

    const channel = supabase
      .channel(
        `business-dashboard-${organization.id}`,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_tokens',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospecteurs',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stocks',
          filter: `organization_id=eq.${organization.id}`,
        },
        () => {
          void loadDashboard();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organization?.id, loadDashboard]);

  const handleLogout = async () => {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace('/business/login');
  };

  const initials = adminName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const currency =
    organization?.currency || 'XOF';

  const navItems = [
    { icon: '📊', label: 'Dashboard' },
    { icon: '🎯', label: 'Prospects' },
    { icon: '📦', label: 'Stock Management' },
    { icon: '🗺️', label: 'Field Map' },
    { icon: '👥', label: 'Customer Identities' },
    { icon: '💼', label: 'Commission Calculator' },
    { icon: '🎫', label: 'Daily Tokens' },
    { icon: '⚙️', label: 'Settings' },
  ];

  return (
    <>
      <style>{`
        @keyframes goldPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(212,175,55,0.6);
          }

          50% {
            box-shadow: 0 0 0 10px rgba(212,175,55,0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(212,175,55,0);
          }
        }

        .biz-rdv-pulse {
          animation: goldPulse 1.8s ease-in-out infinite;
        }
      `}</style>

      <div
        className="flex min-h-screen"
        style={{ background: '#0B1B3D' }}
      >
        <aside
          className="w-64 flex-shrink-0 flex flex-col"
          style={{
            background: '#0A1628',
            borderRight:
              '1px solid rgba(212,175,55,0.15)',
            minHeight: '100vh',
          }}
        >
          <div
            className="px-6 py-6 border-b"
            style={{
              borderColor:
                'rgba(212,175,55,0.15)',
            }}
          >
            <div
              className="text-xl font-extrabold tracking-widest"
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
              className="text-xs mt-0.5"
              style={{ color: '#4A5568' }}
            >
              Business Suite
            </p>

            {organization && (
              <p
                className="text-xs mt-2 truncate"
                style={{ color: '#A0AEC0' }}
                title={organization.name}
              >
                {organization.name}
              </p>
            )}
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() =>
                  setActiveNav(item.label)
                }
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background:
                    activeNav === item.label
                      ? 'rgba(212,175,55,0.12)'
                      : 'transparent',
                  color:
                    activeNav === item.label
                      ? '#D4AF37' :'#718096',
                  border:
                    activeNav === item.label
                      ? '1px solid rgba(212,175,55,0.25)'
                      : '1px solid transparent',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div
            className="px-4 py-4 border-t"
            style={{
              borderColor:
                'rgba(212,175,55,0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background:
                    'rgba(212,175,55,0.2)',
                  color: '#D4AF37',
                }}
              >
                {initials || 'AD'}
              </div>

              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {adminName}
                </p>

                <p
                  className="text-xs truncate"
                  style={{ color: '#4A5568' }}
                >
                  {adminEmail}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-xs py-2 rounded-lg font-semibold transition-all"
              style={{
                color: '#FC8181',
                border:
                  '1px solid rgba(252,129,129,0.2)',
              }}
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          {activeNav === 'Prospects' ? (
            <>
              <div className="mb-6">
                <h1 className="text-white text-2xl font-bold">
                  Gestion des Prospects
                </h1>

                <p
                  className="text-sm mt-1"
                  style={{ color: '#718096' }}
                >
                  Matrice HOT / WARM / COLD — Protection
                  anti-duplication active
                </p>
              </div>

              {organization ? (
                <ProspectsPanel
                  organizationId={organization.id}
                  currency={currency}
                />
              ) : (
                <div className="text-white">
                  Chargement de l&apos;organisation...
                </div>
              )}
            </>
          ) : activeNav !== 'Dashboard' ? (
            <div
              className="min-h-[70vh] rounded-3xl flex items-center justify-center"
              style={{
                background: '#0F2347',
                border:
                  '1px solid rgba(212,175,55,0.15)',
              }}
            >
              <div className="text-center">
                <div className="text-5xl mb-4">
                  {
                    navItems.find(
                      (item) =>
                        item.label === activeNav,
                    )?.icon
                  }
                </div>

                <h1 className="text-white text-xl font-bold">
                  {activeNav}
                </h1>

                <p
                  className="text-sm mt-2"
                  style={{ color: '#718096' }}
                >
                  Module JDV CRM en cours de
                  chargement.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-white text-2xl font-bold">
                    Dashboard
                  </h1>

                  <p
                    className="text-sm mt-1"
                    style={{ color: '#718096' }}
                  >
                    {organization?.name ||
                      'JDV CRM'}{' '}
                    · Données en temps réel
                  </p>
                </div>

                <button
                  onClick={() => void loadDashboard()}
                  disabled={loadingDashboard}
                  className="px-4 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background:
                      'rgba(212,175,55,0.1)',
                    border:
                      '1px solid rgba(212,175,55,0.25)',
                    color: '#D4AF37',
                  }}
                >
                  {loadingDashboard
                    ? 'Actualisation...' :'↻ Actualiser'}
                </button>
              </div>

              {dashboardError && (
                <div
                  className="rounded-2xl p-4 mb-6"
                  style={{
                    background:
                      'rgba(252,129,129,0.08)',
                    border:
                      '1px solid rgba(252,129,129,0.25)',
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: '#FC8181' }}
                  >
                    {dashboardError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    label: 'Encaissements',
                    value: formatCurrency(
                      kpis.revenue,
                      currency,
                    ),
                    icon: '💰',
                  },
                  {
                    label: 'Prospecteurs actifs',
                    value: kpis.activeAgents.toLocaleString(
                      'fr-FR',
                    ),
                    icon: '👤',
                  },
                  {
                    label: 'Paiements tokens',
                    value: formatCurrency(
                      kpis.tokens,
                      currency,
                    ),
                    icon: '🎫',
                  },
                  {
                    label: 'Valeur du stock',
                    value: formatCurrency(
                      kpis.stockValue,
                      currency,
                    ),
                    icon: '📦',
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl p-5"
                    style={{
                      background: '#0F2347',
                      border:
                        '1px solid rgba(212,175,55,0.15)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">
                        {kpi.icon}
                      </span>
                    </div>

                    <div className="text-xl font-extrabold text-white truncate">
                      {kpi.value}
                    </div>

                    <div
                      className="text-xs mt-1"
                      style={{ color: '#718096' }}
                    >
                      {kpi.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-2xl p-5 mb-6"
                style={{
                  background: '#0F2347',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold">
                    Encaissements — 30 derniers jours
                  </h2>

                  <span
                    className="text-xs"
                    style={{ color: '#718096' }}
                  >
                    {currency}
                  </span>
                </div>

                <ResponsiveContainer
                  width="100%"
                  height={240}
                >
                  <LineChart data={revenueData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />

                    <XAxis
                      dataKey="day"
                      tick={{
                        fill: '#718096',
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />

                    <YAxis
                      tick={{
                        fill: '#718096',
                        fontSize: 10,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) =>
                        `${Math.round(
                          Number(value) / 1000,
                        )}k`
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        background: '#0A1628',
                        border:
                          '1px solid rgba(212,175,55,0.3)',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [
                        formatCurrency(
                          Number(value),
                          currency,
                        ),
                        'Encaissements',
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#D4AF37"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <div
                  className="xl:col-span-2 rounded-2xl p-5"
                  style={{
                    background: '#0F2347',
                    border:
                      '1px solid rgba(212,175,55,0.15)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold">
                      Performance des prospecteurs
                    </h2>

                    <span
                      className="text-xs"
                      style={{ color: '#718096' }}
                    >
                      Données réelles
                    </span>
                  </div>

                  {agents.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="text-4xl mb-3">
                        👤
                      </div>

                      <p className="text-white font-semibold">
                        Aucun prospecteur
                      </p>

                      <p
                        className="text-xs mt-1"
                        style={{ color: '#718096' }}
                      >
                        Les prospecteurs de votre
                        organisation apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            style={{
                              borderBottom:
                                '1px solid rgba(255,255,255,0.07)',
                            }}
                          >
                            {[
                              'Prospecteur',
                              'Secteur',
                              'Visites',
                              'Encaissements',
                              'Tokens',
                              'Commission',
                              'Statut',
                            ].map((header) => (
                              <th
                                key={header}
                                className="text-left pb-3 pr-3 text-xs font-semibold uppercase tracking-wider"
                                style={{
                                  color: '#4A5568',
                                }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {agents
                            .slice(0, 10)
                            .map((agent) => (
                              <tr
                                key={agent.id}
                                style={{
                                  borderBottom:
                                    '1px solid rgba(255,255,255,0.04)',
                                }}
                              >
                                <td className="py-3 pr-3">
                                  <div>
                                    <p className="text-white font-medium">
                                      {agent.name}
                                    </p>

                                    <p
                                      className="text-xs font-mono"
                                      style={{
                                        color: '#4A5568',
                                      }}
                                    >
                                      {agent.code}
                                    </p>
                                  </div>
                                </td>

                                <td
                                  className="py-3 pr-3"
                                  style={{
                                    color: '#A0AEC0',
                                  }}
                                >
                                  {agent.city}
                                </td>

                                <td
                                  className="py-3 pr-3"
                                  style={{
                                    color: '#A0AEC0',
                                  }}
                                >
                                  {agent.visits}
                                </td>

                                <td
                                  className="py-3 pr-3"
                                  style={{
                                    color: '#68D391',
                                  }}
                                >
                                  {formatCurrency(
                                    agent.cash,
                                    currency,
                                  )}
                                </td>

                                <td
                                  className="py-3 pr-3"
                                  style={{
                                    color: '#D4AF37',
                                  }}
                                >
                                  {formatCurrency(
                                    agent.tokens,
                                    currency,
                                  )}
                                </td>

                                <td
                                  className="py-3 pr-3"
                                  style={{
                                    color: '#63B3ED',
                                  }}
                                >
                                  {formatCurrency(
                                    agent.commission,
                                    currency,
                                  )}
                                </td>

                                <td className="py-3">
                                  <span
                                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                    style={{
                                      color:
                                        agent.status ===
                                        'active' ?'#68D391' :'#FC8181',
                                      background:
                                        agent.status ===
                                        'active' ?'rgba(72,187,120,0.1)' :'rgba(252,129,129,0.1)',
                                    }}
                                  >
                                    {agent.status ===
                                    'active' ?'Actif'
                                      : agent.status ===
                                          'suspended' ?'Suspendu' :'Inactif'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: '#0F2347',
                      border:
                        '1px solid rgba(212,175,55,0.15)',
                    }}
                  >
                    <h2 className="text-white font-bold mb-3">
                      État du système
                    </h2>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: '#A0AEC0' }}
                        >
                          Organisation
                        </span>

                        <span
                          className="text-xs font-semibold"
                          style={{ color: '#68D391' }}
                        >
                          {organization
                            ? 'Connectée' :'—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: '#A0AEC0' }}
                        >
                          Devise
                        </span>

                        <span
                          className="text-xs font-semibold"
                          style={{ color: '#D4AF37' }}
                        >
                          {currency}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: '#A0AEC0' }}
                        >
                          Données
                        </span>

                        <span
                          className="text-xs font-semibold"
                          style={{ color: '#68D391' }}
                        >
                          Temps réel
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: '#0F2347',
                      border:
                        '1px solid rgba(212,175,55,0.15)',
                    }}
                  >
                    <h2 className="text-white font-bold mb-3">
                      Accès rapide
                    </h2>

                    <button
                      onClick={() =>
                        setActiveNav('Prospects')
                      }
                      className="w-full rounded-xl py-3 text-sm font-bold"
                      style={{
                        background:
                          'rgba(212,175,55,0.1)',
                        border:
                          '1px solid rgba(212,175,55,0.25)',
                        color: '#D4AF37',
                      }}
                    >
                      🎯 Gérer les prospects
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{
                  background: '#0F2347',
                  border:
                    '1px solid rgba(212,175,55,0.15)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-bold">
                    Résumé commercial
                  </h2>

                  <span
                    className="text-xs"
                    style={{ color: '#718096' }}
                  >
                    30 derniers jours
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        'rgba(72,187,120,0.06)',
                      border:
                        '1px solid rgba(72,187,120,0.15)',
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: '#718096' }}
                    >
                      Encaissements
                    </p>

                    <p
                      className="text-lg font-extrabold mt-1"
                      style={{ color: '#68D391' }}
                    >
                      {formatCurrency(
                        kpis.revenue,
                        currency,
                      )}
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        'rgba(212,175,55,0.06)',
                      border:
                        '1px solid rgba(212,175,55,0.15)',
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: '#718096' }}
                    >
                      Tokens encaissés
                    </p>

                    <p
                      className="text-lg font-extrabold mt-1"
                      style={{ color: '#D4AF37' }}
                    >
                      {formatCurrency(
                        kpis.tokens,
                        currency,
                      )}
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{
                      background:
                        'rgba(99,179,237,0.06)',
                      border:
                        '1px solid rgba(99,179,237,0.15)',
                    }}
                  >
                    <p
                      className="text-xs"
                      style={{ color: '#718096' }}
                    >
                      Prospecteurs actifs
                    </p>

                    <p
                      className="text-lg font-extrabold mt-1"
                      style={{ color: '#63B3ED' }}
                    >
                      {kpis.activeAgents}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}