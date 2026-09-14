'use client';

import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

import {
  Smartphone,
  Building2,
  Crown,
  ChevronRight,
  CheckCircle2,
  Coins,
  BarChart3,
  Users,
  Shield,
  ArrowLeft,
  BookOpen,
  LogIn,
  ClipboardList,
  TrendingUp,
  Settings,
  Bell,
  Package,
  Database,
  LockKeyhole,
} from 'lucide-react';

const sections = [
  {
    id: 'prospecteur',
    icon: Smartphone,
    color: '#3B82F6',
    colorBg: 'rgba(59,130,246,0.1)',
    colorBorder: 'rgba(59,130,246,0.25)',
    title: 'Prospecteur Terrain',
    subtitle: 'Application Mobile — Flux de Travail Quotidien',
    badge: 'Rôle : Prospecteur',

    intro:
      "Le prospecteur terrain est l'agent commercial de première ligne. Il utilise l'application JDV CRM depuis son téléphone pour enregistrer ses ventes, suivre ses jetons, consulter ses performances et gérer son activité quotidienne. Son accès est strictement limité aux données et fonctionnalités qui lui sont attribuées.",

    steps: [
      {
        num: '01',
        title: 'Connexion au Portail Terrain',
        icon: LogIn,
        desc:
          "Accédez à l'application via /terrain/login avec vos identifiants fournis par votre administrateur entreprise. Votre compte est rattaché à votre profil prospecteur et à l'entreprise à laquelle vous appartenez.",

        tips: [
          'Votre accès est lié à votre compte utilisateur authentifié',
          'Votre rôle détermine automatiquement les fonctionnalités accessibles',
          "Contactez votre administrateur en cas de problème d\'accès",
        ],
      },

      {
        num: '02',
        title: 'Tableau de Bord Personnel',
        icon: BarChart3,
        desc:
          "Votre tableau de bord affiche vos indicateurs personnels : ventes réalisées aujourd'hui, jetons disponibles, commissions, objectif journalier et progression. Les données sont actualisées automatiquement lorsque l'activité évolue.",

        tips: [
          "Consultez votre progression vers l'objectif quotidien",
          'Les informations affichées concernent uniquement votre activité',
          'Les nouvelles ventes apparaissent automatiquement',
        ],
      },

      {
        num: '03',
        title: "Enregistrement d\'une Vente",
        icon: ClipboardList,
        desc:
          "Utilisez le formulaire de saisie rapide pour enregistrer une vente. Sélectionnez l'article, renseignez le client et les informations nécessaires, puis validez. La vente est enregistrée dans la base JDV CRM et devient immédiatement disponible pour le suivi de l'activité.",

        tips: [
          'Chaque vente est associée au prospecteur connecté',
          'Les ventes sont horodatées automatiquement',
          'Les informations client peuvent être enregistrées dans le CRM',
        ],
      },

      {
        num: '04',
        title: 'Suivi des Performances',
        icon: TrendingUp,
        desc:
          "Suivez votre activité commerciale grâce aux indicateurs disponibles dans votre espace : évolution des ventes, commissions, jetons et progression vers vos objectifs.",

        tips: [
          'Analysez votre activité quotidienne',
          'Suivez votre évolution commerciale',
          'Les commissions sont liées aux ventes enregistrées selon les règles configurées',
        ],
      },
    ],

    capabilities: [
      'Enregistrement des ventes en temps réel',
      'Suivi des ventes personnelles',
      'Suivi des jetons quotidiens',
      'Suivi des commissions',
      'Progression vers l’objectif journalier',
      'Historique personnel des ventes',
      'Accès strictement limité aux données autorisées',
      'Synchronisation avec le portail entreprise',
    ],
  },

  {
    id: 'admin',
    icon: Building2,
    color: '#D4AF37',
    colorBg: 'rgba(212,175,55,0.1)',
    colorBorder: 'rgba(212,175,55,0.25)',
    title: 'Administrateur Entreprise',
    subtitle: "Portail Web — Gestion de l\'Entreprise",
    badge: 'Rôle : Administrateur',

    intro:
      "L'administrateur entreprise pilote l'activité de sa société depuis le portail web JDV CRM. Il gère les prospecteurs, les clients, les articles, les stocks, les ventes, les jetons, les commissions et les indicateurs commerciaux. Toutes les données sont isolées au niveau de l'organisation.",

    steps: [
      {
        num: '01',
        title: 'Accès au Portail Entreprise',
        icon: LogIn,
        desc:
          "Connectez-vous via /business/login avec votre compte administrateur. Après authentification, JDV CRM vérifie votre appartenance à une organisation et votre rôle business_admin avant de vous donner accès au tableau de bord.",

        tips: [
          "Votre compte doit être membre actif de l'organisation",
          "L\'accès dépend également du statut de l\'abonnement de l\'entreprise",
          "Une organisation suspendue peut bloquer l\'accès à ses utilisateurs",
        ],
      },

      {
        num: '02',
        title: "Tableau de Bord de l\'Entreprise",
        icon: BarChart3,
        desc:
          "Le tableau de bord présente une vue globale de l'activité de votre organisation : ventes, paiements, jetons, commissions, stocks, prospecteurs et tendances commerciales.",

        tips: [
          "Les données sont filtrées par organization_id",
          'Les informations des autres entreprises ne sont pas accessibles',
          'Les indicateurs peuvent être actualisés en temps réel',
        ],
      },

      {
        num: '03',
        title: 'Gestion des Prospecteurs',
        icon: Users,
        desc:
          "Gérez les membres de votre équipe terrain, consultez leur activité et suivez leurs performances. Chaque prospecteur est rattaché à son organisation et possède un accès limité à ses propres opérations.",

        tips: [
          'Suivez les performances individuelles',
          'Contrôlez les accès des membres de votre équipe',
          'Consultez les ventes associées à chaque prospecteur',
        ],
      },

      {
        num: '04',
        title: 'Distribution des Jetons & Gestion du Stock',
        icon: Coins,
        desc:
          "Gérez les jetons quotidiens attribués aux prospecteurs et surveillez les mouvements de stock. JDV CRM permet de suivre les entrées, sorties et niveaux disponibles afin de conserver une traçabilité commerciale.",

        tips: [
          'Suivez les mouvements de stock',
          'Contrôlez les quantités disponibles',
          'Suivez les jetons distribués et utilisés',
          'Identifiez rapidement les niveaux de stock faibles',
        ],
      },

      {
        num: '05',
        title: 'Rapports & Commissions',
        icon: TrendingUp,
        desc:
          "Analysez les ventes réalisées par votre équipe et consultez les commissions générées. Les données peuvent servir au suivi commercial, au contrôle interne et à la préparation de la comptabilité.",

        tips: [
          'Les commissions sont associées aux ventes selon le barème configuré',
          'Suivez les performances par prospecteur',
          'Analysez les résultats commerciaux de votre organisation',
        ],
      },
    ],

    capabilities: [
      "Vue complète des KPIs de l\'organisation",
      'Gestion des prospecteurs',
      'Gestion des clients et prospects',
      'Gestion des articles',
      'Gestion et traçabilité du stock',
      'Gestion des ventes',
      'Suivi des paiements',
      'Gestion des jetons quotidiens',
      'Suivi des commissions',
      'Notifications et alertes',
      "Isolation complète des données de l'organisation",
    ],
  },

  {
    id: 'superadmin',
    icon: Crown,
    color: '#A855F7',
    colorBg: 'rgba(168,85,247,0.1)',
    colorBorder: 'rgba(168,85,247,0.25)',
    title: 'Super Admin — Concepteur',
    subtitle: 'Portail Système — Gestion Globale de JDV CRM',
    badge: 'Rôle : SUPER ADMIN',

    intro:
      "Le SUPER ADMIN est le niveau de contrôle global de la plateforme JDV CRM. Il est réservé au concepteur/opérateur autorisé de la plateforme. Il permet de superviser les organisations clientes, les abonnements, les paiements et l'état général du système. Ce portail est volontairement séparé des portails Terrain et Entreprise.",

    steps: [
      {
        num: '01',
        title: 'Accès au Portail Concepteur',
        icon: Shield,
        desc:
          "L'accès s'effectue via /hidden-concepteur-gate/login. Cette route est volontairement dissimulée de la navigation publique. L'accès dépend de l'authentification et de la présence d'un compte autorisé dans le système SUPER ADMIN.",

        tips: [
          'Le portail ne doit pas être accessible aux prospecteurs',
          'Les administrateurs entreprise ne disposent pas des droits SUPER ADMIN',
          'Les opérations sensibles doivent être protégées par les règles de sécurité Supabase',
          'Les actions importantes doivent pouvoir être auditées',
        ],
      },

      {
        num: '02',
        title: 'Registre des Organisations',
        icon: Building2,
        desc:
          "Le SUPER ADMIN peut consulter les organisations enregistrées sur la plateforme : nom, responsable, statut, abonnement, plan souscrit, dates importantes et informations nécessaires à la supervision du service.",

        tips: [
          'Recherche par organisation',
          'Filtrage par statut',
          'Suivi du plan d’abonnement',
          'Suivi du nombre de membres',
        ],
      },

      {
        num: '03',
        title: 'Activation & Suspension',
        icon: Settings,
        desc:
          "Le SUPER ADMIN contrôle le statut opérationnel des organisations. Il peut notamment superviser les organisations en attente, actives ou suspendues et gérer leur accès conformément aux règles commerciales de la plateforme.",

        tips: [
          'Les changements de statut doivent être contrôlés',
          'Les opérations sensibles doivent être journalisées',
          'La suspension d’une organisation peut empêcher ses utilisateurs d’utiliser le service',
        ],
      },

      {
        num: '04',
        title: 'Abonnements & Paiements',
        icon: Coins,
        desc:
          "Le portail concepteur permet de superviser les plans d\'abonnement et les paiements associés aux organisations clientes. JDV CRM utilise les plans configurés dans subscription_plans ainsi que les souscriptions et paiements associés.",

        tips: [
          'Suivi des abonnements actifs',
          'Suivi des expirations',
          'Suivi des paiements',
          'Suivi des références de paiement',
          'Supervision des revenus de la plateforme',
        ],
      },

      {
        num: '05',
        title: 'Surveillance Globale',
        icon: Bell,
        desc:
          "Le SUPER ADMIN dispose d'une vision globale de la plateforme : organisations, abonnements, activité commerciale, paiements et événements importants. Cette vue est distincte des données opérationnelles propres à chaque entreprise.",

        tips: [
          'Surveillance des organisations',
          'Suivi des abonnements',
          'Suivi des revenus',
          'Consultation des événements importants',
          'Audit des opérations sensibles',
        ],
      },
    ],

    capabilities: [
      'Supervision globale de la plateforme',
      'Gestion des organisations clientes',
      'Supervision des abonnements',
      'Supervision des paiements',
      'Activation et suspension des organisations',
      'Suivi des revenus de la plateforme',
      'Consultation des journaux d’audit',
      'Surveillance globale du système',
      'Accès réservé au SUPER ADMIN autorisé',
      'Isolation complète des portails opérationnels',
    ],
  },
];

export default function GuideOnboardingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 glass-panel border-b border-primary/15 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Retour</span>
            </Link>

            <div className="h-5 w-px bg-border" />

            <div className="flex items-center gap-3">
              <AppLogo size={28} />

              <span className="font-sans text-base font-700 tracking-tight text-foreground">
                JDV <span className="gold-gradient-text">CRM</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />

            <span className="text-sm font-600 text-foreground">
              Guide d&apos;Intégration
            </span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-16 px-6 text-center border-b border-border bg-secondary/20">
        <div className="max-w-screen-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
            <span className="text-xs font-600 text-primary tracking-widest uppercase">
              Documentation Officielle
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-700 text-foreground mb-4">
            Guide d&apos;Intégration{' '}
            <span className="gold-gradient-text">JDV CRM</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Comprendre les trois niveaux d&apos;accès de la plateforme,
            leurs responsabilités et leurs flux de travail pour une
            utilisation rapide, sécurisée et efficace.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            {sections?.map((section) => (
              <a
                key={section?.id}
                href={`#${section?.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-150 hover:border-primary/40 hover:text-primary text-sm font-500 text-muted-foreground"
                style={{
                  borderColor: section?.colorBorder,
                  background: section?.colorBg,
                }}
              >
                <section.icon
                  size={14}
                  style={{ color: section?.color }}
                />

                <span style={{ color: section?.color }}>
                  {section?.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <div className="max-w-screen-xl mx-auto px-6 py-16 space-y-24">
        {sections?.map((section) => (
          <section
            key={section?.id}
            id={section?.id}
            className="scroll-mt-24"
          >
            {/* SECTION HEADER */}
            <div className="flex items-start gap-6 mb-12">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: section?.colorBg,
                  border: `1px solid ${section?.colorBorder}`,
                }}
              >
                <section.icon
                  size={28}
                  style={{ color: section?.color }}
                />
              </div>

              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-600 mb-2"
                  style={{
                    background: section?.colorBg,
                    color: section?.color,
                    border: `1px solid ${section?.colorBorder}`,
                  }}
                >
                  {section?.badge}
                </div>

                <h2 className="text-3xl font-700 text-foreground mb-1">
                  {section?.title}
                </h2>

                <p className="text-sm font-500 text-muted-foreground">
                  {section?.subtitle}
                </p>
              </div>
            </div>

            {/* INTRO */}
            <div
              className="rounded-xl p-6 mb-10"
              style={{
                background: section?.colorBg,
                border: `1px solid ${section?.colorBorder}`,
              }}
            >
              <p className="text-sm text-foreground leading-relaxed">
                {section?.intro}
              </p>
            </div>

            {/* STEPS */}
            <div className="mb-12">
              <h3 className="text-lg font-600 text-foreground mb-6 flex items-center gap-2">
                <ChevronRight
                  size={18}
                  className="text-primary"
                />

                Flux de Travail Étape par Étape
              </h3>

              <div className="space-y-4">
                {section?.steps?.map((step, index) => (
                  <div
                    key={`${section?.id}-step-${index}`}
                    className="flex gap-6 p-6 rounded-xl bg-card border border-border hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-800 font-mono-data"
                        style={{
                          background: section?.colorBg,
                          color: section?.color,
                          border: `1px solid ${section?.colorBorder}`,
                        }}
                      >
                        {step?.num}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <step.icon
                          size={16}
                          style={{ color: section?.color }}
                        />

                        <h4 className="text-base font-600 text-foreground">
                          {step?.title}
                        </h4>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {step?.desc}
                      </p>

                      {step?.tips?.length > 0 && (
                        <div className="space-y-1">
                          {step?.tips?.map((tip, tipIndex) => (
                            <div
                              key={`tip-${tipIndex}`}
                              className="flex items-start gap-2"
                            >
                              <CheckCircle2
                                size={12}
                                className="text-success mt-0.5 flex-shrink-0"
                              />

                              <span className="text-xs text-muted-foreground">
                                {tip}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CAPABILITIES */}
            <div>
              <h3 className="text-lg font-600 text-foreground mb-6 flex items-center gap-2">
                <Package
                  size={18}
                  className="text-primary"
                />

                Capacités &amp; Accès
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section?.capabilities?.map((capability, index) => (
                  <div
                    key={`${section?.id}-cap-${index}`}
                    className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border"
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: section?.colorBg,
                      }}
                    >
                      <CheckCircle2
                        size={11}
                        style={{
                          color: section?.color,
                        }}
                      />
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {capability}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {section?.id !== 'superadmin' && (
              <div className="mt-16 h-px bg-border" />
            )}
          </section>
        ))}

        {/* ARCHITECTURE */}
        <section className="rounded-2xl p-8 bg-card border border-primary/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Database
                size={20}
                className="text-primary"
              />

              <LockKeyhole
                size={20}
                className="text-primary"
              />
            </div>

            <h2 className="text-2xl font-700 text-foreground mb-2">
              Architecture des Portails
            </h2>

            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Trois portails spécialisés avec séparation des rôles,
              authentification et isolation des données au niveau de
              Supabase.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Portail Terrain',
                url: '/terrain/login',
                color: '#3B82F6',
                icon: Smartphone,
                desc:
                  'Application mobile dédiée aux prospecteurs terrain.',
              },
              {
                title: 'Portail Entreprise',
                url: '/business/login',
                color: '#D4AF37',
                icon: Building2,
                desc:
                  "Portail web destiné aux administrateurs d'organisation.",
              },
              {
                title: 'Portail Concepteur',
                url: '/hidden-concepteur-gate/login',
                color: '#A855F7',
                icon: Crown,
                desc:
                  'Portail global réservé au SUPER ADMIN autorisé.',
              },
            ]?.map((portal) => (
              <div
                key={portal?.url}
                className="rounded-xl p-5 border"
                style={{
                  background: `${portal?.color}08`,
                  borderColor: `${portal?.color}30`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <portal.icon
                    size={20}
                    style={{ color: portal?.color }}
                  />

                  <span className="text-sm font-600 text-foreground">
                    {portal?.title}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {portal?.desc}
                </p>

                <code
                  className="text-xs font-mono px-2 py-1 rounded"
                  style={{
                    background: `${portal?.color}15`,
                    color: portal?.color,
                  }}
                >
                  {portal?.url}
                </code>
              </div>
            ))}
          </div>

          {/* DATA ISOLATION */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: Shield,
                title: 'Sécurité',
                text: 'Authentification et contrôle des rôles.',
              },
              {
                icon: Database,
                title: 'Isolation',
                text: 'Données séparées par organisation.',
              },
              {
                icon: LockKeyhole,
                title: 'RLS Supabase',
                text: 'Protection des données côté base.',
              },
            ]?.map((item) => (
              <div
                key={item?.title}
                className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-border"
              >
                <item.icon
                  size={18}
                  className="text-primary flex-shrink-0"
                />

                <div>
                  <div className="text-xs font-700 text-foreground">
                    {item?.title}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {item?.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <p className="text-muted-foreground mb-6">
            Prêt à démarrer avec JDV CRM ?
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-md gold-gradient-bg text-primary-foreground font-600 text-sm hover:opacity-90 transition-all duration-150"
            >
              Enregistrer mon entreprise
              <ChevronRight size={16} />
            </Link>

            <Link
              href="/business/login"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-md border border-border text-foreground font-500 text-sm hover:border-primary/40 hover:text-primary transition-all duration-200"
            >
              Connexion Portail Client
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}