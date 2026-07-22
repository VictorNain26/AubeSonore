# Backend AubeSonore

API de la webradio, construite avec [Elysia](https://elysiajs.com/) sur [Bun](https://bun.sh/). Elle sert le catalogue « now playing » depuis AzuraCast, gère l'authentification, les likes et leur enrichissement multi-plateformes, et fige les pochettes dans un stockage durable.

## Ce que fait l'API

- **Radio** : proxy de l'historique et du « en train de jouer » AzuraCast.
- **Likes** : ajout / retrait / liste des morceaux aimés.
- **Enrichissement** : résolution des liens multi-plateformes via Songlink/Odesli et métadonnées Last.fm, en tâche de fond.
- **Pochettes durables** : au like, la pochette est snapshotée vers Cloudflare R2 (adressage par contenu) et l'URL devient stable.
- **Auth** : [Better Auth](https://www.better-auth.com/) — email vérifié requis, OAuth Google et Spotify, cookies sécurisés, rate limiting.
- **Notifications push** (Web Push / VAPID) et **statistiques d'écoute**.
- **Sécurité** : garde SSRF (`assertSafeUrl`), en-têtes de sécurité, rate limiting par IP/utilisateur.

## Prérequis

- [Bun](https://bun.sh/) installé localement
- Une base **PostgreSQL** accessible

## Installation

```bash
bun install
cp .env.example .env   # renseigner les variables ci-dessous
```

Variables principales (liste complète dans `.env.example`) :

- `DATABASE_URL` — connexion PostgreSQL
- `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` — configuration Better Auth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth Google
- `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`, `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`
- `AZURACAST_BASE_URL`, `AZURACAST_API_KEY`, `AZURACAST_STATION_ID`
- `LASTFM_API_KEY` — métadonnées
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — Web Push
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `COVERS_PUBLIC_URL` — pochettes durables (optionnel ; sans ces valeurs, le snapshot est un no-op)

## Développement

```bash
bun run db:push   # synchronise le schéma Drizzle vers la base
bun run start     # démarre l'API
```

Santé : [http://localhost:3000/health](http://localhost:3000/health).

## Scripts utiles

- `bun run db:push` — pousse le schéma (dev + prod)
- `bun run db:generate` — génère une migration versionnée
- `bun run seed:admin` — crée un compte administrateur
- `bun run reset:all` — réinitialise la base
- `bun run scripts/backfill-covers.ts` — snapshot des pochettes des likes existants vers R2 (idempotent)
- `bun test` — tests (bun)
- `bun run lint` / `bun run typecheck`

## Base de données (Drizzle)

Le schéma (`src/db/schema.ts`) est la source de vérité ; les index sont déclarés inline. `db:push` synchronise directement (dev + prod). Les migrations appliquées sont suivies dans `__app_migrations` et rejouées au démarrage.

## Déploiement

Servie sur un VPS auto-hébergé, exposée via Cloudflare Tunnel. Docker : voir `docker-compose.yml` à la racine.

## Licence

MIT
