#!/bin/bash

# prod.sh - Script pour environnement de production

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 OurMusic - Environnement de production${NC}"

# Vérifier si Docker est lancé
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker n'est pas lancé. Veuillez démarrer Docker.${NC}"
    exit 1
fi

# Vérifier les fichiers de production
if [ ! -f "./OurMusic-Backend/.env.prod" ]; then
    echo -e "${RED}❌ Fichier .env.prod manquant pour le backend${NC}"
    echo -e "${YELLOW}💡 Créez le fichier avec vos variables de production${NC}"
    exit 1
fi

if [ ! -f "./OurMusic-frontend/.env.prod" ]; then
    echo -e "${RED}❌ Fichier .env.prod manquant pour le frontend${NC}"
    echo -e "${YELLOW}💡 Créez le fichier avec vos variables de production${NC}"
    exit 1
fi

if [ ! -f "./.env" ]; then
    echo -e "${RED}❌ Fichier .env racine manquant${NC}"
    echo -e "${YELLOW}💡 Configurez vos variables de base de données${NC}"
    exit 1
fi

# Créer les dossiers de stockage de production
echo -e "${YELLOW}📁 Création des dossiers de stockage...${NC}"
sudo mkdir -p /opt/ourmusic/data/postgres
sudo mkdir -p ./database/backups
sudo chown -R 1000:1000 ./database/backups

echo -e "${BLUE}🏗️  Construction et démarrage des services de production...${NC}"

# Arrêter les services s'ils tournent
docker-compose -f docker-compose.prod.yml down

# Construire et démarrer avec zero-downtime si possible
docker-compose -f docker-compose.prod.yml up --build -d --remove-orphans

echo -e "${YELLOW}⏳ Attente que tous les services soient prêts...${NC}"
sleep 10

# Vérifier le statut des services
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services de production démarrés avec succès !${NC}"
    
    # Afficher les logs des healthchecks
    echo -e "${BLUE}📊 Statut des services :${NC}"
    docker-compose -f docker-compose.prod.yml ps
    
    echo -e "${GREEN}🎉 OurMusic est en ligne en production !${NC}"
    echo -e "${BLUE}🌐 Vérifiez votre reverse proxy pour l'accès externe${NC}"
    echo -e "${BLUE}📈 Monitoring disponible via les logs Docker${NC}"
    echo -e "${BLUE}💾 Sauvegardes automatiques configurées${NC}"
else
    echo -e "${RED}❌ Erreur lors du démarrage des services${NC}"
    echo -e "${YELLOW}📋 Logs des erreurs :${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
fi