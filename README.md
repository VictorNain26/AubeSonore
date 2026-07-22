# AubeSonore

Webradio moderne : diffusion AzuraCast, likes multi-plateformes, et une identité visuelle qui suit le moment de la journée. Monorepo pnpm + Turbo (backend Bun/Elysia, frontend Vite/React, application mobile Expo).

## Architecture

```
aubesonore/
├── apps/
│   ├── backend/          # API Bun + Elysia + Drizzle + PostgreSQL
│   ├── frontend/         # Vite + React 19 + Tailwind 4 (PWA)
│   └── mobile/           # Expo (React Native) — Android/iOS
├── packages/
│   ├── core/             # Logique agnostique de plateforme (partagée front ↔ mobile)
│   └── shared-types/     # Types partagés backend ↔ clients
├── docker-compose.yml        # Stack de production
└── docker-compose.dev.yml    # PostgreSQL local (dev)
```

## Fonctionnalités

- **Écoute** : flux AzuraCast avec « en train de jouer » en temps réel.
- **Like & liens multi-plateformes** : likez un morceau, ses liens Spotify / Apple Music / Deezer / YouTube Music / Tidal / Amazon / SoundCloud sont résolus automatiquement via Songlink/Odesli.
- **Pochettes** : à l'enrichissement, la pochette iTunes est retenue quand l'artiste correspond ; à défaut, un visuel « onde » déterministe est généré côté client.
- **Identité jour/nuit** : l'ambiance visuelle suit le moment (aube, jour, crépuscule, nuit).
- **Fil-journée** : historique d'écoute regroupé par moment de la journée.
- **Notifications push** (Web Push / VAPID) et **statistiques d'écoute**.
- **PWA** installable, et **application mobile** Expo.

## Stack

| Couche    | Technologies                                                |
| --------- | ----------------------------------------------------------- |
| Backend   | Bun, Elysia, Drizzle ORM + PostgreSQL, Better Auth, Valibot |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Zustand, Storybook        |
| Mobile    | Expo SDK 55, React Native 0.83, Reanimated, nativewind      |
| Outillage | pnpm 10, Turbo, ESLint 9 (flat), Vitest + bun test          |

Auth : Better Auth (email vérifié + OAuth Google/Spotify). Liens multi-plateformes : Songlink/Odesli. Pochettes : iTunes vérifiée (artiste) ou visuel « onde » généré côté client.

## Démarrage

### Prérequis

- Node.js ≥ 20, pnpm ≥ 10, Bun (backend)
- Docker (optionnel, pour PostgreSQL local)

### Installation

```bash
pnpm install

# Environnements (voir les .env.example pour la liste complète)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# PostgreSQL local (option Docker)
docker compose -f docker-compose.dev.yml up -d

# Appliquer le schéma
cd apps/backend && bun run db:push && cd -

# Tout démarrer (Turbo)
pnpm dev
```

- Frontend : http://localhost:5173
- Backend : http://localhost:3000

## Commandes

```bash
pnpm dev                       # tous les apps (turbo dev)
pnpm dev:backend / dev:frontend
pnpm build                     # build tous les apps
pnpm lint                      # eslint .
pnpm typecheck                 # turbo typecheck
pnpm format:check              # prettier --check

pnpm --filter @aubesonore/frontend test          # Vitest
pnpm --filter @aubesonore/frontend storybook     # Storybook (design system) sur :6006
pnpm --filter @aubesonore/backend test           # bun test
```

Détails par app : [backend](apps/backend/README.md) · [frontend](apps/frontend/README.md) · [mobile](apps/mobile/README.md).

## Dépendances (Renovate)

Les mises à jour sont gérées par **Renovate** (`renovate.json`, source de vérité de la policy). Les updates sûres (patch/minor des devDependencies, patches runtime stables, GitHub Actions) sont **auto-mergées après CI verte** ; majors, stack mobile (Expo/React Native) et images Docker passent en **revue manuelle**. Les alertes de sécurité restent gérées par Dependabot. Le _Dependency Dashboard_ (issue GitHub) liste ce qui est en attente.

## Déploiement

- **Frontend** : Vercel (déploiement automatique depuis `master`).
- **Backend** : VPS auto-hébergé, exposé via Cloudflare Tunnel (le flux radio passe par `radio.aubesonore.fr`).
- **Base de données** : PostgreSQL.

`master` est protégée : une PR ne merge que si les 4 checks CI passent (Quality, Backend tests, Build all, Mobile typecheck). Voir [`CLAUDE.md`](CLAUDE.md) pour les conventions et le workflow.

## Licence

MIT
