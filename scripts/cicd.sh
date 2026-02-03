#!/bin/bash

# ==============================================================================
# CI/CD Helper Script
# ==============================================================================
# Script d'aide pour les opérations CI/CD courantes
# Usage: ./cicd.sh [command]
# ==============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (à adapter)
VPS_USER="${VPS_USER:-deploy}"
VPS_HOST="${VPS_HOST:-}"
APP_DIR="${APP_DIR:-/opt/app/grigou}"

# ==============================================================================
# Fonctions d'affichage
# ==============================================================================

print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================================================
# Vérifications
# ==============================================================================

check_config() {
    if [ -z "$VPS_HOST" ]; then
        print_error "VPS_HOST non configuré"
        echo "Définissez la variable: export VPS_HOST=votre-vps.com"
        exit 1
    fi
}

check_ssh() {
    check_config
    print_info "Vérification de la connexion SSH..."
    if ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "exit" 2>/dev/null; then
        print_success "Connexion SSH OK"
        return 0
    else
        print_error "Impossible de se connecter au VPS"
        exit 1
    fi
}

# ==============================================================================
# Commandes Git
# ==============================================================================

cmd_feature() {
    local feature_name="$1"
    
    if [ -z "$feature_name" ]; then
        print_error "Usage: ./cicd.sh feature <nom>"
        exit 1
    fi
    
    print_header "Création de la branche feature/$feature_name"
    
    git checkout develop
    git pull origin develop
    git checkout -b "feature/$feature_name"
    
    print_success "Branche feature/$feature_name créée"
    print_info "Développez votre feature, puis:"
    echo "  git add ."
    echo "  git commit -m 'feat: description'"
    echo "  git push origin feature/$feature_name"
}

cmd_hotfix() {
    local fix_name="$1"
    
    if [ -z "$fix_name" ]; then
        print_error "Usage: ./cicd.sh hotfix <nom>"
        exit 1
    fi
    
    print_header "Création de la branche hotfix/$fix_name"
    
    git checkout main
    git pull origin main
    git checkout -b "hotfix/$fix_name"
    
    print_success "Branche hotfix/$fix_name créée"
    print_warning "Corrigez le bug, puis push pour déploiement automatique"
}

cmd_release() {
    local version="$1"
    
    if [ -z "$version" ]; then
        print_error "Usage: ./cicd.sh release <version>"
        echo "Example: ./cicd.sh release 1.2.0"
        exit 1
    fi
    
    # Vérifier le format de version
    if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Format de version invalide. Utilisez: X.Y.Z"
        exit 1
    fi
    
    print_header "Création de la release v$version"
    
    git checkout main
    git pull origin main
    
    print_info "Création du tag v$version..."
    git tag -a "v$version" -m "Release version $version"
    
    print_info "Push du tag..."
    git push origin "v$version"
    
    print_success "Release v$version créée !"
    print_info "Le workflow GitHub va automatiquement:"
    echo "  1. Build et tests"
    echo "  2. Créer la release GitHub"
    echo "  3. Déployer en production"
}

# ==============================================================================
# Monitoring
# ==============================================================================

cmd_status() {
    check_ssh
    
    print_header "État du déploiement"
    
    ssh "$VPS_USER@$VPS_HOST" << 'EOF'
        cd /opt/app/grigou
        
        echo "📋 Dernier déploiement:"
        if [ -f LAST_DEPLOY.txt ]; then
            cat LAST_DEPLOY.txt
        else
            echo "Aucun déploiement enregistré"
        fi
        
        echo ""
        echo "🐳 État des conteneurs:"
        docker-compose -f docker-compose.prod.yml ps
        
        echo ""
        echo "💾 Backups disponibles (5 derniers):"
        ls -lht backups/*.tar.gz 2>/dev/null | head -5 || echo "Aucun backup trouvé"
EOF
    
    print_success "État récupéré"
}

cmd_logs() {
    check_ssh
    
    local service="${1:-app}"
    local lines="${2:-50}"
    
    print_header "Logs du service: $service"
    
    ssh "$VPS_USER@$VPS_HOST" << EOF
        cd $APP_DIR
        docker-compose -f docker-compose.prod.yml logs --tail=$lines $service
EOF
}

cmd_health() {
    check_config
    
    print_header "Health Check"
    
    local url="https://$VPS_HOST/api/health"
    
    print_info "Vérification de: $url"
    
    if response=$(curl -s -f "$url"); then
        print_success "Application en ligne"
        echo "$response" | jq . 2>/dev/null || echo "$response"
    else
        print_error "Health check échoué"
        exit 1
    fi
}

# ==============================================================================
# Backup et Restore
# ==============================================================================

cmd_backup() {
    check_ssh
    
    print_header "Création d'un backup"
    
    ssh "$VPS_USER@$VPS_HOST" << EOF
        cd $APP_DIR
        ./scripts/backup.sh
EOF
    
    print_success "Backup créé"
}

cmd_list_backups() {
    check_ssh
    
    print_header "Liste des backups disponibles"
    
    ssh "$VPS_USER@$VPS_HOST" << EOF
        cd $APP_DIR/backups
        ls -lht *.tar.gz 2>/dev/null || echo "Aucun backup trouvé"
EOF
}

cmd_restore() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Usage: ./cicd.sh restore <backup_file>"
        echo "Utilisez './cicd.sh list-backups' pour voir les backups disponibles"
        exit 1
    fi
    
    check_ssh
    
    print_header "Restauration du backup: $backup_file"
    print_warning "ATTENTION: Cette opération va écraser les données actuelles !"
    
    read -p "Êtes-vous sûr ? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Restauration annulée"
        exit 0
    fi
    
    ssh "$VPS_USER@$VPS_HOST" << EOF
        cd $APP_DIR
        ./scripts/restore.sh backups/$backup_file
EOF
    
    print_success "Restauration terminée"
}

# ==============================================================================
# Workflows GitHub
# ==============================================================================

cmd_workflows() {
    print_header "Workflows GitHub Actions"
    
    echo "📋 Workflows disponibles:"
    echo ""
    echo "1. CI/CD Pipeline (ci-cd.yml)"
    echo "   Déclenché: Push main/develop, Pull Requests"
    echo "   Actions: Tests, Build, Déploiement auto"
    echo ""
    echo "2. Pull Request Checks (pr-checks.yml)"
    echo "   Déclenché: PR ouvertes/mises à jour"
    echo "   Actions: Vérifications de code, tests, commentaire"
    echo ""
    echo "3. Rollback (rollback.yml)"
    echo "   Déclenché: Manuel (GitHub UI)"
    echo "   Actions: Retour à version antérieure"
    echo ""
    echo "4. Release (release.yml)"
    echo "   Déclenché: Tag v*.*.*"
    echo "   Actions: Build, release GitHub, déploiement"
    echo ""
    
    print_info "Consultez docs/CICD_SETUP.md pour plus de détails"
}

cmd_check_secrets() {
    print_header "Vérification de la configuration GitHub Secrets"
    
    local required_secrets=(
        "SSH_PRIVATE_KEY"
        "SERVER_HOST"
        "SERVER_USER"
        "APP_DIR"
        "PRODUCTION_DOMAIN"
    )
    
    echo "Secrets requis:"
    for secret in "${required_secrets[@]}"; do
        echo "  - $secret"
    done
    
    echo ""
    print_info "Vérifiez dans GitHub:"
    echo "Repository → Settings → Secrets and variables → Actions"
    echo ""
    print_info "Configuration actuelle (depuis variables d'env):"
    echo "  SERVER_HOST: ${VPS_HOST:-non défini}"
    echo "  SERVER_USER: ${VPS_USER}"
    echo "  APP_DIR: ${APP_DIR}"
}

# ==============================================================================
# Aide
# ==============================================================================

cmd_help() {
    cat << EOF
🚀 CI/CD Helper - Grigou

USAGE:
    ./cicd.sh <command> [options]

GIT WORKFLOWS:
    feature <name>        Créer une branche feature
    hotfix <name>         Créer une branche hotfix
    release <version>     Créer et déployer une release (ex: 1.2.0)

MONITORING:
    status                État du déploiement sur le VPS
    logs [service] [n]    Voir les logs (défaut: app, 50 lignes)
    health                Vérifier le health check de l'application

BACKUP & RESTORE:
    backup                Créer un backup manuel
    list-backups          Lister les backups disponibles
    restore <file>        Restaurer un backup

GITHUB ACTIONS:
    workflows             Lister les workflows disponibles
    check-secrets         Vérifier la configuration des secrets GitHub

HELP:
    help                  Afficher cette aide

CONFIGURATION:
    Définissez les variables d'environnement:
    export VPS_HOST=votre-vps.com
    export VPS_USER=deploy  (optionnel, défaut: deploy)
    export APP_DIR=/opt/app/grigou  (optionnel)

EXEMPLES:
    # Créer une feature
    ./cicd.sh feature nouvelle-fonctionnalite

    # Créer une release
    ./cicd.sh release 1.2.0

    # Voir les logs
    ./cicd.sh logs app 100

    # Vérifier la santé
    ./cicd.sh health

    # Créer un backup
    ./cicd.sh backup

DOCUMENTATION:
    docs/CICD_SETUP.md       Guide complet de configuration
    docs/CICD_CHEATSHEET.md  Aide-mémoire des commandes

EOF
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        feature)
            cmd_feature "$@"
            ;;
        hotfix)
            cmd_hotfix "$@"
            ;;
        release)
            cmd_release "$@"
            ;;
        status)
            cmd_status "$@"
            ;;
        logs)
            cmd_logs "$@"
            ;;
        health)
            cmd_health "$@"
            ;;
        backup)
            cmd_backup "$@"
            ;;
        list-backups)
            cmd_list_backups "$@"
            ;;
        restore)
            cmd_restore "$@"
            ;;
        workflows)
            cmd_workflows "$@"
            ;;
        check-secrets)
            cmd_check_secrets "$@"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            print_error "Commande inconnue: $command"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
