'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SUPER_ADMIN_DASHBOARD_ROUTE } from '@/lib/auth/super-admin';

export default function ConcepteurLoginPage() {
  const router = useRouter();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setError('');setLoading(true);const supabase=createClient();try{
    const {data,error:authError}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
    if(authError||!data.user) throw new Error(authError?.message||'Authentification impossible.');
    const {data:verified,error:verifyError}=await supabase.rpc('verify_current_super_admin');
    if(verifyError) throw new Error(`Vérification SUPER ADMIN impossible : ${verifyError.message}`);
    const row=Array.isArray(verified)?verified[0]:verified;
    if(!row?.is_super_admin){await supabase.auth.signOut();throw new Error('Accès refusé : ce compte n’est pas SUPER ADMIN.');}
    router.replace(SUPER_ADMIN_DASHBOARD_ROUTE);
  }catch(err){setError(err instanceof Error?err.message:'Erreur de connexion.');setLoading(false);}}
  return <main className="min-h-screen flex items-center justify-center bg-black px-4"><form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[#D4AF37]/20 bg-[#050A14] p-8 shadow-2xl"><div className="text-center mb-8"><div className="text-3xl font-extrabold tracking-[.25em] text-[#D4AF37]">JDV CRM</div><p className="mt-2 text-xs uppercase tracking-[.35em] text-slate-500">Portail CONCEPTEUR</p></div><div className="space-y-4"><label className="block text-sm text-slate-300">Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label><label className="block text-sm text-slate-300">Mot de passe<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>{error&&<div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}<button disabled={loading} className="w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-[#0B1B3D] disabled:opacity-50">{loading?'Vérification...':'Accéder au centre CONCEPTEUR'}</button></div><p className="mt-6 text-center text-xs text-slate-500">L’autorisation est vérifiée par Supabase. Aucun UID n’est codé en dur dans l’interface.</p></form></main>;
}