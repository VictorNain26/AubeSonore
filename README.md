# AubeSonore

Webradio moderne : diffusion AzuraCast, likes multi-plateformes, et une identité visuelle qui suit le moment de la journée. Monorepo pnpm + Turbo (backend Bun/Elysia, frontend Vite/React).

## Architecture

```
aubesonore/
├── apps/
│   ├── backend/          # API Bun + Elysia + Drizzle + PostgreSQL
│   └── frontend/         # Vite + React 19 + Tailwind 4 (PWA)
├── packages/
│   ├── core/             # Logique agnostique de plateforme (partagée entre apps)
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
- **PWA** installable.

## Stack

| Couche    | Technologies                                                |
| --------- | ----------------------------------------------------------- |
| Backend   | Bun, Elysia, Drizzle ORM + PostgreSQL, Better Auth, Valibot |
| Frontend  | React 19, Vite 8, Tailwind CSS 4, Zustand, Storybook        |
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

Détails par app : [backend](apps/backend/README.md) · [frontend](apps/frontend/README.md).

## Dépendances

Les PR de dépendances viennent des **mises à jour de sécurité Dependabot** (alertes et correctifs automatiques activés dans les réglages du dépôt, sans `.github/dependabot.yml`, donc sans mises à jour de version planifiées). Elles passent la CI et sont mergées **à la main** : aucune n'est auto-mergée. Les autres montées de version se font manuellement.

`renovate.json` décrit une policy Renovate (auto-merge des updates sûres, revue manuelle des majors), mais Renovate n'a jamais ouvert de PR ni de _Dependency Dashboard_ sur ce dépôt : cette configuration n'est pas active.

## Déploiement

Toute la stack est auto-hébergée sur le même serveur et exposée via Cloudflare Tunnel ; le flux radio passe par `radio.aubesonore.fr`.

- **Frontend** : SPA statique buildée par `apps/frontend/Dockerfile`, servie par nginx (`aubesonore.fr`), publiée sur la loopback en `127.0.0.1:3002`.
- **Backend** : Bun/Elysia (`api.aubesonore.fr`), publié en `127.0.0.1:3001`.
- **Base de données** : PostgreSQL.

Le déploiement est automatique et _pull-based_ : merger sur `master` suffit. Sur le serveur, le timer systemd utilisateur `aubesonore-deploy.timer` lance toutes les 2 minutes [`scripts/deploy.sh`](scripts/deploy.sh), qui compare le checkout à `origin/master` (`git ls-remote`) et, quand `master` a bougé :

1. `git merge --ff-only` vers la nouvelle révision ;
2. `docker compose up -d --build --remove-orphans` ;
3. attend que tous les healthchecks soient verts (échec au-delà de 300 s) ;
4. supprime les images de plus de 72 h.

Aucun runner self-hosted ni webhook entrant : le dépôt est public, et le polling ne demande ni credential ni port ouvert. Un changement de `apps/backend/src/db/schema.ts` bloque le déploiement, car `bun db:push` reste manuel (il peut supprimer des colonnes) : appliquer le push à la main, puis relancer `systemctl --user start aubesonore-deploy`.

Installation, une fois, sur le serveur (unités et script supposent le checkout dans `~/radio/aubesonore` ; ailleurs, ajuster `ExecStart` et définir `REPO_DIR`) :

```bash
ln -s <checkout>/scripts/systemd/* ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now aubesonore-deploy.timer aubesonore-backup.timer
loginctl enable-linger <utilisateur>   # les timers tournent sans session ouverte
journalctl --user -u aubesonore-deploy # logs
```

`aubesonore-backup.timer` lance chaque nuit (03:30) [`scripts/backup-db.sh`](scripts/backup-db.sh) : un `pg_dump -Fc` vers un disque physiquement séparé de celui du volume Docker, vérifié par `pg_restore --list` et conservé 14 jours.

Les variables `VITE_*` sont inlinées **au build** (ce ne sont pas des secrets) : changer l'URL de l'API impose un `--build`, pas un simple restart.

`master` est protégée : une PR ne merge que si les 3 checks CI passent (Quality, Backend tests, Build all). Voir [`CLAUDE.md`](CLAUDE.md) pour les conventions et le workflow.

## Licence

MIT
