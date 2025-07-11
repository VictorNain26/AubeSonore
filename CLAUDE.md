# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `pnpm run dev` - Démarrer le serveur de développement (port 5173)
- `pnpm run build` - TypeScript compilation + Vite build  
- `pnpm run lint` - Linter le code avec ESLint strict
- `pnpm run lint:fix` - Corriger automatiquement les erreurs de lint
- `pnpm run typecheck` - Vérification TypeScript sans compilation
- `pnpm run test` - Lancer les tests Vitest
- `pnpm run preview` - Prévisualiser le build de production

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

## Architecture Frontend

### Structure des dossiers
```
src/
├── components/          # Composants React réutilisables
│   ├── ui/             # Composants UI base (style Shadcn/ui)
│   ├── AzuracastPlayer.tsx
│   ├── ModernHeader.tsx
│   └── Sidebar.tsx
├── hooks/              # Hooks React personnalisés
│   ├── useAuth.ts      # Logique d'authentification
│   ├── useSSE.ts       # Server-Sent Events
│   └── useLikedTracks.ts
├── layout/             # Composants de mise en page
│   ├── ModernLayout.tsx
│   └── PageWrapper.tsx
├── lib/                # Services et utilitaires core
│   ├── authClient.ts   # Configuration Better Auth
│   ├── playerService.ts # Service audio avec Zustand
│   └── utils.ts        # Fusion classes Tailwind
├── pages/              # Composants de pages
├── utils/              # Fonctions utilitaires
│   ├── api.ts          # Client API avec gestion d'erreur
│   ├── config.ts       # Variables d'environnement
│   └── queryClient.ts  # Configuration React Query
└── index.css          # Styles globaux avec variables CSS
```

### Patterns d'architecture

**State Management:**
- **Zustand** pour l'état du lecteur audio (volume, lecture, track courante)
- **React Query** pour l'état serveur (API, cache, synchronisation)
- **Better Auth** pour l'état d'authentification avec auto-refresh

**Authentification:**
- Configuration Better Auth avec email/password + social login
- Gestion automatique des sessions avec cookies HttpOnly
- Redirections automatiques après vérification email

**Real-time:**
- **Server-Sent Events (SSE)** pour les mises à jour radio en temps réel
- Hook personnalisé `useSSE` avec reconnexion automatique
- Synchronisation lecteur avec informations track live

**API Integration:**
- Fonction `apiFetch` personnalisée avec gestion CORS et credentials
- Configuration basée sur les variables d'environnement
- Gestion centralisée des erreurs avec toasts

### Conventions de code

**TypeScript strict:**
- Types explicites requis pour toutes les fonctions (`explicit-function-return-type`)
- Interdiction du type `any` (`no-explicit-any`)
- Expressions booléennes strictes (`strict-boolean-expressions`)
- Tous les composants doivent avoir des interfaces TypeScript

**Composants:**
- Style Shadcn/ui avec `class-variance-authority`
- Props typées avec interfaces TypeScript
- Patterns de composition pour les composants complexes

**Styles:**
- Tailwind CSS 4.x avec variables CSS personnalisées
- Design system avec thème sombre et effets glass/neon
- Classes utilitaires avec `tailwind-merge` pour éviter les conflits

## Notes de développement
- **ESLint extremement strict** : types explicites obligatoires, pas de `any`, expressions booléennes strictes
- **PNPM obligatoire** pour la gestion des dépendances (version 10.13.1)
- **Authentification** gérée par Better Auth avec support complets des comptes sociaux
- **Streaming audio** géré par Azuracast via SSE avec hook personnalisé
- **PWA ready** avec service worker et support installation
- **Tests** configurés avec Vitest pour les tests unitaires