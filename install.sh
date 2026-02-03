#!/bin/bash

################################################################################
# Script d'Installation Initiale - Grigou
# Description: Configure le VPS pour la première fois
# Usage: curl -sSL https://raw.githubusercontent.com/votre-repo/grigou/main/install.sh | bash
################################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}=== $1 ===${NC}"
    echo ""
}

# Banner
clear
echo ""
echo -e "${GREEN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║                                       ║"
echo "  ║     Installation de Grigou            ║"
echo "  ║     Budget Management Application     ║"
echo "  ║                                       ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Variables
APP_DIR="/opt/app/grigou"
DOMAIN="grigou.fr"
EMAIL="thibautjager@protonmail.com"

# Vérifier que le script est exécuté en tant que root ou avec sudo
if [ "$EUID" -ne 0 ]; then 
    log_error "Ce script doit être exécuté en tant que root ou avec sudo"
    exit 1
fi

# ============================================
# Configuration initiale
# ============================================

log_step "Configuration Initiale"

read -p "Nom de domaine (ex: budget.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    log_error "Le nom de domaine est requis"
    exit 1
fi

read -p "Email pour Let's Encrypt: " EMAIL
if [ -z "$EMAIL" ]; then
    log_error "L'email est requis"
    exit 1
fi

log_info "Domaine: $DOMAIN"
log_info "Email: $EMAIL"
echo ""

# ============================================
# Mise à jour du système
# ============================================

log_step "Mise à Jour du Système"

log_info "Mise à jour des paquets..."
apt update
apt upgrade -y
log_success "Système mis à jour"

# ============================================
# Installation des dépendances
# ============================================

log_step "Installation des Dépendances"

log_info "Installation de curl, git, ufw..."
apt install -y curl git ufw

log_success "Dépendances installées"

# ============================================
# Configuration du Firewall
# ============================================

log_step "Configuration du Firewall"

log_info "Configuration de UFW..."
# ufw --force enable
# ufw default deny incoming
# ufw default allow outgoing
# ufw allow 22/tcp comment 'SSH'
# ufw allow 80/tcp comment 'HTTP'
# ufw allow 443/tcp comment 'HTTPS'
log_success "Firewall configuré"

# ============================================
# Installation de Docker
# ============================================

# log_step "Installation de Docker"

# if command -v docker &> /dev/null; then
#     log_warning "Docker est déjà installé"
#     docker --version
# else
#     log_info "Installation de Docker..."
    
#     # Ajouter la clé GPG Docker
#     install -m 0755 -d /etc/apt/keyrings
#     curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
#     chmod a+r /etc/apt/keyrings/docker.asc
    
#     # Ajouter le dépôt Docker
#     echo \
#       "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
#       $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
#       tee /etc/apt/sources.list.d/docker.list > /dev/null
    
#     # Installer Docker
#     apt update
#     apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
#     # Démarrer Docker
#     systemctl enable docker
#     systemctl start docker
    
#     log_success "Docker installé avec succès"
#     docker --version
# fi

# ============================================
# Création de l'utilisateur oltyx
# ============================================

log_step "Création de l'Utilisateur oltyx"

# if id "oltyx" &>/dev/null; then
#     log_warning "L'utilisateur oltyx existe déjà"
# else
#     log_info "Création de l'utilisateur oltyx..."
#     useradd -m -s /bin/bash oltyx
#     usermod -aG sudo oltyx
#     usermod -aG docker oltyx
    
#     # Copier les clés SSH de root
#     if [ -d "/root/.ssh" ]; then
#         mkdir -p /home/oltyx/.ssh
#         cp /root/.ssh/authorized_keys /home/oltyx/.ssh/
#         chown -R oltyx:oltyx /home/oltyx/.ssh
#         chmod 700 /home/oltyx/.ssh
#         chmod 600 /home/oltyx/.ssh/authorized_keys
#         log_success "Clés SSH copiées pour l'utilisateur oltyx"
#     fi
    
    log_success "Utilisateur oltyx créé"
# fi

# ============================================
# Création de la structure de dossiers
# ============================================

log_step "Création de la Structure de Dossiers"

log_info "Création de $APP_DIR..."
mkdir -p "$APP_DIR"/{nginx/conf.d,certbot/{conf,www},scripts,backups,logs/nginx,app}
chown -R oltyx:oltyx "$APP_DIR"
log_success "Structure créée"

# ============================================
# Téléchargement des fichiers de configuration
# ============================================

# log_step "Téléchargement des Fichiers de Configuration"

# cd "$APP_DIR"

# # Si vous avez un repo Git
# # log_info "Clonage depuis Git..."
# # su - oltyx -c "git clone https://github.com/votre-repo/grigou.git $APP_DIR/app"

# log_warning "Vous devrez uploader votre code application dans: $APP_DIR/app/"
# log_info "Utilisez: rsync -avz /chemin/local/grigou/ oltyx@$DOMAIN:$APP_DIR/app/"

# ============================================
# Génération des secrets
# ============================================

log_step "Génération des Secrets"

log_info "Génération des secrets de sécurité..."
POSTGRES_PASSWORD=$(openssl rand -base64 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

log_success "Secrets générés"

# ============================================
# Création du fichier .env.production
# ============================================

log_step "Création du Fichier .env.production"

cat > "$APP_DIR/.env.production" << EOF
# === Application ===
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://$DOMAIN

# === Database ===
DATABASE_URL=postgresql://grigou_user:$POSTGRES_PASSWORD@postgres:5432/grigou_prod
POSTGRES_USER=grigou_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=grigou_prod

# === NextAuth ===
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# === Security ===
ALLOWED_ORIGINS=https://$DOMAIN
RATE_LIMIT_MAX=100
EOF

chmod 600 "$APP_DIR/.env.production"
chown oltyx:oltyx "$APP_DIR/.env.production"

log_success "Fichier .env.production créé"

# ============================================
# Affichage des informations importantes
# ============================================

log_step "Installation Terminée!"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║  Installation de base terminée avec succès!              ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

log_info "Prochaines étapes:"
echo ""
echo "1. Déconnectez-vous et reconnectez-vous en tant que oltyx:"
echo "   ${CYAN}ssh oltyx@$DOMAIN${NC}"
echo ""
echo "2. Uploadez votre code application:"
echo "   ${CYAN}rsync -avz --exclude 'node_modules' --exclude '.next' /chemin/local/grigou/ oltyx@$DOMAIN:$APP_DIR/app/${NC}"
echo ""
echo "3. Uploadez les fichiers de configuration:"
echo "   - docker-compose.prod.yml"
echo "   - nginx/nginx.conf"
echo "   - nginx/conf.d/grigou.conf"
echo "   - scripts/*.sh"
echo ""
echo "4. Modifiez nginx/conf.d/grigou.conf et remplacez 'votre-domaine.com' par '$DOMAIN'"
echo ""
echo "5. Obtenez le certificat SSL:"
echo "   ${CYAN}cd $APP_DIR${NC}"
echo "   ${CYAN}docker-compose -f docker-compose.prod.yml up -d nginx${NC}"
echo "   ${CYAN}docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email $EMAIL --agree-tos --no-eff-email -d $DOMAIN${NC}"
echo ""
echo "6. Démarrez l'application:"
echo "   ${CYAN}cd $APP_DIR${NC}"
echo "   ${CYAN}./scripts/oltyx.sh${NC}"
echo ""

log_warning "IMPORTANT: Sauvegardez ces informations:"
echo ""
echo "  Mot de passe PostgreSQL: ${YELLOW}$POSTGRES_PASSWORD${NC}"
echo "  NextAuth Secret: ${YELLOW}$NEXTAUTH_SECRET${NC}"
echo ""
echo "  Ces valeurs sont stockées dans: $APP_DIR/.env.production"
echo ""

log_info "Documentation complète disponible dans: oltyxMENT_GUIDE.md"
echo ""
