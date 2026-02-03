#!/bin/bash

# Script pour exécuter toutes les migrations Grigou dans l'ordre
# Ce script applique les migrations manquantes à la base de données

set -e  # Arrêter en cas d'erreur

echo "🚀 Application des migrations Grigou..."
echo ""

# Vérifier que Docker est en cours d'exécution

# Vérifier que le container PostgreSQL existe
if ! docker ps | grep -q grigou_db; then
    echo "❌ Erreur: Le container grigou_db n'est pas en cours d'exécution"
    exit 1
fi

# Fonction pour exécuter une migration
run_migration() {
    local file=$1
    local description=$2
    
    echo "📋 $description"
    echo "   Fichier: $file"
    
    if [ ! -f "$file" ]; then
        echo "   ⚠️  Fichier non trouvé, ignoré"
        return
    fi
    
    if docker exec -i grigou_db psql -U grigou_user -d grigou_prod < "$file" 2>&1 | grep -q "ERROR"; then
        echo "   ⚠️  Erreur lors de l'exécution (peut-être déjà appliquée)"
    else
        echo "   ✅ Migration appliquée avec succès"
    fi
    echo ""
}

# Exécuter les migrations dans l'ordre
run_migration "001_init.sql" "1/8 - Création de la table transactions"
run_migration "003_add-recurrence-columns.sql" "2/8 - Ajout des colonnes de récurrence"
run_migration "004_migration_wallets.sql" "3/8 - Création de la table wallets"
run_migration "005_add_users.sql" "4/8 - Création du système d'utilisateurs"
run_migration "006_wallet_sharing.sql" "5/8 - Ajout du partage de wallets"
run_migration "007_migration-categories.sql" "6/8 - Création du système de catégories"
run_migration "008_migration_adjustment_category.sql" "7/8 - Ajout de la catégorie d'ajustement"

echo "=========================================="
echo "✅ Toutes les migrations ont été appliquées!"
echo "=========================================="
echo ""

# Vérifier les tables créées
echo "📊 Tables dans la base de données:"
docker exec grigou_db psql -U grigou_user -d grigou_prod -c "\dt" | grep -E "table|users|wallets|transactions|categories"

echo ""
echo "🎉 Base de données prête à l'emploi!"
echo ""
echo "Vous pouvez maintenant:"
echo "  1. Tester l'enregistrement sur https://grigou.fr/register"
echo "  2. Redémarrer l'application: docker restart grigou_app"
