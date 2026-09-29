'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProspectorInfo {
  full_name: string | null;
  code_prospecteur: string | null;
  secteur_assigne: string | null;
}

interface Prospect {
  id: string;
  identite: string;
  telephone: string | null;
  geolocalisation: string | null;
  categorie: 'chaud' | 'tiede' | 'froid';
  type_prospect: string;
  date_dernier_contact: string | null;
  date_achat_prevue: string | null;
  date_rencontre: string | null;
  date_rendez_vous: string | null;
  notes: string | null;
  article_voulu_id: string | null;
  article_nom?: string;
  montant_total: number | null;
  daysSinceContact: number;
  prospector: ProspectorInfo | null;
  created_by_user_id: string;
}

interface CollectModalState {
  open: boolean;
  prospect: Prospect | null;
}

interface AntiTheftOwner {
  full_name: string | null;
  code_prospecteur: string | null;
  created_at: string | null;
}

interface NewLeadForm {
  identite: string;
  telephone: string;
  geolocalisation: string;
  categorie: 'chaud' | 'tiede' | 'froid';
  article_voulu_id: string;
  montant_total: string;
  date_rencontre: string;
  date_rendez_vous: string;
  notes: string;
}

type TabType = 'chaud' | 'tiede' | 'froid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function buildWhatsAppMessage(prospect: Prospect): string {
  const phone = (prospect.telephone || '').replace(/\D/g, '');
  const name = prospect.identite;
  const article = prospect.article_nom || 'votre commande';

  let message = '';
  if (prospect.categorie === 'chaud') {
    message = `Bonjour ${name}, je vous contacte au sujet de votre accord pour ${article}. Conformément à notre entente, votre token journalier est dû aujourd'hui. Merci de procéder au règlement dès que possible. Cordialement, Votre Agent JDV CRM.`;
  } else {
    message = `Bonjour ${name}, je reviens vers vous concernant ${article}. Nous avons une offre exceptionnelle qui correspond parfaitement à vos besoins. Seriez-vous disponible pour en discuter ? Cordialement, Votre Agent JDV CRM.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ─── Anti-Theft Modal ─────────────────────────────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6"
        style={{
          background: '#0A1628',
          border: '2px solid #D4AF37',
          boxShadow: '0 0 40px rgba(212,175,55,0.3), 0 0 80px rgba(212,175,55,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)' }}
          >
            🚫
          </div>
          <div>
            <p className="font-extrabold text-sm uppercase tracking-widest" style={{ color: '#D4AF37' }}>
              CRITIQUE
            </p>
            <p className="text-white font-bold text-base leading-tight">
              Lead déjà enregistré
            </p>
          </div>
        </div>

        {/* Gold divider */}
        <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

        {/* Warning message */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: '#F5E17A' }}>
            ⚠️ Ce lead appartient déjà à un autre partenaire.
          </p>
          <p className="text-xs" style={{ color: '#A0AEC0' }}>
            Voler ou dupliquer des clients est strictement bloqué par le système.
          </p>
        </div>

        {/* Owner info */}
        <div
          className="rounded-2xl p-4 mb-5 space-y-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: '#4A5568' }}>
            Informations du propriétaire
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm">👤</span>
            <span className="text-white text-sm font-semibold">{owner.full_name || 'Inconnu'}</span>
          </div>
          {owner.code_prospecteur && (
            <div className="flex items-center gap-2">
              <span className="text-sm">🪪</span>
              <span className="text-xs font-mono" style={{ color: '#D4AF37' }}>ID: {owner.code_prospecteur}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm">📞</span>
            <span className="text-xs" style={{ color: '#A0AEC0' }}>{phone}</span>
          </div>
          {owner.created_at && (
            <div className="flex items-center gap-2">
              <span className="text-sm">📅</span>
              <span className="text-xs" style={{ color: '#A0AEC0' }}>
                Enregistré le {new Date(owner.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-center mb-4" style={{ color: '#4A5568' }}>
          Enregistré par : <span style={{ color: '#D4AF37' }}>{owner.full_name || 'Inconnu'}</span>
          {owner.code_prospecteur && <> (ID: <span style={{ color: '#D4AF37' }}>{owner.code_prospecteur}</span>)</>}
          {owner.created_at && <> le {new Date(owner.created_at).toLocaleDateString('fr-FR')}</>}.
          Voler ou dupliquer des clients est strictement bloqué par le système.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-sm tracking-wider uppercase"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
            color: '#0B1B3D',
          }}
        >
          Compris — Fermer
        </button>
      </div>
    </div>
  );
}

// ─── New Lead Modal ───────────────────────────────────────────────────────────

function NewLeadModal({
  open,
  onClose,
  onSuccess,
  userId,
  organizationId,
  portfolioId,
  articles,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  organizationId: string;
  portfolioId: string;
  articles: { id: string; name: string; fixed_price: number }[];
}) {
  const [form, setForm] = useState<NewLeadForm>({
    identite: '',
    telephone: '',
    geolocalisation: '',
    categorie: 'tiede',
    article_voulu_id: '',
    montant_total: '',
    date_rencontre: new Date().toISOString().split('T')[0],
    date_rendez_vous: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [antiTheftOwner, setAntiTheftOwner] = useState<AntiTheftOwner | null>(null);
  const [antiTheftPhone, setAntiTheftPhone] = useState('');

  const handlePhoneBlur = async () => {
    if (!form.telephone || form.telephone.length < 8) return;
    setCheckingPhone(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('prospects')
        .select('id, created_at')
        .eq('organization_id', organizationId)
        .eq('phone', form.telephone.trim())
        .limit(1)
        .maybeSingle();

      if (data) {
        setAntiTheftOwner({ full_name: 'Prospect déjà enregistré', code_prospecteur: null, created_at: data.created_at });
        setAntiTheftPhone(form.telephone);
      }
    } catch {
      // silent
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const identity = form.identite.trim();
    if (!identity) {
      setError('Le nom complet du prospect est obligatoire.');
      return;
    }

    if (!organizationId || !portfolioId) {
      setError('Votre portefeuille commercial est introuvable. Reconnectez-vous ou contactez l’administrateur.');
      return;
    }

    if (form.telephone) {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('prospects')
        .select('id, created_at')
        .eq('organization_id', organizationId)
        .eq('phone', form.telephone.trim())
        .limit(1)
        .maybeSingle();

      if (existing) {
        setAntiTheftOwner({ full_name: 'Prospect déjà enregistré', code_prospecteur: null, created_at: existing.created_at });
        setAntiTheftPhone(form.telephone);
        return;
      }
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const parts = identity.split(/\s+/);
      const firstName = parts.shift() || identity;
      const lastName = parts.length ? parts.join(' ') : null;
      const estimatedAmount = form.montant_total ? parseFloat(form.montant_total) : null;
      const selectedArticle = articles.find((a) => a.id === form.article_voulu_id);

      const insertData = {
        organization_id: organizationId,
        portfolio_id: portfolioId,
        prospecteur_id: null,
        first_name: firstName,
        last_name: lastName,
        phone: form.telephone.trim() || null,
        address: form.geolocalisation.trim() || null,
        desired_article: selectedArticle?.name || null,
        desired_article_id: form.article_voulu_id || null,
        temperature: form.categorie,
        visit_count: 1,
        last_contact_at: new Date().toISOString(),
        next_follow_up_at: form.date_rendez_vous ? new Date(form.date_rendez_vous).toISOString() : null,
        status: 'new',
        notes: form.notes.trim() || null,
        estimated_amount: estimatedAmount,
        purchase_date_planned: form.date_rencontre ? new Date(form.date_rencontre).toISOString().slice(0, 10) : null,
      };

      const { error: insertError } = await supabase.from('prospects').insert(insertData);
      if (insertError) throw new Error(insertError.message);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setForm({
          identite: '',
          telephone: '',
          geolocalisation: '',
          categorie: 'tiede',
          article_voulu_id: '',
          montant_total: '',
          date_rencontre: new Date().toISOString().split('T')[0],
          date_rendez_vous: '',
          notes: '',
        });
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

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
        className="fixed inset-0 z-40 flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-t-3xl p-6 pb-10 overflow-y-auto"
          style={{
            background: '#0F2347',
            border: '1px solid rgba(212,175,55,0.35)',
            boxShadow: '0 -8px 40px rgba(212,175,55,0.1)',
            maxHeight: '90vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(212,175,55,0.4)' }} />
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="text-white font-bold text-lg">Nouveau Lead</h3>
              <p className="text-xs" style={{ color: '#A0AEC0' }}>Enregistrer un nouveau prospect</p>
            </div>
          </div>
          {success ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.3)' }}>
              <div className="text-4xl mb-2">✅</div>
              <p className="text-white font-bold">Lead enregistré !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Nom complet *</label>
                <input type="text" value={form.identite} onChange={(e) => setForm(f => ({ ...f, identite: e.target.value }))} placeholder="Prénom Nom du client" required className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.25)', caretColor: '#D4AF37' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Téléphone {checkingPhone && <span style={{ color: '#D4AF37' }}>— vérification...</span>}</label>
                <input type="tel" value={form.telephone} onChange={(e) => setForm(f => ({ ...f, telephone: e.target.value }))} onBlur={handlePhoneBlur} placeholder="+229 XX XX XX XX" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.25)', caretColor: '#D4AF37' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Adresse / Localisation</label>
                <input type="text" value={form.geolocalisation} onChange={(e) => setForm(f => ({ ...f, geolocalisation: e.target.value }))} placeholder="Quartier, ville, repère..." className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', caretColor: '#D4AF37' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Catégorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['chaud', 'tiede', 'froid'] as const).map((cat) => (
                    <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, categorie: cat }))} className="py-2 rounded-xl text-xs font-bold transition-all" style={{ background: form.categorie === cat ? (cat === 'chaud' ? 'rgba(252,129,129,0.2)' : cat === 'tiede' ? 'rgba(246,224,94,0.15)' : 'rgba(99,179,237,0.15)') : 'rgba(255,255,255,0.03)', border: form.categorie === cat ? `1px solid ${cat === 'chaud' ? '#FC8181' : cat === 'tiede' ? '#F6E05E' : '#63B3ED'}` : '1px solid rgba(255,255,255,0.08)', color: form.categorie === cat ? (cat === 'chaud' ? '#FC8181' : cat === 'tiede' ? '#F6E05E' : '#63B3ED') : '#718096' }}>
                      {cat === 'chaud' ? '🔥 HOT' : cat === 'tiede' ? '⚡ WARM' : '❄️ COLD'}
                    </button>
                  ))}
                </div>
              </div>
              {articles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Article désiré</label>
                  <select value={form.article_voulu_id} onChange={(e) => setForm(f => ({ ...f, article_voulu_id: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: '#0B1B3D', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <option value="">— Sélectionner un article —</option>
                    {articles.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Montant estimé (FCFA)</label>
                <input type="number" value={form.montant_total} onChange={(e) => setForm(f => ({ ...f, montant_total: e.target.value }))} placeholder="Ex: 25000" min="0" className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', caretColor: '#D4AF37' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Date rencontre</label>
                  <input type="date" value={form.date_rencontre} onChange={(e) => setForm(f => ({ ...f, date_rencontre: e.target.value }))} className="w-full rounded-xl px-3 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Rendez-vous / Relance</label>
                  <input type="date" value={form.date_rendez_vous} onChange={(e) => setForm(f => ({ ...f, date_rendez_vous: e.target.value }))} className="w-full rounded-xl px-3 py-3 text-white text-sm outline-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', colorScheme: 'dark' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#A0AEC0' }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations, remarques..." rows={2} className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none resize-none" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', caretColor: '#D4AF37' }} />
              </div>
              {error && <p className="text-xs rounded-lg px-3 py-2 text-center" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all active:scale-95" style={{ background: loading ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)', color: loading ? '#D4AF37' : '#0B1B3D', boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.3)' }}>
                {loading ? 'Enregistrement...' : '➕ Enregistrer le Lead'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Collect Token Modal ──────────────────────────────────────────────────────

function CollectTokenModal({
  state,
  onClose,
  onSuccess,
  userId,
  enterpriseId,
}: {
  state: CollectModalState;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  enterpriseId: string;
}) {
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState<'cash' | 'mtn_money' | 'moov' | 'wave' | 'autre'>('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.prospect) return;
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from('payments').insert({
        organization_id: organizationId,
        amount: parseFloat(montant),
        recorded_by: userId,
        payment_method: mode,
        status: 'successful',
        notes: notes || null,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setMontant('');
        setNotes('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  if (!state.open || !state.prospect) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
        style={{
          background: '#0F2347',
          border: '1px solid rgba(212,175,55,0.35)',
          boxShadow: '0 -8px 40px rgba(212,175,55,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(212,175,55,0.4)' }} />

        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl">💰</span>
          <div>
            <h3 className="text-white font-bold text-lg">Collecter Token</h3>
            <p className="text-xs" style={{ color: '#A0AEC0' }}>{state.prospect.identite}</p>
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.3)' }}>
            <div className="text-4xl mb-2">✅</div>
            <p className="text-white font-bold">Collecte enregistrée !</p>
            <p className="text-xs mt-1" style={{ color: '#68D391' }}>Synchronisé avec la base de données</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A0AEC0' }}>
                Montant (FCFA)
              </label>
              <input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex: 5000"
                required
                min="1"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.25)', caretColor: '#D4AF37' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A0AEC0' }}>
                Mode de Paiement
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'mtn_money', 'moov', 'wave', 'autre'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: mode === m ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.03)',
                      border: mode === m ? '1px solid #D4AF37' : '1px solid rgba(255,255,255,0.08)',
                      color: mode === m ? '#D4AF37' : '#718096',
                    }}
                  >
                    {m === 'cash' ? '💵 Cash' : m === 'mtn_money' ? '📱 MTN' : m === 'moov' ? '📲 Moov' : m === 'wave' ? '🌊 Wave' : '🔄 Autre'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A0AEC0' }}>
                Notes (optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarques sur la collecte..."
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.15)', caretColor: '#D4AF37' }}
              />
            </div>

            {error && (
              <p className="text-xs rounded-lg px-3 py-2 text-center" style={{ color: '#FC8181', background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all active:scale-95"
              style={{
                background: loading ? 'rgba(212,175,55,0.3)' : 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
                color: loading ? '#D4AF37' : '#0B1B3D',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.3)',
              }}
            >
              {loading ? 'Enregistrement...' : '💰 Confirmer la Collecte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Prospect Card ────────────────────────────────────────────────────────────

function ProspectCard({
  prospect,
  onCollect,
  onContactUpdate,
}: {
  prospect: Prospect;
  onCollect: (p: Prospect) => void;
  onContactUpdate: (id: string) => void;
}) {
  const isStale = prospect.daysSinceContact >= 14;
  const rdvToday = isToday(prospect.date_rendez_vous);

  const handleCall = () => {
    if (prospect.telephone) {
      window.location.href = `tel:${prospect.telephone}`;
      onContactUpdate(prospect.id);
    }
  };

  const handleWhatsApp = () => {
    const url = buildWhatsAppMessage(prospect);
    window.open(url, '_blank');
    onContactUpdate(prospect.id);
  };

  return (
    <div
      className={`rounded-2xl p-4 mb-3 relative ${rdvToday ? 'rdv-pulse-card' : ''}`}
      style={{
        background: '#0F2347',
        border: rdvToday
          ? '2px solid #D4AF37'
          : isStale
          ? '1px solid rgba(212,175,55,0.5)'
          : '1px solid rgba(212,175,55,0.15)',
        boxShadow: rdvToday
          ? '0 0 0 0 rgba(212,175,55,0.4)'
          : isStale
          ? '0 0 12px rgba(212,175,55,0.08)'
          : 'none',
      }}
    >
      {/* RDV Today Badge */}
      {rdvToday && (
        <div
          className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-widest"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 50%, #A8860C 100%)',
            color: '#0B1B3D',
            boxShadow: '0 2px 10px rgba(212,175,55,0.5)',
          }}
        >
          🔔 RDV AUJOURD'HUI
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between mb-3" style={{ marginTop: rdvToday ? '8px' : '0' }}>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{prospect.identite}</p>
          {prospect.telephone && (
            <p className="text-xs mt-0.5 font-mono" style={{ color: '#63B3ED' }}>📞 {prospect.telephone}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 ml-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
            style={{
              background: prospect.daysSinceContact === 0 ? 'rgba(72,187,120,0.15)' : prospect.daysSinceContact < 7 ? 'rgba(246,224,94,0.1)' : 'rgba(252,129,129,0.1)',
              color: prospect.daysSinceContact === 0 ? '#68D391' : prospect.daysSinceContact < 7 ? '#F6E05E' : '#FC8181',
              border: `1px solid ${prospect.daysSinceContact === 0 ? 'rgba(72,187,120,0.3)' : prospect.daysSinceContact < 7 ? 'rgba(246,224,94,0.3)' : 'rgba(252,129,129,0.3)'}`,
            }}
          >
            {prospect.daysSinceContact === 0 ? 'Aujourd\'hui' : `${prospect.daysSinceContact}j`}
          </span>
        </div>
      </div>

      {/* Address */}
      {prospect.geolocalisation && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs">📍</span>
          <span className="text-xs" style={{ color: '#A0AEC0' }}>{prospect.geolocalisation}</span>
        </div>
      )}

      {/* Article + Amount */}
      {(prospect.article_nom || prospect.montant_total) && (
        <div
          className="rounded-xl px-3 py-2 mb-2 flex items-center justify-between"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">📦</span>
            <span className="text-xs font-semibold" style={{ color: '#D4AF37' }}>
              {prospect.article_nom || 'Article non défini'}
            </span>
          </div>
          {prospect.montant_total && (
            <span className="text-xs font-bold" style={{ color: '#68D391' }}>
              {prospect.montant_total.toLocaleString('fr-FR')} FCFA
            </span>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="flex gap-2 mb-2 flex-wrap">
        {prospect.date_rencontre && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{ background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.2)' }}
          >
            <span className="text-xs">🤝</span>
            <span className="text-xs" style={{ color: '#63B3ED' }}>
              {new Date(prospect.date_rencontre).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
        {prospect.date_rendez_vous && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{
              background: rdvToday ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.06)',
              border: rdvToday ? '1px solid #D4AF37' : '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <span className="text-xs">📅</span>
            <span className="text-xs font-semibold" style={{ color: '#D4AF37' }}>
              RDV: {new Date(prospect.date_rendez_vous).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
        {prospect.date_achat_prevue && (
          <div
            className="flex items-center gap-1 rounded-lg px-2 py-1"
            style={{ background: 'rgba(252,129,129,0.08)', border: '1px solid rgba(252,129,129,0.2)' }}
          >
            <span className="text-xs">🛒</span>
            <span className="text-xs" style={{ color: '#FC8181' }}>
              Achat: {new Date(prospect.date_achat_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        )}
      </div>

      {/* Prospector info */}
      {prospect.prospector && (
        <div
          className="rounded-xl px-3 py-2 mb-3 flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span className="text-xs">🕵️</span>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold" style={{ color: '#A0AEC0' }}>
              {prospect.prospector.full_name || 'Agent'}
            </span>
            {prospect.prospector.code_prospecteur && (
              <span className="text-xs ml-1.5 font-mono" style={{ color: '#4A5568' }}>
                #{prospect.prospector.code_prospecteur}
              </span>
            )}
            {prospect.prospector.secteur_assigne && (
              <span className="text-xs ml-1.5" style={{ color: '#4A5568' }}>
                · {prospect.prospector.secteur_assigne}
              </span>
            )}
          </div>
        </div>
      )}

      {prospect.notes && (
        <p className="text-xs mb-3 italic" style={{ color: '#718096' }}>
          &ldquo;{prospect.notes}&rdquo;
        </p>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleCall}
          disabled={!prospect.telephone}
          className="py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1"
          style={{
            background: 'rgba(99,179,237,0.1)',
            border: '1px solid rgba(99,179,237,0.25)',
            color: '#63B3ED',
            opacity: prospect.telephone ? 1 : 0.4,
          }}
        >
          <span className="text-base">📞</span>
          <span>Appeler</span>
        </button>

        <button
          onClick={handleWhatsApp}
          disabled={!prospect.telephone}
          className="py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1"
          style={{
            background: 'rgba(72,187,120,0.1)',
            border: '1px solid rgba(72,187,120,0.25)',
            color: '#68D391',
            opacity: prospect.telephone ? 1 : 0.4,
          }}
        >
          <span className="text-base">💬</span>
          <span>WhatsApp</span>
        </button>

        <button
          onClick={() => onCollect(prospect)}
          className="py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1"
          style={{
            background: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.3)',
            color: '#D4AF37',
          }}
        >
          <span className="text-base">💰</span>
          <span>Token</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TerrainDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('chaud');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [articles, setArticles] = useState<{ id: string; name: string; fixed_price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Agent');
  const [userId, setUserId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [collectModal, setCollectModal] = useState<CollectModalState>({ open: false, prospect: null });
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/terrain/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, status')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.status !== 'active') {
        router.push('/terrain/login');
        return;
      }

      let organization: { id: string; name: string } | null = null;
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('owner_user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (ownedOrg) {
        organization = ownedOrg;
      } else {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (membership?.organization_id) {
          const { data: memberOrg } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', membership.organization_id)
            .maybeSingle();
          organization = memberOrg;
        }
      }

      if (!organization) {
        setLoading(false);
        router.push('/terrain/login');
        return;
      }

      const { data: portfolio } = await supabase
        .from('client_portfolios')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('owner_user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (!portfolio) {
        setLoading(false);
        console.error('Aucun portefeuille actif pour cet utilisateur.');
        return;
      }

      setUserName(profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Agent');
      setUserId(user.id);
      setOrganizationId(organization.id);
      setPortfolioId(portfolio.id);

      const { data: articlesData } = await supabase
        .from('articles')
        .select('id, name, fixed_price')
        .eq('organization_id', organization.id)
        .eq('active', true)
        .order('name');

      if (articlesData) setArticles(articlesData as { id: string; name: string; fixed_price: number }[]);

      const { data: prospectsData, error: prospectsError } = await supabase
        .from('prospects')
        .select('id, organization_id, prospecteur_id, first_name, last_name, phone, address, desired_article, desired_article_id, temperature, visit_count, last_contact_at, next_follow_up_at, status, notes, estimated_amount, purchase_date_planned, created_at')
        .eq('organization_id', organization.id)
        .order('last_contact_at', { ascending: true, nullsFirst: true });

      if (prospectsError) {
        console.error('Erreur chargement prospects:', prospectsError);
        throw prospectsError;
      }

      if (prospectsData) {
        const prospecteurIds = [...new Set(prospectsData.map((p: any) => p.prospecteur_id).filter(Boolean))];
        let prospecteurMap: Record<string, any> = {};
        if (prospecteurIds.length) {
          const { data: prospecteursData } = await supabase
            .from('prospecteurs')
            .select('id, first_name, last_name, code, user_id')
            .in('id', prospecteurIds);
          (prospecteursData || []).forEach((pr: any) => {
            prospecteurMap[pr.id] = pr;
          });
        }

        const mapped: Prospect[] = prospectsData.map((p: any) => {
          const pr = p.prospecteur_id ? prospecteurMap[p.prospecteur_id] : null;
          const identity = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Prospect';
          return {
            id: p.id,
            identite: identity,
            telephone: p.phone,
            geolocalisation: p.address,
            categorie: (p.temperature || 'froid') as 'chaud' | 'tiede' | 'froid',
            type_prospect: p.status || 'new',
            date_dernier_contact: p.last_contact_at,
            date_achat_prevue: p.purchase_date_planned,
            date_rencontre: p.created_at,
            date_rendez_vous: p.next_follow_up_at,
            notes: p.notes,
            article_voulu_id: p.desired_article_id,
            article_nom: p.desired_article || undefined,
            montant_total: p.estimated_amount,
            daysSinceContact: daysSince(p.last_contact_at),
            created_by_user_id: pr?.user_id || user.id,
            prospector: pr ? {
              full_name: [pr.first_name, pr.last_name].filter(Boolean).join(' ') || null,
              code_prospecteur: pr.code || null,
              secteur_assigne: null,
            } : null,
          };
        });
        setProspects(mapped);
      }
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/terrain/login');
  };

  const handleContactUpdate = async (prospectId: string) => {
    const supabase = createClient();
    await supabase
      .from('prospects')
      .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', prospectId);
    setProspects((prev) =>
      prev.map((p) => p.id === prospectId ? { ...p, daysSinceContact: 0, date_dernier_contact: new Date().toISOString() } : p)
    );
  };

  const tabProspects = prospects.filter((p) => p.categorie === activeTab);
  const staleProspects = prospects.filter((p) => p.daysSinceContact >= 14);
  const rdvTodayCount = prospects.filter((p) => isToday(p.date_rendez_vous)).length;

  const tabConfig = {
    chaud: { label: '🔥 HOT', color: '#FC8181', bg: 'rgba(252,129,129,0.1)', border: 'rgba(252,129,129,0.3)', count: prospects.filter(p => p.categorie === 'chaud').length },
    tiede: { label: '⚡ WARM', color: '#F6E05E', bg: 'rgba(246,224,94,0.1)', border: 'rgba(246,224,94,0.3)', count: prospects.filter(p => p.categorie === 'tiede').length },
    froid: { label: '❄️ COLD', color: '#63B3ED', bg: 'rgba(99,179,237,0.1)', border: 'rgba(99,179,237,0.3)', count: prospects.filter(p => p.categorie === 'froid').length },
  };

  return (
    <>
      <style>{`
        @keyframes goldPulse {
          0% { box-shadow: 0 0 0 0 rgba(212,175,55,0.6); }
          50% { box-shadow: 0 0 0 10px rgba(212,175,55,0); }
          100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
        }
        .rdv-pulse-card {
          animation: goldPulse 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen pb-10" style={{ background: '#0B1B3D' }}>
        {/* Top Bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(11,27,61,0.97)',
            borderBottom: '1px solid rgba(212,175,55,0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div>
            <p className="text-white font-bold text-sm">{userName}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(72,187,120,0.15)', color: '#68D391', border: '1px solid rgba(72,187,120,0.3)' }}
            >
              ● Actif
            </span>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '0.1em',
            }}
          >
            JDV CRM
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{ color: '#A0AEC0', border: '1px solid rgba(160,174,192,0.2)' }}
          >
            Quitter
          </button>
        </div>

        <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">

          {/* RDV Today Alert */}
          {rdvTodayCount > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(212,175,55,0.08)',
                border: '2px solid #D4AF37',
                boxShadow: '0 0 20px rgba(212,175,55,0.15)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)' }}
                >
                  🔔
                </div>
                <div>
                  <p className="font-extrabold text-sm" style={{ color: '#D4AF37' }}>
                    {rdvTodayCount} Rendez-vous AUJOURD'HUI
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#A0AEC0' }}>
                    Contactez ces prospects immédiatement pour la collecte ou la clôture d'accord.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ⚠️ Anti-Forget Flash Alerter */}
          {staleProspects.length > 0 && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(212,175,55,0.06)',
                border: '2px solid rgba(212,175,55,0.5)',
                boxShadow: '0 0 20px rgba(212,175,55,0.08)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#D4AF37' }}>
                    Alerteur Anti-Oubli
                  </p>
                  <p className="text-xs" style={{ color: '#A0AEC0' }}>
                    {staleProspects.length} prospect{staleProspects.length > 1 ? 's' : ''} non contacté{staleProspects.length > 1 ? 's' : ''} depuis +14 jours
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {staleProspects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{p.identite}</p>
                      <p className="text-xs" style={{ color: '#FC8181' }}>
                        Dernier contact : il y a {p.daysSinceContact} jours
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {p.telephone && (
                        <button
                          onClick={() => { window.location.href = `tel:${p.telephone}`; handleContactUpdate(p.id); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90"
                          style={{ background: 'rgba(99,179,237,0.15)', border: '1px solid rgba(99,179,237,0.3)' }}
                        >
                          📞
                        </button>
                      )}
                      {p.telephone && (
                        <button
                          onClick={() => { window.open(buildWhatsAppMessage(p), '_blank'); handleContactUpdate(p.id); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90"
                          style={{ background: 'rgba(72,187,120,0.15)', border: '1px solid rgba(72,187,120,0.3)' }}
                        >
                          💬
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {staleProspects.length > 3 && (
                  <p className="text-xs text-center" style={{ color: '#4A5568' }}>
                    +{staleProspects.length - 3} autres prospects en attente
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Add Lead Button */}
          <button
            onClick={() => setNewLeadOpen(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5E17A 40%, #D4AF37 60%, #A8860C 100%)',
              color: '#0B1B3D',
              boxShadow: '0 4px 20px rgba(212,175,55,0.25)',
            }}
          >
            <span>➕</span>
            <span>Nouveau Lead</span>
          </button>

          {/* 3-Tab Lead Matrix */}
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#A0AEC0' }}>
              Matrice de Leads
            </p>

            {/* Tab Headers */}
            <div
              className="grid grid-cols-3 rounded-2xl p-1 mb-4"
              style={{ background: '#0A1628', border: '1px solid rgba(212,175,55,0.1)' }}
            >
              {(Object.entries(tabConfig) as [TabType, typeof tabConfig.chaud][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all relative"
                  style={{
                    background: activeTab === key ? cfg.bg : 'transparent',
                    border: activeTab === key ? `1px solid ${cfg.border}` : '1px solid transparent',
                    color: activeTab === key ? cfg.color : '#4A5568',
                  }}
                >
                  {cfg.label}
                  {cfg.count > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                      style={{ background: cfg.color, color: '#000', fontSize: '9px' }}
                    >
                      {cfg.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Description */}
            <div
              className="rounded-xl px-3 py-2 mb-4 text-xs"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#718096' }}
            >
              {activeTab === 'chaud' && '🔥 Prospects chauds — accord verbal ou date d\'achat confirmée. Priorité maximale.'}
              {activeTab === 'tiede' && '⚡ Prospects tièdes — intéressés mais indécis. Relance régulière nécessaire.'}
              {activeTab === 'froid' && '❄️ Prospects froids — faible priorité. Maintenir le contact occasionnellement.'}
            </div>

            {/* Prospect Cards */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: '#0F2347', border: '1px solid rgba(212,175,55,0.1)' }}>
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-3" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-10 bg-gray-700 rounded-xl" />
                      <div className="h-10 bg-gray-700 rounded-xl" />
                      <div className="h-10 bg-gray-700 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tabProspects.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-center"
                style={{ background: '#0F2347', border: '1px solid rgba(212,175,55,0.1)' }}
              >
                <p className="text-3xl mb-2">
                  {activeTab === 'chaud' ? '🔥' : activeTab === 'tiede' ? '⚡' : '❄️'}
                </p>
                <p className="text-white font-semibold text-sm">Aucun prospect {activeTab === 'chaud' ? 'chaud' : activeTab === 'tiede' ? 'tiède' : 'froid'}</p>
                <p className="text-xs mt-1" style={{ color: '#4A5568' }}>
                  Appuyez sur &ldquo;Nouveau Lead&rdquo; pour en ajouter un
                </p>
              </div>
            ) : (
              <div>
                {tabProspects.map((p) => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    onCollect={(prospect) => setCollectModal({ open: true, prospect })}
                    onContactUpdate={handleContactUpdate}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs pb-4" style={{ color: '#2D3748' }}>
            Terrain Portal v4.0 | JDV CRM
          </p>
        </div>

        {/* Modals */}
        <CollectTokenModal
          state={collectModal}
          onClose={() => setCollectModal({ open: false, prospect: null })}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          userId={userId}
          organizationId={organizationId}
          portfolioId={portfolioId}
        />

        <NewLeadModal
          open={newLeadOpen}
          onClose={() => setNewLeadOpen(false)}
          onSuccess={() => setRefreshKey((k) => k + 1)}
          userId={userId}
          organizationId={organizationId}
          portfolioId={portfolioId}
          articles={articles}
        />
      </div>
    </>
  );
}
