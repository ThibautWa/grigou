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

Depuis la racine du dépôt :

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Puis ouvrez [http://localhost:3000](http://localhost:3000).

Détails, hot reload et dépannage : voir [QUICKSTART.md](QUICKSTART.md).

## 🏗️ Architecture

```
grigou/                        (racine du dépôt)
├── app/                       Application Next.js (src/, public/, migrations/)
├── docker/
│   ├── Dockerfile.prod        Image utilisée en prod ET en local
│   ├── local-init/            Initialisation d'une base locale vide
│   └── grigou.conf, nginx.conf  Configuration nginx de la prod
├── docker-compose.local.yml   Environnement local
├── docker-compose.prod.yml    Production (serveur)
└── .github/workflows/         CI/CD (déploiement automatique sur main)
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

En local, les variables sont lues depuis `app/.env.local` (voir `docker-compose.local.yml`) :

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
docker compose -f docker-compose.local.yml down
```

## 🔄 Développement

Hot reload : lancez uniquement la base, puis le serveur de dev Next.js :

```bash
docker compose -f docker-compose.local.yml up -d db
cd app && npm install && npm run dev
```

## 📝 Technologies Utilisées

- **Next.js 15** - Framework React avec Turbopack
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **PostgreSQL 16** (prod) / 15 (local) - Base de données
- **Tailwind CSS** - Styling
- **Recharts** - Graphiques
- **Docker & Docker Compose** - Containerisation

## 📄 Licence

Ce projet est libre d'utilisation.

---

Développé avec ❤️ pour une gestion budgétaire simplifiée
