#!/bin/bash

# manage.sh - Script de gestion OurMusic

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
    echo -e "${BLUE}🎵 OurMusic - Script de gestion${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  start     Démarrer l'environnement"
    echo "  stop      Arrêter l'environnement"
    echo "  restart   Redémarrer l'environnement"
    echo "  logs      Voir les logs"
    echo "  status    Statut des services"
    echo "  clean     Nettoyer les conteneurs/images"
    echo "  backup    Créer une sauvegarde de la DB"
    echo "  restore   Restaurer une sauvegarde"
    echo "  update    Mettre à jour les images"
    echo ""
    echo "Environments:"
    echo "  dev       Développement (défaut)"
    echo "  prod      Production"
    echo ""
    echo "Examples:"
    echo "  $0 start dev      # Démarrer en développement"
    echo "  $0 logs prod      # Voir les logs de production"
    echo "  $0 backup prod    # Sauvegarder la DB de production"
}

COMMAND=${1:-help}
ENV=${2:-dev}

if [ "$ENV" = "dev" ]; then
    COMPOSE_FILE="docker-compose.dev.yml"
    DB_CONTAINER="ourmusic-db-dev"
elif [ "$ENV" = "prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    DB_CONTAINER="ourmusic-db-prod"
else
    echo -e "${RED}❌ Environnement invalide: $ENV${NC}"
    show_help
    exit 1
fi

case $COMMAND in
    start)
        echo -e "${BLUE}🚀 Démarrage de l'environnement $ENV...${NC}"
        if [ "$ENV" = "dev" ]; then
            ./scripts/dev.sh
        else
            ./scripts/prod.sh
        fi
        ;;
    
    stop)
        echo -e "${YELLOW}⏹️  Arrêt de l'environnement $ENV...${NC}"
        docker-compose -f $COMPOSE_FILE down
        echo -e "${GREEN}✅ Services arrêtés${NC}"
        ;;
    
    restart)
        echo -e "${BLUE}🔄 Redémarrage de l'environnement $ENV...${NC}"
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}✅ Services redémarrés${NC}"
        ;;
    
    logs)
        SERVICE=${3:-""}
        if [ -n "$SERVICE" ]; then
            docker-compose -f $COMPOSE_FILE logs -f $SERVICE
        else
            docker-compose -f $COMPOSE_FILE logs -f
        fi
        ;;
    
    status)
        echo -e "${BLUE}📊 Statut des services $ENV:${NC}"
        docker-compose -f $COMPOSE_FILE ps
        ;;
    
    clean)
        echo -e "${YELLOW}🧹 Nettoyage des conteneurs et images...${NC}"
        docker-compose -f $COMPOSE_FILE down --volumes --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Nettoyage terminé${NC}"
        ;;
    
    backup)
        DATE=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="./database/backups/ourmusic_${ENV}_${DATE}.sql"
        
        echo -e "${BLUE}💾 Création d'une sauvegarde...${NC}"
        mkdir -p ./database/backups
        
        if docker ps | grep -q $DB_CONTAINER; then
            docker exec $DB_CONTAINER pg_dump -U ${DB_USER:-ourmusic} ${DB_NAME:-ourmusic_dev} > $BACKUP_FILE
            echo -e "${GREEN}✅ Sauvegarde créée: $BACKUP_FILE${NC}"
        else
            echo -e "${RED}❌ Base de données non démarrée${NC}"
            exit 1
        fi
        ;;
    
    restore)
        BACKUP_FILE=$3
        if [ -z "$BACKUP_FILE" ]; then
            echo -e "${RED}❌ Veuillez spécifier le fichier de sauvegarde${NC}"
            echo "Usage: $0 restore $ENV <backup_file.sql>"
            exit 1
        fi
        
        if [ ! -f "$BACKUP_FILE" ]; then
            echo -e "${RED}❌ Fichier de sauvegarde introuvable: $BACKUP_FILE${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}⚠️  Restauration de la base de données...${NC}"
        echo -e "${RED}⚠️  ATTENTION: Cette opération va écraser les données existantes !${NC}"
        read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker exec -i $DB_CONTAINER psql -U ${DB_USER:-ourmusic} ${DB_NAME:-ourmusic_dev} < $BACKUP_FILE
            echo -e "${GREEN}✅ Restauration terminée${NC}"
        else
            echo -e "${YELLOW}⏸️  Restauration annulée${NC}"
        fi
        ;;
    
    update)
        echo -e "${BLUE}📦 Mise à jour des images...${NC}"
        docker-compose -f $COMPOSE_FILE pull
        docker-compose -f $COMPOSE_FILE up -d --build
        echo -e "${GREEN}✅ Images mises à jour${NC}"
        ;;
    
    help|*)
        show_help
        ;;
esac