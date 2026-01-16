# OurMusic

Une webradio moderne avec interface React et backend TypeScript/Bun, organisee en monorepo.

## Production

- **Frontend**: https://www.ourmusic.fr
- **Backend API**: https://ourmusic-backend-tomia-f4ec3e9e.koyeb.app
- **Database**: Railway PostgreSQL

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

## Features

### Like & Multi-Platform Links
- Like les morceaux en cours ou dans l'historique
- Integration **Songlink/Odesli** pour liens multi-plateformes automatiques
- Liens directs vers: Spotify, Apple Music, Deezer, YouTube Music, Tidal, Amazon Music, SoundCloud
- Persistence des covers en base64 (les covers ne disparaissent plus)
- Choix de la plateforme preferee par utilisateur

### Backend
- Better Auth (email + Google OAuth)
- Songlink/Odesli API (liens multi-plateformes)
- Covers persistees en base64
- TypeScript strict mode
- Drizzle ORM + PostgreSQL

### Frontend
- React 19
- Zustand (state management)
- Tailwind CSS + shadcn/ui
- PWA ready
- TypeScript strict

## Quick Start

### Prerequis
- Node.js >=20
- PNPM >=10.13.1
- Bun (pour le backend)
- Docker (optionnel, pour PostgreSQL local)

### Installation locale

```bash
# Installer les dependances
pnpm install

# Configurer les environnements
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Option 1: PostgreSQL via Docker
docker run -d --name ourmusic-db \
  -e POSTGRES_USER=ourmusic \
  -e POSTGRES_PASSWORD=ourmusic123 \
  -e POSTGRES_DB=ourmusic \
  -p 5432:5432 \
  postgres:16-alpine

# Option 2: Utiliser Railway/Neon (modifier DATABASE_URL dans .env)

# Appliquer le schema
cd apps/backend && bun run db:push

# Demarrer le projet
pnpm dev
```

L'application sera disponible sur:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Configuration

### Variables d'environnement

#### Backend (.env)
```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/ourmusic

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# URLs
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# OAuth (optionnel)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_AZURACAST_BASE_URL=https://your-azuracast-instance.com
```

## API Endpoints

### Authentication
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-out` - Deconnexion
- `GET /api/auth/session` - Session courante
- `GET /api/auth/callback/google` - Google OAuth callback

### Tracks
- `GET /api/track/like` - Recuperer les morceaux likes
- `POST /api/track/like` - Liker un morceau (+ fetch Songlink automatique)
- `DELETE /api/track/like/:id` - Supprimer un morceau like
- `POST /api/track/check-liked` - Verifier si un morceau est like
- `POST /api/track/:id/refresh-links` - Rafraichir les liens Songlink

### Preferences
- `GET /api/preferences` - Recuperer les preferences utilisateur
- `PUT /api/preferences` - Mettre a jour la plateforme preferee

### Utils
- `GET /health` - Health check
- `GET /` - API info

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
```

### Base de donnees
```bash
cd apps/backend
bun run db:generate    # Generer migrations
bun run db:push        # Appliquer schema
```

## Deploiement

### Backend (Koyeb)
Le backend est deploye automatiquement sur Koyeb depuis la branche `master`.

Variables d'environnement requises sur Koyeb:
- `DATABASE_URL` - Railway PostgreSQL
- `BETTER_AUTH_SECRET` - Secret pour l'auth
- `BETTER_AUTH_URL` - URL du backend
- `FRONTEND_BASE_URL` - https://www.ourmusic.fr
- `ALLOWED_ORIGINS` - https://www.ourmusic.fr,https://ourmusic.fr

### Frontend (Vercel)
Le frontend est deploye automatiquement sur Vercel depuis la branche `master`.

Variables d'environnement requises sur Vercel:
- `VITE_API_URL` - URL du backend Koyeb
- `VITE_AZURACAST_BASE_URL` - URL de l'instance AzuraCast

### Database (Railway)
PostgreSQL heberge sur Railway avec connexion externe.

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Runtime | Bun |
| Framework Backend | Elysia |
| Framework Frontend | React 19 + Vite |
| Database | PostgreSQL |
| ORM | Drizzle |
| Auth | Better Auth |
| State | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Valibot |
| Multi-platform links | Songlink/Odesli API |

## License

MIT
