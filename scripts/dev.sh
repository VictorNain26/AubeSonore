#!/bin/bash

# dev.sh - Script pour environnement de développement

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 OurMusic - Environnement de développement${NC}"

# Vérifier si Docker est lancé
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas lancé. Veuillez démarrer Docker.${NC}"
    exit 1
fi

# Créer les fichiers d'environnement s'ils n'existent pas
if [ ! -f "./OurMusic-Backend/.env.dev" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env.dev pour le backend...${NC}"
    cp "./OurMusic-Backend/.env.example" "./OurMusic-Backend/.env.dev" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Fichier .env.example non trouvé, création d'un .env.dev minimal...${NC}"
        cat > "./OurMusic-Backend/.env.dev" << EOF
NODE_ENV=development
DATABASE_URL=postgresql://ourmusic:dev_password@db:5432/ourmusic_dev
PORT=3000
BETTER_AUTH_SECRET=your-dev-secret-key-here
BETTER_AUTH_URL=http://localhost:3001/api/auth
FRONTEND_BASE_URL=http://localhost:5174
BACKEND_BASE_URL=http://localhost:3001
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:3000
ENABLE_CRON=false
EOF
    }
fi

if [ ! -f "./OurMusic-frontend/.env.dev" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env.dev pour le frontend...${NC}"
    cat > "./OurMusic-frontend/.env.dev" << EOF
NODE_ENV=development
VITE_API_BASE_URL=http://localhost:3001
VITE_AZURACAST_BASE_URL=http://localhost:8080
VITE_SITE_BASE_URL=http://localhost:5174
EOF
fi

# Créer le fichier .env racine pour docker-compose
if [ ! -f "./.env" ]; then
    echo -e "${YELLOW}📝 Création du fichier .env racine...${NC}"
    cat > "./.env" << EOF
# Base de données de développement
DB_USER=ourmusic
DB_PASSWORD=dev_password
DB_NAME=ourmusic_dev
EOF
fi

echo -e "${BLUE}🏗️  Construction et démarrage des services de développement...${NC}"

# Arrêter et supprimer les conteneurs existants
docker-compose -f docker-compose.dev.yml down

# Construire et démarrer les services
docker-compose -f docker-compose.dev.yml up --build --remove-orphans

echo -e "${GREEN}✅ Environnement de développement prêt !${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:5174${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${BLUE}🗄️  Adminer: http://localhost:8081${NC}"
echo -e "${BLUE}🐛 Debug: Port 9229 disponible${NC}"