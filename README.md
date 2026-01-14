# OurMusic

Une webradio moderne avec interface React et backend TypeScript/Bun, organisee en monorepo.

## Architecture

```
ourmusic/
├── apps/
│   ├── backend/          # API Bun + Elysia + TypeScript
│   └── frontend/         # Vite + React + TypeScript
├── packages/
│   ├── shared-types/     # Types TypeScript partages
│   ├── shared-utils/     # Utilitaires communs
│   └── logger/           # Logging utilities
├── docker-compose.yml    # Production Docker
└── docker-compose.dev.yml # Development (DB only)
```

## Quick Start

### Prerequis
- Node.js >=20
- PNPM >=10.13.1
- Bun (pour le backend)
- Docker & Docker Compose (optionnel)

### Installation locale

```bash
# Installer les dependances
pnpm install

# Configurer les environnements
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Demarrer PostgreSQL (via Docker)
docker compose -f docker-compose.dev.yml up -d

# Appliquer les migrations
pnpm --filter @ourmusic/backend db:push

# Demarrer le projet
pnpm dev
```

L'application sera disponible sur:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Demarrage avec Docker (Production)

```bash
# Copier et configurer les variables d'environnement
cp .env.example .env
# Editer .env avec vos valeurs

# Demarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f
```

Services disponibles:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432

## Packages

### Apps

#### @ourmusic/backend
API REST avec Bun, Elysia, Drizzle ORM et Better Auth
- **Port**: 3000
- **Tech**: Bun, Elysia, PostgreSQL, Drizzle ORM
- **Auth**: Better Auth (email + Google OAuth + Spotify OAuth)
- **Features**: HypeMachine scraping, Spotify sync

#### @ourmusic/frontend
Application React 19 avec Vite et Tailwind CSS
- **Port**: 5173 (dev) / 8080 (docker)
- **Tech**: React 19, Vite, Tailwind CSS, Zustand
- **Features**: PWA, SSE real-time, React Query

### Shared Packages

#### @ourmusic/shared-types
Types TypeScript partages entre backend et frontend

#### @ourmusic/shared-utils
Utilitaires communs (error handling, string utils, constants)

#### @ourmusic/logger
Logging utilities

## Commandes

### Developpement
```bash
pnpm dev                 # Demarrer tous les apps
pnpm dev:backend         # Backend uniquement
pnpm dev:frontend        # Frontend uniquement
```

### Build
```bash
pnpm build               # Build tous les apps
pnpm build:backend       # Build backend
pnpm build:frontend      # Build frontend
```

### Qualite du code
```bash
pnpm lint             # Lint tous les packages
pnpm lint:fix         # Fix automatiquement
pnpm typecheck        # Verification TypeScript
pnpm format           # Formater avec Prettier
```

### Base de donnees
```bash
pnpm --filter @ourmusic/backend db:generate    # Generer migrations
pnpm --filter @ourmusic/backend db:push        # Appliquer migrations
pnpm --filter @ourmusic/backend seed:admin     # Creer admin
```

## Configuration

### Variables d'environnement

Voir `.env.example` a la racine pour la configuration Docker complete.

#### Backend (.env)
```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/ourmusic
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# OAuth (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_AZURACAST_BASE_URL=https://your-azuracast-instance.com
VITE_SITE_BASE_URL=http://localhost:5173
```

### AzuraCast

Ce projet necessite une instance AzuraCast pour le streaming audio.
AzuraCast doit etre installe separement sur son propre serveur/port.

Installation AzuraCast: https://www.azuracast.com/docs/getting-started/installation/

## Features

### Backend
- Better Auth (email + Google OAuth + Spotify OAuth)
- Spotify API integration (sync liked tracks)
- Web scraping HypeMachine (trending tracks)
- Cron jobs (auto-sync)
- TypeScript strict mode
- Drizzle ORM + PostgreSQL

### Frontend
- React 19
- Server-Sent Events (SSE) real-time
- React Query (cache)
- Zustand (state management)
- Tailwind CSS
- PWA ready
- TypeScript strict

## API Endpoints

### Authentication
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-out` - Deconnexion
- `GET /api/auth/session` - Session courante
- `GET /api/auth/callback/google` - Google OAuth callback
- `GET /api/auth/callback/spotify` - Spotify OAuth callback

### Tracks
- `GET /api/track/like` - Recuperer les morceaux aimes
- `POST /api/track/like` - Ajouter un morceau
- `DELETE /api/track/like/:id` - Supprimer un morceau

### Utils
- `GET /health` - Health check
- `GET /` - API info

## Deploiement

### Docker (recommande)
```bash
docker compose up -d --build
```

### CI/CD
Le projet inclut un workflow GitHub Actions pour:
- Lint & TypeCheck
- Build des apps
- Deploy backend sur Koyeb
- Deploy frontend sur Vercel

## Securite

- Better Auth pour l'authentification
- Variables d'environnement pour les secrets
- TypeScript strict mode
- CORS configure
- Validation des donnees (Valibot)

## License

MIT
