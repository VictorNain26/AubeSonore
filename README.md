# 🎵 OurMusic - Webradio Collaborative

Une webradio moderne avec interface React et backend TypeScript/Bun.

## 🚀 Démarrage rapide

### Prérequis
- Docker & Docker Compose
- Git

### Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd OurMusic
```

2. **Démarrer en développement**
```bash
./scripts/dev.sh
```

3. **Accéder à l'application**
- 📱 Frontend: http://localhost:5174
- 🔧 Backend: http://localhost:3001
- 🗄️ Adminer: http://localhost:8081

## 🛠️ Gestion des environnements

### Script de gestion principal
```bash
./scripts/manage.sh [COMMAND] [ENVIRONMENT]
```

**Commandes disponibles :**
- `start` - Démarrer l'environnement
- `stop` - Arrêter l'environnement  
- `restart` - Redémarrer l'environnement
- `logs` - Voir les logs
- `status` - Statut des services
- `clean` - Nettoyer les conteneurs/images
- `backup` - Créer une sauvegarde de la DB
- `restore` - Restaurer une sauvegarde
- `update` - Mettre à jour les images

**Exemples :**
```bash
# Développement
./scripts/manage.sh start dev
./scripts/manage.sh logs dev backend
./scripts/manage.sh backup dev

# Production
./scripts/manage.sh start prod
./scripts/manage.sh logs prod
./scripts/manage.sh backup prod
```

## 🏗️ Architecture

### Services

#### Développement (`docker-compose.dev.yml`)
- **Database** (PostgreSQL 16) - Port 5433
- **Backend** (Bun/TypeScript) - Port 3001 + Debug 9229
- **Frontend** (Vite/React) - Port 5174
- **Adminer** (DB Admin) - Port 8081

#### Production (`docker-compose.prod.yml`)
- **Database** (PostgreSQL 16) - Interne
- **Backend** (Bun/TypeScript) - Via reverse proxy
- **Frontend** (Nginx) - Via reverse proxy
- **Watchtower** (Auto-updates)
- **DB Backup** (Sauvegardes quotidiennes)

### Structure des dossiers
```
OurMusic/
├── OurMusic-Backend/          # API Backend (Bun + TypeScript)
├── OurMusic-frontend/         # Interface React (Vite + TypeScript)
├── scripts/                   # Scripts de gestion
├── database/                  # Sauvegardes DB
├── docker-compose.yml         # Configuration Docker originale
├── docker-compose.dev.yml     # Développement
└── docker-compose.prod.yml    # Production
```

## ⚙️ Configuration

### Variables d'environnement

**Backend (`.env`)**
```bash
cp OurMusic-Backend/.env.example OurMusic-Backend/.env.dev
cp OurMusic-Backend/.env.example OurMusic-Backend/.env.prod
```

**Frontend (`.env`)**
```bash
cp OurMusic-frontend/.env.example OurMusic-frontend/.env.dev
cp OurMusic-frontend/.env.example OurMusic-frontend/.env.prod
```

**Docker Compose (`.env`)**
```bash
# Base de données
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_NAME=yourdbname
```

### Configuration minimum requise

**Backend (.env.dev/.env.prod) :**
- `DATABASE_URL` - URL de connexion PostgreSQL
- `BETTER_AUTH_SECRET` - Clé secrète (min 32 caractères)
- `BETTER_AUTH_URL` - URL publique de l'API auth
- `FRONTEND_BASE_URL` - URL du frontend
- `SPOTIFY_CLIENT_ID/SECRET` - API Spotify (optionnel)

**Frontend (.env.dev/.env.prod) :**
- `VITE_API_BASE_URL` - URL de l'API backend
- `VITE_AZURACAST_BASE_URL` - URL Azuracast (optionnel)

## 🔧 Développement

### Hot Reload
- **Backend** : Redémarrage automatique avec `--watch`
- **Frontend** : Hot Module Replacement (HMR) avec Vite
- **Database** : Volume persistant pour les données

### Debug
- **Backend** : Port 9229 exposé pour Node.js debugging
- **Frontend** : DevTools React + Vite
- **Database** : Adminer sur http://localhost:8081

### Tests
```bash
# Backend
cd OurMusic-Backend
bun run test
bun run lint
bun run typecheck

# Frontend  
cd OurMusic-frontend
pnpm test
pnpm run lint
pnpm run typecheck
```

## 🚀 Production

### Déploiement

1. **Configurer les variables de production**
```bash
# Copier et modifier les fichiers .env.prod
cp OurMusic-Backend/.env.example OurMusic-Backend/.env.prod
cp OurMusic-frontend/.env.example OurMusic-frontend/.env.prod
```

2. **Démarrer en production**
```bash
./scripts/prod.sh
```

### Fonctionnalités de production

- **Sécurité** : Conteneurs non-root, read-only filesystems
- **Performance** : Images Alpine optimisées, multi-stage builds
- **Monitoring** : Health checks, resource limits
- **Sauvegarde** : Backup automatique quotidien de la DB
- **Auto-update** : Watchtower pour les mises à jour automatiques

### Reverse Proxy

Exemple de configuration Nginx :
```nginx
server {
    listen 80;
    server_name yourmusic.com;
    
    location / {
        proxy_pass http://localhost:8080;  # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3001;  # Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring

### Logs
```bash
# Tous les services
./scripts/manage.sh logs dev

# Service spécifique
./scripts/manage.sh logs prod backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Health Checks
- **Database** : `pg_isready`
- **Backend** : `GET /health`
- **Frontend** : Nginx status

### Métriques
- Resource limits configurés dans Docker Compose
- Health check intervals optimisés
- Log rotation automatique

## 🔐 Sécurité

### Développement
- Variables d'environnement isolées
- Network isolation
- Non-root containers en prod

### Production
- HTTPS recommandé (via reverse proxy)
- Headers sécurisés configurés
- Secrets management via Docker secrets (recommandé)
- Backup encryption (à configurer)

## 📝 Maintenance

### Sauvegardes
```bash
# Créer une sauvegarde
./scripts/manage.sh backup prod

# Restaurer une sauvegarde
./scripts/manage.sh restore prod backup_file.sql
```

### Mises à jour
```bash
# Mettre à jour les images
./scripts/manage.sh update prod

# Rebuild complet
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d
```

### Nettoyage
```bash
# Nettoyer le système
./scripts/manage.sh clean dev
docker system prune -a
```

## 🆘 Dépannage

### Problèmes courants

**Base de données inaccessible :**
```bash
# Vérifier les logs
./scripts/manage.sh logs dev db

# Recréer le volume
docker-compose -f docker-compose.dev.yml down -v
./scripts/manage.sh start dev
```

**Port déjà utilisé :**
```bash
# Trouver le processus
lsof -i :3001
# Modifier les ports dans docker-compose.dev.yml si nécessaire
```

**Problème de permissions :**
```bash
# Fix permissions
sudo chown -R $USER:$USER .
```

## 📋 Roadmap

- [ ] CI/CD avec GitHub Actions
- [ ] Kubernetes deployment configs
- [ ] Prometheus/Grafana monitoring
- [ ] SSL certificates automation
- [ ] Multi-environment secrets management

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

**Développé avec ❤️ par l'équipe OurMusic**