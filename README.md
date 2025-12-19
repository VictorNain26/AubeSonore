# 🎵 OurMusic

Une webradio moderne avec interface React et backend TypeScript/Bun, organisée en monorepo.

## 🏗️ Architecture

```
ourmusic/
├── apps/
│   ├── backend/          # API Bun + Elysia + TypeScript
│   └── frontend/         # Vite + React + TypeScript
└── packages/
    ├── shared-types/     # Types TypeScript partagés
    ├── shared-utils/     # Utilitaires communs
    └── eslint-config/    # Configuration ESLint
```

## 🚀 Quick Start

### Prérequis
- Node.js >=20
- PNPM >=10.13.1
- Bun (pour le backend)
- PostgreSQL

### Installation

```bash
# Installer les dépendances
pnpm install

# Configurer les environnements
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Démarrer le projet
pnpm dev
```

L'application sera disponible sur:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📦 Packages

### Apps

#### @ourmusic/backend
API REST avec Bun, Elysia, Drizzle ORM et Better Auth
- **Port**: 3000
- **Tech**: Bun, Elysia, PostgreSQL, Drizzle ORM
- **Auth**: Better Auth (email + OAuth)

#### @ourmusic/frontend
Application React 19 avec Vite et Tailwind CSS
- **Port**: 5173
- **Tech**: React 19, Vite, Tailwind CSS, Zustand
- **Features**: PWA, SSE real-time, React Query

### Shared Packages

#### @ourmusic/shared-types
Types TypeScript partagés entre backend et frontend
- User, Session, Account
- LikedTrack, ScrapedTrack
- SpotifyPlaylist, SpotifyTrack
- API responses

#### @ourmusic/shared-utils
Utilitaires communs
- Error handling
- String utilities
- Constants (genres, tags, roles)

#### @ourmusic/eslint-config
Configuration ESLint unifiée avec TypeScript strict

## 🛠️ Commandes

### Développement
```bash
pnpm dev              # Démarrer tous les apps
pnpm dev:backend      # Backend uniquement
pnpm dev:frontend     # Frontend uniquement
```

### Build
```bash
pnpm build            # Build tous les apps
pnpm build:backend    # Build backend
pnpm build:frontend   # Build frontend
```

### Qualité du code
```bash
pnpm lint             # Lint tous les packages
pnpm lint:fix         # Fix automatiquement
pnpm typecheck        # Vérification TypeScript
pnpm format           # Formater avec Prettier
```

### Tests
```bash
pnpm test             # Tous les tests
pnpm --filter @ourmusic/frontend test
```

### Base de données
```bash
pnpm --filter @ourmusic/backend db:generate    # Générer migrations
pnpm --filter @ourmusic/backend db:push        # Appliquer migrations
pnpm --filter @ourmusic/backend seed:admin     # Créer admin
```

## ⚙️ Configuration

### Backend (.env)
```bash
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/ourmusic
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_AZURACAST_BASE_URL=http://your-azuracast-url
VITE_SITE_BASE_URL=http://localhost:5173
```

## 🎯 Features

### Backend
- ✅ Better Auth (email + OAuth)
- ✅ Spotify API integration
- ✅ Web scraping (Hypem)
- ✅ Cron jobs (auto-sync)
- ✅ TypeScript strict mode
- ✅ Drizzle ORM

### Frontend
- ✅ React 19
- ✅ Server-Sent Events (SSE)
- ✅ React Query (cache)
- ✅ Zustand (state)
- ✅ Tailwind CSS
- ✅ PWA ready
- ✅ TypeScript strict

## 📝 API Endpoints

### Authentication
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-out` - Déconnexion
- `GET /api/auth/session` - Session courante

### Tracks
- `GET /api/track/like` - Récupérer les morceaux aimés
- `POST /api/track/like` - Ajouter un morceau
- `DELETE /api/track/like/:id` - Supprimer un morceau

### Spotify
- `POST /api/spotify/sync-liked` - Synchroniser vers Spotify
- `GET /api/live/spotify/sync` - Synchroniser playlists (Admin)

### Utils
- `GET /health` - Health check
- `GET /` - API info

## 🔒 Sécurité

- Better Auth pour l'authentification
- Variables d'environnement pour les secrets
- TypeScript strict mode
- CORS configuré
- Validation des données (Valibot)

## 📄 License

MIT

## 👥 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

**Développé avec ❤️ par l'équipe OurMusic**
