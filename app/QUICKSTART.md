# 🚀 Démarrage rapide (environnement local)

L'environnement local utilise **la même image Docker que la prod** (`docker/Dockerfile.prod`)
avec une base PostgreSQL locale. Toutes les commandes se lancent **depuis la racine du dépôt**.

## Prérequis

- Docker avec le plugin `docker compose` (v2)
- Un fichier `app/.env.local` (SMTP, `NEXTAUTH_SECRET`, …)

## Lancer

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Puis ouvrir **http://localhost:3000**.

Au premier lancement (volume vide), la base est créée à partir de `docker/local-init/` :
schéma de la prod + catégories système, sans aucune donnée utilisateur.

> Le volume `git_postgres_data` est déclaré `external`. S'il n'existe pas encore :
> `docker volume create git_postgres_data`

## Développement avec hot reload

```bash
docker compose -f docker-compose.local.yml up -d db   # base de données seule
cd app && npm install && npm run dev                   # http://localhost:3000
```

`app/.env.local` doit alors contenir
`DATABASE_URL=postgresql://grigou_user:grigou_password@localhost:5432/grigou_db`.

## Commandes utiles

```bash
docker compose -f docker-compose.local.yml logs -f app   # logs
docker compose -f docker-compose.local.yml ps            # état
docker compose -f docker-compose.local.yml down          # arrêter (données conservées)
docker exec -it grigou_local_db psql -U grigou_user -d grigou_db   # console SQL
```

Réinitialiser la base (⚠️ supprime toutes les données locales) :

```bash
docker compose -f docker-compose.local.yml down
docker volume rm git_postgres_data && docker volume create git_postgres_data
docker compose -f docker-compose.local.yml up -d --build
```

## Problèmes courants

- **Port 3000 ou 5432 déjà utilisé** : une autre stack tourne (`docker ps`).
  Arrêtez-la, ou changez le port hôte dans `docker-compose.local.yml`
  (`"127.0.0.1:3001:3000"`).
- **`/api/health` renvoie 307** : normal, le middleware d'authentification redirige
  vers `/login`. C'est pareil en prod.
- **Dossiers vides `src/`, `public/`, `init.sql/` appartenant à `root` à la racine** :
  restes de l'ancienne configuration (Docker crée les bind mounts manquants).
  Supprimez-les avec `docker run --rm -v "$PWD":/w alpine rmdir /w/src /w/public /w/init.sql`.
