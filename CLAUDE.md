# OurMusic - Configuration Claude Code

## Structure du projet
- **Backend** : `/OurMusic-Backend` (Bun + Elysia + TypeScript)
- **Frontend** : `/OurMusic-frontend` (Vite + React + TypeScript)

## Configuration environnement de développement

### Backend (OurMusic-Backend)
```bash
cd OurMusic-Backend
bun install
bun run start
```

### Frontend (OurMusic-frontend)
```bash
cd OurMusic-frontend
pnpm install
pnpm run dev
```

## Endpoints API Backend

### Authentication (Better Auth)
- `POST /api/auth/sign-in` - Connexion
- `POST /api/auth/sign-up` - Inscription
- `POST /api/auth/sign-out` - Déconnexion
- `POST /api/auth/reset-password` - Réinitialisation mot de passe
- `GET /api/auth/session` - Récupération session
- `POST /api/auth/link-account` - Lier compte social
- `POST /api/auth/unlink-account` - Délier compte social
- `GET /api/auth/list-accounts` - Lister comptes liés

### Tracks
- `GET /api/track/like` - Récupérer les morceaux aimés
- `POST /api/track/like` - Ajouter un morceau aux favoris
- `DELETE /api/track/like/{id}` - Supprimer un morceau des favoris

### Spotify
- `POST /api/spotify/sync-liked` - Synchroniser les morceaux aimés vers Spotify
- `GET /api/live/spotify/scrape` - Scraper automatiquement plusieurs genres (Admin)
- `GET /api/live/spotify/sync` - Synchroniser toutes les playlists (Admin)
- `GET /api/live/spotify/sync/{id}` - Synchroniser une playlist spécifique (Admin)
- `GET /api/live/spotify/spotdl/version` - Vérifier version spotDL (Admin)
- `GET /api/live/spotify/spotdl/cleanup` - Nettoyer fichiers temporaires (Admin)

### Utilitaires
- `GET /health` - Healthcheck
- `GET /` - Accueil API

## Commandes utiles

### Backend
- `bun run start` - Démarrer le serveur
- `bun run lint` - Linter le code
- `bun run lint:fix` - Corriger automatiquement les erreurs de lint
- `bun run format` - Formater le code avec Prettier
- `bun run db:generate` - Générer les migrations Drizzle
- `bun run db:push` - Appliquer les migrations

### Frontend
- `pnpm run dev` - Démarrer le serveur de développement
- `pnpm run build` - Construire pour la production
- `pnpm run lint` - Linter le code
- `pnpm run test` - Lancer les tests

## Variables d'environnement

### Backend (.env)
- `PORT` - Port du serveur (défaut: 3000)
- `DATABASE_URL` - URL de la base de données PostgreSQL
- `SPOTIFY_CLIENT_ID` - Client ID Spotify
- `SPOTIFY_CLIENT_SECRET` - Client Secret Spotify
- `ALLOWED_ORIGINS` - Origines CORS autorisées
- `ENABLE_CRON` - Activer les tâches cron (true/false)

### Frontend (.env)
- `VITE_API_BASE_URL` - URL de l'API backend
- `VITE_AZURACAST_BASE_URL` - URL Azuracast pour le streaming
- `VITE_SITE_BASE_URL` - URL du site frontend

## Technologies utilisées

### Backend
- **Runtime** : Bun
- **Framework** : Elysia
- **Base de données** : PostgreSQL + Drizzle ORM
- **Authentification** : Better Auth
- **Validation** : Valibot
- **Linting** : ESLint
- **Formatage** : Prettier

### Frontend
- **Build** : Vite
- **Framework** : React 19
- **Styling** : Tailwind CSS
- **State Management** : Zustand
- **Requêtes** : React Query
- **Routage** : React Router
- **Authentification** : Better Auth Client
- **Tests** : Vitest

## Notes de développement
- Le backend utilise ESLint avec une configuration stricte
- Le frontend utilise ESLint avec une configuration stricte
- Les deux projets sont prêts pour la conversion TypeScript
- L'authentification est gérée par Better Auth avec support des comptes sociaux
- Le streaming audio est géré par Azuracast via SSE