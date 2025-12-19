#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 [DEV MODE] OurMusic Backend Development${NC}"

echo -e "${YELLOW}📡 Attente de la base de données PostgreSQL...${NC}"
until pg_isready -h db -p 5432; do
  echo -e "${YELLOW}⏳ Base de données pas encore prête, nouvelle tentative dans 2s...${NC}"
  sleep 2
done
echo -e "${GREEN}✅ Base de données accessible.${NC}"

echo -e "${YELLOW}📂 Vérification de la configuration Drizzle...${NC}"
if [ -f "drizzle.config.js" ] || [ -f "drizzle.config.ts" ]; then
  echo -e "${GREEN}✅ Configuration Drizzle trouvée.${NC}"
else
  echo -e "${RED}❌ Configuration Drizzle manquante.${NC}"
  exit 1
fi

echo -e "${YELLOW}🔄 Installation des dépendances (si nécessaire)...${NC}"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
  echo -e "${BLUE}📦 Installation des dépendances...${NC}"
  bun install --no-cache
fi

echo -e "${YELLOW}📂 Exécution des migrations Drizzle ORM...${NC}"
if bun run db:push; then
  echo -e "${GREEN}✅ Migrations appliquées avec succès.${NC}"
else
  echo -e "${RED}❌ Erreur lors de l'application des migrations.${NC}"
  echo -e "${YELLOW}🔄 Tentative de génération des migrations...${NC}"
  bun run db:generate
  bun run db:push
fi

echo -e "${BLUE}🚀 [DEV] Démarrage du serveur avec hot reload...${NC}"
echo -e "${BLUE}🐛 Debug disponible sur le port 9229${NC}"
echo -e "${BLUE}🔥 Hot reload activé${NC}"

# Start with hot reload and debugging
exec bun run --inspect=0.0.0.0:9229 --watch src/index.ts