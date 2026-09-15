'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Article { id: string; name: string; cash_price: number | null; credit_price?: number | null; }
interface Prospect {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  temperature: 'hot' | 'warm' | 'cold' | null;
  status: string | null;
  notes: string | null;
  desired_article_id: string | null;
  estimated_amount: number | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  purchase_date_planned: string | null;
  created_at: string;
}

type Tab = 'hot' | 'warm' | 'cold';

const LABELS: Record<Tab, string> = { hot: '🔥 HOT', warm: '⚡ WARM', cold: '❄️ COLD' };

function displayName(p: Prospect) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Prospect sans nom';
}
function daysSince(value: string | null) {
  if (!value) return 999;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}
function waUrl(phone: string | null, name: string) {
  const number = (phone || '').replace(/\D/g, '');
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(`Bonjour ${name}, je reviens vers vous concernant votre projet. Êtes-vous toujours disponible pour en discuter ?`)}`;
}

export default function TerrainDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('hot');
  const [organizationId, setOrganizationId] = useState('');
  const [prospecteurId, setProspecteurId] = useState('');
  const [userName, setUserName] = useState('Prospecteur');
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', address: '', city: '', temperature: 'warm' as Tab, desired_article_id: '', estimated_amount: '', next_follow_up_at: '', purchase_date_planned: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/terrain/login'); return; }

      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('role', 'prospecteur')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (membershipError || !membership) { router.replace('/terrain/login'); return; }

      const { data: agent } = await supabase
        .from('prospecteurs')
        .select('id, first_name, last_name, status')
        .eq('organization_id', membership.organization_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!agent || agent.status !== 'active') { router.replace('/terrain/login'); return; }

      setOrganizationId(membership.organization_id);
      setProspecteurId(agent.id);
      setUserName([agent.first_name, agent.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || 'Prospecteur');

      const [prospectsResult, articlesResult] = await Promise.all([
        supabase.from('prospects').select('id,first_name,last_name,phone,address,city,temperature,status,notes,desired_article_id,estimated_amount,last_contact_at,next_follow_up_at,purchase_date_planned,created_at').eq('organization_id', membership.organization_id).order('last_contact_at', { ascending: true, nullsFirst: true }),
        supabase.from('articles').select('id,name,cash_price,credit_price').eq('organization_id', membership.organization_id).eq('active', true).order('name'),
      ]);
      if (prospectsResult.error) throw prospectsResult.error;
      if (articlesResult.error) throw articlesResult.error;
      setProspects((prospectsResult.data ?? []) as Prospect[]);
      setArticles((articlesResult.data ?? []) as Article[]);
    } catch (error) {
      console.error('[JDV CRM] terrain load:', error);
      setMessage(error instanceof Error ? error.message : 'Impossible de charger les données.');
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => prospects.filter(p => (p.temperature || 'cold') === tab), [prospects, tab]);
  const counts = useMemo(() => ({ hot: prospects.filter(p => p.temperature === 'hot').length, warm: prospects.filter(p => p.temperature === 'warm').length, cold: prospects.filter(p => !p.temperature || p.temperature === 'cold').length }), [prospects]);
  const followups = useMemo(() => prospects.filter(p => daysSince(p.last_contact_at) >= 14).length, [prospects]);

  async function createProspect(event: React.FormEvent) {
    event.preventDefault(); setMessage('');
    if (!organizationId || !prospecteurId) return;
    if (!form.first_name.trim() && !form.last_name.trim()) { setMessage('Le nom du prospect est obligatoire.'); return; }
    if (!form.phone.trim()) { setMessage('Le numéro de téléphone est obligatoire pour éviter les doublons.'); return; }
    const supabase = createClient();
    try {
      const phone = form.phone.trim();
      const { data: duplicate } = await supabase.from('prospects').select('id,first_name,last_name,prospecteur_id').eq('organization_id', organizationId).eq('phone', phone).limit(1).maybeSingle();
      if (duplicate) { setMessage(`Ce numéro appartient déjà à ${[duplicate.first_name, duplicate.last_name].filter(Boolean).join(' ') || 'un prospect'}. Création bloquée pour protéger le portefeuille.`); return; }
      const { error } = await supabase.from('prospects').insert({
        organization_id: organizationId,
        prospecteur_id: prospecteurId,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        temperature: form.temperature,
        status: 'new',
        desired_article_id: form.desired_article_id || null,
        estimated_amount: form.estimated_amount ? Number(form.estimated_amount) : null,
        last_contact_at: new Date().toISOString(),
        next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null,
        purchase_date_planned: form.purchase_date_planned || null,
        notes: form.notes.trim() || null,
        created_by_user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      });
      if (error) throw error;
      setShowNew(false);
      setForm({ first_name: '', last_name: '', phone: '', address: '', city: '', temperature: 'warm', desired_article_id: '', estimated_amount: '', next_follow_up_at: '', purchase_date_planned: '', notes: '' });
      await load();
      setMessage('Prospect enregistré avec succès.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Erreur de création.'); }
  }

  async function markContact(p: Prospect) {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from('prospects').update({ last_contact_at: now, next_follow_up_at: null, status: p.status === 'new' ? 'contacted' : p.status }).eq('id', p.id).eq('organization_id', organizationId).eq('prospecteur_id', prospecteurId);
    if (!error) setProspects(prev => prev.map(x => x.id === p.id ? { ...x, last_contact_at: now, next_follow_up_at: null } : x));
    else setMessage(error.message);
  }

  async function archiveColdClients() {
    // Les clients sont archivés par le moteur serveur; ce bouton ne touche pas aux prospects.
    setMessage('Le classement automatique des clients froids est exécuté côté base. Aucun prospect n’est supprimé.');
  }

  return (
    <main className="min-h-screen bg-[#0B1B3D] text-white px-4 py-5 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div><div className="text-2xl font-extrabold tracking-widest text-[#D4AF37]">JDV CRM</div><p className="text-xs text-slate-400">Espace Prospecteur · {userName}</p></div>
          <div className="flex gap-2"><button onClick={() => setShowNew(true)} className="rounded-xl bg-[#D4AF37] px-4 py-2 text-sm font-bold text-[#0B1B3D]">+ Nouveau prospect</button><button onClick={async () => { await createClient().auth.signOut(); router.replace('/terrain/login'); }} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Déconnexion</button></div>
        </header>

        {message && <div className="mb-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3 text-sm text-[#F5E17A]">{message}</div>}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Kpi label="Prospects HOT" value={counts.hot} />
          <Kpi label="Prospects WARM" value={counts.warm} />
          <Kpi label="Prospects COLD" value={counts.cold} />
          <Kpi label="À relancer ≥14 j" value={followups} />
        </section>

        <div className="flex flex-wrap gap-2 mb-5">
          {(['hot','warm','cold'] as Tab[]).map(k => <button key={k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === k ? 'bg-[#D4AF37] text-[#0B1B3D]' : 'border border-white/10 bg-white/5 text-slate-300'}`}>{LABELS[k]} · {counts[k]}</button>)}
          <button onClick={archiveColdClients} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">⚙ Automatisation</button>
          <button onClick={() => void load()} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300">↻ Actualiser</button>
        </div>

        <section className="space-y-3">
          {loading ? <div className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">Chargement...</div> : filtered.length === 0 ? <div className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">Aucun prospect dans cette catégorie.</div> : filtered.map(p => <ProspectCard key={p.id} prospect={p} article={articles.find(a => a.id === p.desired_article_id)} onContact={() => void markContact(p)} />)}
        </section>
      </div>

      {showNew && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 md:items-center md:p-4" onClick={() => setShowNew(false)}><form onSubmit={createProspect} onClick={e => e.stopPropagation()} className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border border-white/10 bg-[#0F2347] p-6">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Nouveau prospect</h2><button type="button" onClick={() => setShowNew(false)}>✕</button></div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={form.first_name} onChange={v => setForm(f => ({...f, first_name:v}))} />
          <Input label="Nom" value={form.last_name} onChange={v => setForm(f => ({...f, last_name:v}))} />
          <Input label="Téléphone *" value={form.phone} onChange={v => setForm(f => ({...f, phone:v}))} />
          <Input label="Ville" value={form.city} onChange={v => setForm(f => ({...f, city:v}))} />
          <Input label="Adresse" value={form.address} onChange={v => setForm(f => ({...f, address:v}))} />
          <Input label="Montant potentiel" type="number" value={form.estimated_amount} onChange={v => setForm(f => ({...f, estimated_amount:v}))} />
          <label className="col-span-2 text-xs text-slate-400">Article souhaité<select value={form.desired_article_id} onChange={e => setForm(f => ({...f,desired_article_id:e.target.value}))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white"><option value="">Choisir</option>{articles.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label className="col-span-2 text-xs text-slate-400">Température<select value={form.temperature} onChange={e => setForm(f => ({...f,temperature:e.target.value as Tab}))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white"><option value="hot">HOT</option><option value="warm">WARM</option><option value="cold">COLD</option></select></label>
          <Input label="Prochaine relance" type="datetime-local" value={form.next_follow_up_at} onChange={v => setForm(f => ({...f,next_follow_up_at:v}))} />
          <Input label="Achat prévu" type="date" value={form.purchase_date_planned} onChange={v => setForm(f => ({...f,purchase_date_planned:v}))} />
          <label className="col-span-2 text-xs text-slate-400">Notes<textarea value={form.notes} onChange={e => setForm(f => ({...f,notes:e.target.value}))} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white" /></label>
        </div>
        <button className="mt-5 w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-[#0B1B3D]">Enregistrer le prospect</button>
      </form></div>}
    </main>
  );
}

function Kpi({label,value}:{label:string;value:number}) { return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-2xl font-extrabold text-[#D4AF37]">{value}</div><div className="text-xs text-slate-400">{label}</div></div>; }
function Input({label,value,onChange,type='text'}:{label:string;value:string;onChange:(v:string)=>void;type?:string}) { return <label className="text-xs text-slate-400">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white" /></label>; }
function ProspectCard({prospect,article,onContact}:{prospect:Prospect;article?:Article;onContact:()=>void}) {
  const name=displayName(prospect); const days=daysSince(prospect.last_contact_at); const wa=waUrl(prospect.phone,name);
  return <article className="rounded-2xl border border-white/10 bg-[#0F2347] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{name}</h3><p className="text-sm text-slate-400">{prospect.phone || 'Téléphone non renseigné'} · {prospect.city || 'Localisation non renseignée'}</p></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[#D4AF37]">{days >= 14 ? `À relancer · ${days} j` : 'Suivi récent'}</span></div>{article && <p className="mt-3 text-sm">Article : <strong>{article.name}</strong>{article.cash_price ? ` · ${article.cash_price.toLocaleString('fr-FR')} FCFA` : ''}</p>}{prospect.notes && <p className="mt-2 text-sm text-slate-400">{prospect.notes}</p>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={onContact} className="rounded-xl border border-[#D4AF37]/30 px-3 py-2 text-xs font-bold text-[#D4AF37]">✓ Marquer contact</button>{prospect.phone && <a href={`tel:${prospect.phone}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs">📞 Appeler</a>}{wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-3 py-2 text-xs">💬 WhatsApp</a>}</div></article>;
}