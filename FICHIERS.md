# 📁 Structure du Projet Grigou

## 🎯 Fichiers Racine

### Configuration Docker
- **`docker-compose.yml`** - Configuration principale pour la production
- **`docker-compose.dev.yml`** - Configuration pour le développement local
- **`Dockerfile`** - Image Docker de l'application Next.js
- **`init.sql`** - Script d'initialisation de la base de données

### Configuration Node.js / Next.js
- **`package.json`** - Dépendances et scripts npm
- **`package-lock.json`** - Versions exactes des dépendances
- **`next.config.js`** - Configuration Next.js
- **`tsconfig.json`** - Configuration TypeScript

### Configuration Styling
- **`tailwind.config.js`** - Configuration Tailwind CSS
- **`postcss.config.js`** - Configuration PostCSS

### Documentation
- **`README.md`** - Documentation complète du projet
- **`GRIGOU.md`** - Présentation du projet
- **`QUICKSTART.md`** - Guide de démarrage rapide
- **`NEXTJS15.md`** - Informations sur Next.js 15
- **`FICHIERS.md`** - Ce fichier !

### Scripts
- **`start.sh`** - Script de lancement automatique

### Environnement
- **`.env.example`** - Exemple de variables d'environnement
- **`.gitignore`** - Fichiers à ignorer par Git

---

## 📂 Dossier `src/`

### `src/app/` - Application Next.js

#### Routes principales
- **`layout.tsx`** - Layout principal avec métadonnées
- **`page.tsx`** - Page d'accueil (interface principale)
- **`globals.css`** - Styles CSS globaux

#### Routes API (`src/app/api/`)
- **`transactions/route.ts`** - GET (liste) et POST (création) des transactions
- **`transactions/[id]/route.ts`** - DELETE d'une transaction
- **`stats/route.ts`** - GET des statistiques (revenus, dépenses, évolution)

### `src/components/` - Composants React

- **`TransactionForm.tsx`** - Formulaire d'ajout de transaction
- **`TransactionList.tsx`** - Liste et tableau des transactions
- **`BudgetChart.tsx`** - Graphiques (barres + courbe d'évolution)
- **`StatsCard.tsx`** - Cartes de statistiques (revenus, dépenses, solde)

### `src/lib/` - Utilitaires

- **`db.ts`** - Configuration et connexion PostgreSQL

---

## 🗂️ Organisation par fonctionnalité

### 🎨 Interface Utilisateur
```
src/app/page.tsx              → Page principale
src/app/layout.tsx            → Structure globale
src/app/globals.css           → Styles
src/components/*.tsx          → Composants UI
```

### 🔌 API Backend
```
src/app/api/transactions/     → CRUD transactions
src/app/api/stats/            → Calculs statistiques
src/lib/db.ts                 → Connexion BDD
```

### 🐳 Infrastructure
```
docker-compose.yml            → Orchestration services
Dockerfile                    → Build application
init.sql                      → Setup base de données
```

### ⚙️ Configuration
```
next.config.js                → Next.js
tsconfig.json                 → TypeScript
tailwind.config.js            → Tailwind CSS
package.json                  → Dépendances
```

---

## 🚀 Fichiers de démarrage

### Production (avec Docker)
1. `docker-compose.yml` → Lance app + BDD
2. `Dockerfile` → Build l'image Next.js
3. `init.sql` → Crée les tables

### Développement local
1. `docker-compose.dev.yml` → Lance uniquement la BDD
2. `npm run dev` → Lance Next.js en local
3. `.env.example` → Variables d'environnement

---

## 📊 Flux de données

```
User
  ↓
src/app/page.tsx (Interface)
  ↓
src/components/* (UI Components)
  ↓
src/app/api/* (API Routes)
  ↓
src/lib/db.ts (Database Connection)
  ↓
PostgreSQL (Database)
```

---

## 🎯 Fichiers à modifier selon vos besoins

### Pour changer le design
- `src/app/globals.css` - Styles globaux
- `src/components/*.tsx` - Composants individuels
- `tailwind.config.js` - Configuration Tailwind

### Pour changer la logique
- `src/app/api/*` - Routes API
- `src/lib/db.ts` - Gestion base de données
- `init.sql` - Structure de la base

### Pour changer la configuration
- `docker-compose.yml` - Ports, variables d'env
- `package.json` - Dépendances
- `next.config.js` - Comportement Next.js

---

**Tous les fichiers sont commentés et documentés pour faciliter la compréhension ! 📚**
