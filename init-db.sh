#!/bin/bash

# Script pour initialiser la base de données Grigou en production
# Ce script doit être exécuté une seule fois lors du premier déploiement

set -e  # Arrêter en cas d'erreur

echo "🚀 Initialisation de la base de données Grigou..."

# Vérifier que Docker est en cours d'exécution
if ! docker ps &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas en cours d'exécution"
    exit 1
fi

# Vérifier que le container PostgreSQL existe
if ! docker ps | grep -q grigou_db; then
    echo "❌ Erreur: Le container grigou_db n'est pas en cours d'exécution"
    exit 1
fi

# Copier le fichier SQL dans le container
echo "📋 Copie du script SQL dans le container..."
docker cp init-database.sql grigou_db:/tmp/init-database.sql

# Exécuter le script SQL
echo "⚙️  Exécution du script d'initialisation..."
docker exec grigou_db psql -U grigou_user -d grigou_prod -f /tmp/init-database.sql

# Nettoyer
echo "🧹 Nettoyage..."
docker exec grigou_db rm /tmp/init-database.sql

echo "✅ Base de données initialisée avec succès!"
echo ""
echo "Vous pouvez maintenant:"
echo "  1. Tester l'enregistrement d'un utilisateur sur https://grigou.fr/register"
echo "  2. Redémarrer l'application si nécessaire: docker restart grigou_app"
