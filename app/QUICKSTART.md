# 🚀 Démarrage Rapide

## En 3 étapes simples :

### 1️⃣ Lancer l'application

```bash
docker-compose up --build
```

### 2️⃣ Ouvrir votre navigateur

Allez sur : **http://localhost:3000**

### 3️⃣ C'est tout ! 🎉

L'application est prête avec des données d'exemple.

---

## ⚡ Script de démarrage automatique

Vous pouvez aussi utiliser le script :

```bash
./start.sh
```

---

## 📝 Commandes utiles

### Arrêter l'application
```bash
docker-compose down
```

### Voir les logs
```bash
docker-compose logs -f
```

### Redémarrer
```bash
docker-compose restart
```

### Supprimer tout (y compris les données)
```bash
docker-compose down -v
```

---

## 🐛 Problèmes courants

### Port 3000 déjà utilisé ?
Modifiez le port dans `docker-compose.yml` :
```yaml
ports:
  - "3001:3000"  # Utilisez 3001 à la place
```

### Port 5432 déjà utilisé ?
Modifiez le port PostgreSQL dans `docker-compose.yml` :
```yaml
ports:
  - "5433:5432"  # Utilisez 5433 à la place
```

### Les conteneurs ne démarrent pas ?
```bash
# Nettoyez tout et recommencez
docker-compose down -v
docker-compose up --build
```

---

## 🎯 Prochaines étapes

1. Explorez l'interface
2. Ajoutez vos propres transactions
3. Changez les périodes pour voir l'évolution
4. Personnalisez les catégories selon vos besoins

Bon budget ! 💰
