#!/bin/bash

# dev-simple.sh - Script de développement simplifié

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 OurMusic - Développement Simplifié${NC}"

# Vérifier Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas lancé${NC}"
    exit 1
fi

# Nettoyer les anciens conteneurs
echo -e "${YELLOW}🧹 Nettoyage...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Créer le fichier .env minimal
cat > .env << EOF
DB_USER=ourmusic
DB_PASSWORD=ourmusic_password_2024
DB_NAME=ourmusic
EOF

echo -e "${BLUE}📊 Démarrage de la base de données seulement...${NC}"
docker-compose -f docker-compose.dev.yml up -d db

echo -e "${YELLOW}⏳ Attente de la base de données...${NC}"
sleep 10

# Vérifier que la DB est prête
until docker exec ourmusic-db-dev pg_isready -U ourmusic 2>/dev/null; do
  echo -e "${YELLOW}⏳ Base de données pas encore prête...${NC}"
  sleep 2
done

echo -e "${GREEN}✅ Base de données prête !${NC}"

echo -e "${BLUE}🔧 Démarrage du backend localement...${NC}"
cd OurMusic-Backend

# Créer un .env.local pour les tests
cat > .env.local << EOF
NODE_ENV=development
DATABASE_URL=postgresql://ourmusic:ourmusic_password_2024@localhost:5433/ourmusic
PORT=3000
BETTER_AUTH_SECRET=dev-secret-key-min-32-chars-long
BETTER_AUTH_URL=http://localhost:3000/api/auth
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173
ENABLE_CRON=false
EOF

echo -e "${YELLOW}📂 Application des migrations...${NC}"
if DATABASE_URL=postgresql://ourmusic:ourmusic_password_2024@localhost:5433/ourmusic bun run db:push; then
    echo -e "${GREEN}✅ Migrations OK${NC}"
else
    echo -e "${RED}❌ Erreur migrations${NC}"
fi

echo -e "${BLUE}🚀 Backend démarré sur http://localhost:3000${NC}"
echo -e "${BLUE}📱 Ouvrez un autre terminal et lancez:${NC}"
echo -e "${YELLOW}cd OurMusic-frontend && pnpm dev${NC}"
echo -e "${BLUE}🗄️ Adminer disponible: http://localhost:8081${NC}"

# Démarrer le backend en arrière-plan pour les tests
DATABASE_URL=postgresql://ourmusic:ourmusic_password_2024@localhost:5433/ourmusic bun run start