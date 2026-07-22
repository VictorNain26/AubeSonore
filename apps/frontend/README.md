# Frontend AubeSonore

Application React/Vite de la webradio **AubeSonore** : écoute du flux AzuraCast, likes, et un design system « jour/nuit » documenté dans Storybook.

## Fonctionnalités

- Lecture du flux AzuraCast avec « en train de jouer » en temps réel
- Authentification (inscription, connexion, réinitialisation) via `better-auth`
- Morceaux aimés avec liens multi-plateformes et pochettes durables
- Identité visuelle qui suit le moment de la journée (aube, jour, crépuscule, nuit)
- Application installable (PWA)

## Design system

Interface bâtie sur un design system tokenisé (Tailwind v4, `@theme` dans `src/design/tokens.css`), organisé atomiquement dans `src/design/{foundations,atoms,molecules,organisms}`. Règles : tokens uniquement (aucune valeur hex/px en dur), thème sombre via l'attribut `data-theme="dark"`, contraste vérifié en CI (`scripts/check-contrast.mjs`). Conventions détaillées dans [`CLAUDE.md`](CLAUDE.md).

## Storybook

Storybook est la **source de vérité de l'UI** : chaque composant `atoms/`/`molecules/`/`organisms/` a une story colocalisée, couvrant tous ses états dans les deux thèmes.

```bash
pnpm --filter @aubesonore/frontend storybook        # dev sur http://localhost:6006
pnpm --filter @aubesonore/frontend build-storybook  # build statique
```

- **Framework** : `@storybook/react-vite` (Storybook 10). Tables de props générées depuis les types TS + JSDoc (`react-docgen-typescript`), autodocs activé.
- **Addons** : a11y (accessibilité, doit rester propre), docs, mcp.
- **Thème** : bascule Clair/Sombre via la barre d'outils « Thème » (applique `data-theme`).
- **Organisation** : les stories sont triées `Fondations → Atoms → Molecules → Organisms → Templates → Pages`.

Standard d'écriture des stories (CSF3, args, une story par état, `Showcase`) : voir la section « Storybook documentation standard » de [`CLAUDE.md`](CLAUDE.md).

**Serveur MCP (agents IA)** : l'addon `mcp` expose un serveur MCP sur `/mcp`, servi par le Storybook en cours d'exécution. Il est déclaré dans le `.mcp.json` racine (`storybook` → `http://localhost:6006/mcp`). Pour qu'un agent l'utilise : lancer Storybook en local, puis approuver le serveur via `claude` (les serveurs MCP de projet sont en attente d'approbation par défaut).

## Installation

```bash
pnpm install
cp .env.example .env
```

Variables (`.env.example`) :

- `VITE_API_URL` — URL de l'API backend
- `VITE_AZURACAST_BASE_URL` — serveur AzuraCast
- `VITE_STATION_SHORTCODE` — shortcode de la station
- `VITE_SITE_BASE_URL` — URL publique du site

## Développement

```bash
pnpm dev          # Vite sur http://localhost:5173
pnpm build        # build de production dans dist/
pnpm preview      # prévisualisation du build
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit
pnpm check:contrast   # contraste des tokens (wired en CI)
```

## Déploiement

Déployé sur **Vercel** (déploiement automatique depuis `master`). Un `Dockerfile` (service via Nginx) est aussi fourni.

## Licence

MIT
