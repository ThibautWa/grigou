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

cd $APP_DIR

# Charger les variables d'environnement
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | grep -v '^$' | xargs)
  echo -e "${GREEN}✅ Environment variables loaded${NC}"
fi

# Créer un backup de la base de données
echo -e "${YELLOW}📦 Creating database backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

echo -e "   Database: ${POSTGRES_DB}"
echo -e "   User: ${POSTGRES_USER}"

docker exec grigou_db pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > "$BACKUP_FILE" || echo "⚠️ Backup failed"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  echo -e "${GREEN}✅ Backup created: $(basename $BACKUP_FILE) ($(du -h $BACKUP_FILE | cut -f1))${NC}"
else
  echo -e "${RED}❌ Backup file is empty or missing${NC}"
fi

# Garder seulement les 5 derniers backups
ls -t $BACKUP_DIR/db-backup-*.sql 2>/dev/null | tail -n +6 | xargs -r rm
echo -e "${GREEN}🧹 Old backups cleaned${NC}"

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
sleep 20

# Check health
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    docker-compose -f docker-compose.prod.yml ps
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo -e "${YELLOW}🔄 Rolling back...${NC}"
    
    # Restore from backup
    docker exec -i grigou_db psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" < "$BACKUP_FILE"
    
    exit 1
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
docker system prune -af

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
