# 🔧 Dépannage - Grigou

## ✅ Résolution du problème Docker Compose

### Problème rencontré
```
failed to read dockerfile: open Dockerfile: no such file or directory
```

### ✅ Solution
Le **Dockerfile** était manquant. Il a été ajouté au projet !

### ⚠️ Warning résolu
```
the attribute `version` is obsolete
```

La ligne `version: '3.8'` a été retirée des fichiers docker-compose.yml (obsolète depuis Docker Compose v2).

---

## 📋 Checklist avant de lancer

Assurez-vous d'avoir ces fichiers dans votre dossier :

```bash
grigou/
├── Dockerfile                  ✅ (IMPORTANT!)
├── .dockerignore              ✅
├── docker-compose.yml         ✅
├── docker-compose.dev.yml     ✅
├── init.sql                   ✅
├── package.json               ✅
├── package-lock.json          ✅
├── next.config.js             ✅
├── tsconfig.json              ✅
├── tailwind.config.js         ✅
├── postcss.config.js          ✅
├── .gitignore                 ✅
├── .env.example               ✅
└── src/                       ✅
    ├── app/
    ├── components/
    └── lib/
```

---

## 🚀 Commandes de démarrage

### 1️⃣ Première fois
```bash
cd grigou
docker compose up --build
```

### 2️⃣ Démarrages suivants
```bash
docker compose up
```

### 3️⃣ Arrêter l'application
```bash
docker compose down
```

### 4️⃣ Nettoyer complètement (données incluses)
```bash
docker compose down -v
```

---

## 🐛 Problèmes courants

### Port 3000 déjà utilisé
```bash
# Modifier dans docker-compose.yml
ports:
  - "3001:3000"  # Utiliser le port 3001
```

### Port 5432 (PostgreSQL) déjà utilisé
```bash
# Modifier dans docker-compose.yml
ports:
  - "5433:5432"  # Utiliser le port 5433
```

### Erreur de build npm
```bash
# Nettoyer et recommencer
docker compose down -v
rm -rf node_modules package-lock.json
docker compose up --build
```

### Les conteneurs ne se lancent pas
```bash
# Voir les logs
docker compose logs -f

# Vérifier l'état
docker compose ps
```

### Base de données ne répond pas
```bash
# Attendre que la DB soit prête
docker compose logs db

# Vous devriez voir :
# "database system is ready to accept connections"
```

---

## 🔍 Vérifications utiles

### Vérifier que Docker fonctionne
```bash
docker --version
docker compose version
```

### Vérifier les conteneurs en cours
```bash
docker ps
```

### Vérifier les logs en temps réel
```bash
docker compose logs -f app
docker compose logs -f db
```

### Se connecter à PostgreSQL
```bash
docker exec -it grigou_postgres psql -U grigou_user -d grigou_db
```

---

## 💡 Astuces

### Mode développement (sans Docker)
```bash
# 1. Lancer uniquement la base de données
docker compose -f docker-compose.dev.yml up

# 2. Dans un autre terminal
npm install
npm run dev
```

### Rebuild complet
```bash
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Voir l'utilisation disque
```bash
docker system df
```

### Nettoyer Docker
```bash
# Supprimer les images non utilisées
docker image prune

# Nettoyer complètement (ATTENTION!)
docker system prune -a
```

---

## 📞 Besoin d'aide ?

1. Vérifiez que tous les fichiers sont présents
2. Lisez les logs : `docker compose logs`
3. Vérifiez les ports disponibles
4. Essayez un rebuild complet

Si le problème persiste, partagez les logs complets de `docker compose up --build` !

---

**Grigou devrait maintenant fonctionner parfaitement ! 🎉**
