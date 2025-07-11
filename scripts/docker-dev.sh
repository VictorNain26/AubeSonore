#!/bin/bash

# docker-dev.sh - Script Docker Compose pour développement

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🐳 OurMusic - Développement Docker${NC}"

# Vérifier Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas lancé${NC}"
    exit 1
fi

# Nettoyer les anciens conteneurs
echo -e "${YELLOW}🧹 Nettoyage...${NC}"
docker-compose -f docker-compose.dev.yml down

# Créer le fichier .env
echo -e "${BLUE}📝 Configuration environnement...${NC}"
cat > .env << EOF
DB_USER=ourmusic
DB_PASSWORD=ourmusic_password_2024
DB_NAME=ourmusic
EOF

# Démarrer tous les services
echo -e "${BLUE}🚀 Démarrage des services...${NC}"
echo -e "${YELLOW}💡 Ceci peut prendre quelques minutes pour la première fois${NC}"

docker-compose -f docker-compose.dev.yml up --build

echo -e "${GREEN}✅ Services démarrés !${NC}"
echo -e "${BLUE}🌐 Accès aux services :${NC}"
echo -e "${YELLOW}  - Frontend : http://localhost:5174${NC}"
echo -e "${YELLOW}  - Backend  : http://localhost:3001${NC}"
echo -e "${YELLOW}  - Adminer  : http://localhost:8081${NC}"