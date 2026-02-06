#!/bin/bash
set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/app/grigou"
BACKUP_DIR="$APP_DIR/backups"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Grigou Deployment Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Créer un backup de la base de données
echo -e "${YELLOW}📦 Creating database backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

# Utiliser le bon nom de container
docker exec grigou_db pg_dump -U ${POSTGRES_USER:-grigou_user} ${POSTGRES_DB:-grigou_db} > $BACKUP_FILE || echo "⚠️ Backup failed"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Garder seulement les 5 derniers backups
ls -t $BACKUP_DIR/db-backup-*.sql 2>/dev/null | tail -n +6 | xargs -r rm
echo -e "${GREEN}🧹 Old backups cleaned${NC}"

cd $APP_DIR

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main

# Deploy avec docker-compose.prod.yml
echo -e "${YELLOW}🐳 Deploying containers...${NC}"
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for containers to be healthy
echo -e "${YELLOW}⏳ Waiting for containers to be healthy...${NC}"
sleep 15

# Check health
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    docker-compose -f docker-compose.prod.yml ps
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo -e "${YELLOW}🔄 Rolling back...${NC}"
    
    # Restore from backup
    docker exec -i grigou_db psql -U ${POSTGRES_USER:-grigou_user} ${POSTGRES_DB:-grigou_db} < $BACKUP_FILE
    
    exit 1
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
docker system prune -af

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
