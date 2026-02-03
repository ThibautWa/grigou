#!/bin/bash

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_DIR="${1:-/root/grigou}"
BACKUP_DIR="/root/backups/grigou"

echo -e "${GREEN}🚀 Starting Grigou deployment...${NC}"

# Créer un backup de la base de données
echo -e "${YELLOW}📦 Creating database backup...${NC}"
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/db-backup-$(date +%Y%m%d-%H%M%S).sql"

docker exec grigou-postgres pg_dump -U grigou grigou > $BACKUP_FILE
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Garder seulement les 5 derniers backups
ls -t $BACKUP_DIR/db-backup-*.sql | tail -n +6 | xargs -r rm
echo -e "${GREEN}🧹 Old backups cleaned${NC}"

cd $APP_DIR

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main

# Deploy
echo -e "${YELLOW}🐳 Deploying containers...${NC}"
docker-compose down
docker-compose up -d --build

# Wait for containers to be healthy
echo -e "${YELLOW}⏳ Waiting for containers to be healthy...${NC}"
sleep 10

# Check health
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo -e "${YELLOW}🔄 Rolling back...${NC}"
    
    # Restore from backup
    docker exec -i grigou-postgres psql -U grigou grigou < $BACKUP_FILE
    
    exit 1
fi

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
docker system prune -af --volumes

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
