#!/bin/bash

echo "🚀 Démarrage de Grigou..."
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Construire et lancer les conteneurs
echo "📦 Construction et lancement des conteneurs..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

echo ""
echo "✅ Grigou est prêt !"
echo ""
echo "🌐 Accédez à l'application : http://localhost:3000"
echo ""
echo "📊 Base de données PostgreSQL : localhost:5432"
echo "   Utilisateur : grigou_user"
echo "   Base de données : grigou_db"
echo ""
echo "🛑 Pour arrêter l'application : docker-compose down"
echo ""
