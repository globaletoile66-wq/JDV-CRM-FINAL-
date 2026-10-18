# JDV CRM

**JDV CRM** est une plateforme CRM professionnelle conçue pour la gestion des ventes à crédit, du suivi des paiements journaliers, des prospecteurs terrain, des stocks, des commissions et de la relation client.

L'application est construite avec **Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS** et **Supabase**.

---

## 🚀 Technologies

* **Next.js 15** — Framework React full-stack
* **React 19** — Interface utilisateur
* **TypeScript** — Typage statique
* **Tailwind CSS 3** — Système de styles
* **Supabase** — Authentification, PostgreSQL, RLS et données temps réel
* **React Hook Form** — Gestion des formulaires
* **Recharts** — Graphiques et statistiques
* **Heroicons / Lucide React** — Icônes
* **Sonner** — Notifications
* **ESLint + Prettier** — Qualité et formatage du code

---

## 🏢 Architecture JDV CRM

JDV CRM est organisé autour de plusieurs espaces indépendants.

### 1. 🌐 Site public

Route :

```text
/
```

Le site présente JDV CRM, ses fonctionnalités, ses offres et permet à une entreprise de commencer son inscription.

---

### 2. 📱 Espace Prospecteur Terrain

Routes principales :

```text
/terrain/login
/terrain/dashboard
```

Cet espace est destiné aux prospecteurs travaillant sur le terrain.

Fonctionnalités principales :

* Connexion du prospecteur
* Tableau de bord personnel
* Enregistrement de prospects
* Enregistrement de clients
* Suivi des visites
* Relances
* Vente d'articles
* Suivi des paiements journaliers
* Consultation des commissions
* Gestion du portefeuille terrain

---

### 3. 💼 Espace Administrateur Entreprise

Routes principales :

```text
/business/login
/business/dashboard
```

Cet espace permet à l'entreprise de gérer son activité.

Fonctionnalités principales :

* Tableau de bord administratif
* Gestion des prospecteurs
* Gestion des clients
* Gestion des prospects
* Gestion des articles
* Gestion des stocks
* Transferts de stock entre entreprise et prospecteurs
* Ventes à crédit
* Paiements journaliers
* Échéanciers
* Commissions
* Statistiques
* Suivi de l'activité terrain
* Suivi financier
* Notifications
* Gestion de l'organisation

---

### 4. 🔐 Espace SUPER ADMIN / CONCEPTEUR

Routes :

```text
/hidden-concepteur-gate/login
/hidden-concepteur-gate/dashboard
```

Cet espace est volontairement masqué du parcours public.

Il est réservé au **SUPER ADMIN / CONCEPTEUR** de JDV CRM.

Fonctionnalités :

* Surveillance des organisations
* Gestion des comptes entreprises
* Activation des organisations
* Suspension des organisations
* Suivi des abonnements
* Suivi des paiements d'abonnement
* Suivi des revenus
* Gestion des membres
* Supervision globale de la plateforme

L'accès est protégé par l'authentification Supabase et par le système `super_admins`.

---

## 🗄️ Base de données

JDV CRM utilise **Supabase PostgreSQL**.

L'architecture principale repose sur :

```text
auth.users
     │
     ▼
profiles
     │
     ▼
organization_members
     │
     ▼
organizations
```

Les principales tables métier comprennent notamment :

```text
organizations
organization_members
organization_settings
profiles

prospecteurs
prospects
clients

articles
stocks
prospecteur_stocks
stock_movements

sales
payment_schedules
payments
daily_tokens

commissions
field_visits
notifications

organization_subscriptions
subscription_plans
subscription_payments

super_admins
audit_logs
```

---

## 🔐 Sécurité

JDV CRM utilise plusieurs niveaux de protection.

### Authentification

L'authentification des utilisateurs est gérée par :

```text
Supabase Authentication
```

### Isolation des organisations

Les données sont isolées par :

```text
organization_id
```

### Row Level Security

Les tables métier utilisent les politiques **RLS (Row Level Security)** de PostgreSQL afin d'empêcher un utilisateur d'accéder aux données d'une autre organisation.

### SUPER ADMIN

Les droits SUPER ADMIN sont contrôlés par la table :

```text
super_admins
```

Le simple fait d'être authentifié ne donne donc pas automatiquement les droits de SUPER ADMIN.

La vérification côté serveur s'appuie sur la fonction PostgreSQL :

```text
verify_current_super_admin()
```

Cette fonction est déclarée `SECURITY DEFINER` et n'est exécutable que par le rôle `authenticated`.

---

## 💳 Abonnements

JDV CRM prévoit un système d'abonnement pour les entreprises.

Les plans actuellement définis sont :

| Plan        |    Prix |     Durée |
| ----------- | ------: | --------: |
| Mensuel     |  50 USD |  30 jours |
| Trimestriel | 150 USD |  90 jours |
| Semestriel  | 300 USD | 180 jours |
| Annuel      | 600 USD | 365 jours |

Un système d'essai peut également être associé à une nouvelle organisation.

---

## 📦 Installation

### 1. Installer les dépendances

```bash
npm install
```

---

### 2. Configurer les variables d'environnement

Créer un fichier :

```text
.env.local
```

avec les variables nécessaires à l'application.

Exemple :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
NEXT_PUBLIC_SITE_URL=http://localhost:4028
```

> ⚠️ Les noms de ces variables doivent correspondre exactement à ceux lus dans `src/lib/supabase/client.ts`.
> Toute différence (majuscule, nom alternatif) empêche l'initialisation du client Supabase.

**Ne jamais publier les clés secrètes dans le dépôt Git.**

---

### 3. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera disponible sur :

```text
http://localhost:4028
```

---

## 🛠️ Scripts disponibles

### Développement

```bash
npm run dev
```

Lance le serveur Next.js en mode développement sur le port **4028**.

### Production

```bash
npm run build
```

Construit l'application pour la production.

```bash
npm run start
```

Lance l'application Next.js compilée en mode production sur le port **4028**.

### Vérification TypeScript

```bash
npm run type-check
```

Vérifie les erreurs TypeScript sans générer de build.

### ESLint

```bash
npm run lint
```

Analyse le code à la recherche de problèmes de qualité.

### Correction ESLint

```bash
npm run lint:fix
```

Corrige automatiquement les problèmes pouvant être corrigés par ESLint.

### Prettier

```bash
npm run format
```

Formate automatiquement le code du projet.

---

## 📁 Structure du projet

```text
jdvcrm/
│
├── public/
│   └── assets/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   │
│   │   ├── terrain/
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   │
│   │   ├── business/
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   │
│   │   ├── hidden-concepteur-gate/
│   │   │   ├── login/
│   │   │   └── dashboard/
│   │   │
│   │   └── payment-wall/
│   │
│   ├── components/
│   │
│   ├── lib/
│   │   └── supabase/
│   │       └── client.ts
│   │
│   └── styles/
│
├── middleware.ts
├── next.config.mjs
├── postcss.config.js
├── tailwind.config.js
├── package.json
├── package-lock.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .prettierignore
├── .gitignore
└── README.md
```

---

## 🎨 Identité visuelle

L'interface JDV CRM utilise principalement :

```text
Bleu nuit / bleu profond
#0B1B3D

Or métallique
#D4AF37

Blanc
#FFFFFF

Noir
#000000
```

L'objectif est de conserver une identité visuelle professionnelle, premium et adaptée aux environnements B2B.

---

## 🌍 Internationalisation

JDV CRM est conçu pour pouvoir évoluer vers une utilisation internationale.

L'architecture prévoit notamment :

* plusieurs langues ;
* plusieurs pays ;
* plusieurs devises ;
* adaptation des formats de dates ;
* adaptation des numéros de téléphone ;
* configuration par organisation.

La langue par défaut actuelle est :

```text
Français
```

---

## 🔄 Développement

Après toute modification importante du projet, il est recommandé d'exécuter :

```bash
npm run type-check
npm run lint
npm run build
```

Ces vérifications permettent de détecter les problèmes TypeScript, ESLint et Next.js avant le déploiement.

---

## 🚀 Déploiement

Pour préparer une version de production :

```bash
npm install
npm run type-check
npm run lint
npm run build
```

Puis lancer :

```bash
npm run start
```

---

## ⚠️ Sécurité

Ne jamais versionner les fichiers contenant des secrets :

```text
.env
.env.local
.env.production.local
```

Ne jamais placer une clé `service_role` ou une autre clé secrète Supabase dans le code exécuté dans le navigateur.

Les opérations nécessitant des privilèges élevés doivent être réalisées côté serveur.

---

## 📌 Règles importantes du projet

Lors des évolutions de JDV CRM :

1. Ne pas réintroduire l'ancienne architecture `users / enterprises`.
2. Utiliser `auth.users → profiles → organization_members → organizations`.
3. Utiliser `organization_id` pour l'isolation des données.
4. Ne pas supprimer les données existantes sans autorisation explicite.
5. Ne pas utiliser de comptes de démonstration à la place de l'authentification réelle.
6. Ne jamais exposer de clés secrètes côté navigateur.
7. Conserver les protections RLS.
8. Respecter la casse exacte des paquets npm (`@supabase/ssr`, `@supabase/supabase-js`).
9. Vérifier TypeScript, ESLint et le build après les modifications importantes.
10. Maintenir les espaces ADMIN, PROSPECTEUR et SUPER ADMIN séparés.
11. Ne pas réintroduire les anciennes tables supprimées de l'architecture.

---

## ❤️ JDV CRM

**JDV CRM — Gestion commerciale, crédit client et prospection terrain.**

Construit avec :

**Next.js · React · TypeScript · Tailwind CSS · Supabase**