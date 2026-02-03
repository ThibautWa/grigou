# 💰 Grigou - Gestionnaire de Budget

Application web de gestion de budget personnel développée avec Next.js 15 et PostgreSQL, entièrement dockerisée.

## 🚀 Fonctionnalités

- ✅ Ajout de revenus et dépenses
- 📊 Visualisation graphique de l'évolution du budget
- 📅 Filtrage par période (passé et futur)
- 📈 Statistiques détaillées (revenus, dépenses, solde)
- 🗂️ Catégorisation des transactions
- 📱 Interface responsive

## 📋 Prérequis

- Docker
- Docker Compose

## 🛠️ Installation et Lancement

1. **Cloner le projet** (ou créer les fichiers)

2. **Lancer l'application avec Docker Compose** :

```bash
docker-compose up --build
```

3. **Accéder à l'application** :

Ouvrez votre navigateur à l'adresse : [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

```
grigou/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── stats/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionList.tsx
│   │   ├── BudgetChart.tsx
│   │   └── StatsCard.tsx
│   └── lib/
│       └── db.ts
├── docker-compose.yml
├── Dockerfile
├── init.sql
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.js
```

## 🗄️ Base de Données

La base de données PostgreSQL est automatiquement initialisée avec :
- Une table `transactions` pour stocker les revenus et dépenses
- Des données d'exemple pour tester l'application

### Schéma de la table `transactions` :

| Colonne       | Type          | Description                    |
|---------------|---------------|--------------------------------|
| id            | SERIAL        | Identifiant unique             |
| type          | VARCHAR(10)   | 'income' ou 'outcome'          |
| amount        | DECIMAL(10,2) | Montant de la transaction      |
| description   | TEXT          | Description de la transaction  |
| category      | VARCHAR(100)  | Catégorie (optionnel)          |
| date          | DATE          | Date de la transaction         |
| created_at    | TIMESTAMP     | Date de création               |
| updated_at    | TIMESTAMP     | Date de modification           |

## 🔧 Configuration

### Variables d'environnement

Les variables sont configurées dans le `docker-compose.yml` :

- **DATABASE_URL** : URL de connexion PostgreSQL
- **POSTGRES_USER** : Utilisateur de la base de données (par défaut: `grigou_user`)
- **POSTGRES_PASSWORD** : Mot de passe (par défaut: `grigou_password`)
- **POSTGRES_DB** : Nom de la base de données (par défaut: `grigou_db`)

## 📊 Utilisation

1. **Ajouter une transaction** :
   - Sélectionnez le type (Revenu ou Dépense)
   - Entrez le montant, la description, et optionnellement une catégorie
   - Choisissez la date
   - Cliquez sur "Ajouter la transaction"

2. **Visualiser l'évolution** :
   - Utilisez les filtres de période pour voir le passé ou le futur
   - Les graphiques se mettent à jour automatiquement
   - Le solde cumulé montre l'évolution dans le temps

3. **Gérer les transactions** :
   - Consultez l'historique dans la liste
   - Supprimez les transactions si nécessaire

## 🛑 Arrêter l'application

```bash
docker-compose down
```

Pour supprimer également les volumes (données) :

```bash
docker-compose down -v
```

## 🔄 Développement

Pour développer en mode local (avec hot-reload) :

```bash
# Installer les dépendances
npm install

# Lancer en mode développement avec Turbopack
npm run dev
```

Assurez-vous que PostgreSQL est en cours d'exécution :

```bash
docker-compose up db
```

## 📝 Technologies Utilisées

- **Next.js 15** - Framework React avec Turbopack
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **PostgreSQL 15** - Base de données
- **Tailwind CSS** - Styling
- **Recharts** - Graphiques
- **Docker & Docker Compose** - Containerisation

## 📄 Licence

Ce projet est libre d'utilisation.

---

Développé avec ❤️ pour une gestion budgétaire simplifiée
