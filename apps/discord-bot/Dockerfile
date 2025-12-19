# Dockerfile optimisé pour monorepo Turborepo + Bun
FROM oven/bun:1 AS base

# Étape 1: Installer PNPM et préparer les dépendances
FROM base AS deps
WORKDIR /app

# Installer PNPM
RUN npm install -g pnpm@10.13.1

# Copier les fichiers de configuration du monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copier les package.json de tous les workspaces
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Installer toutes les dépendances avec cache
RUN pnpm install --frozen-lockfile

# Étape 2: Build du discord-bot avec Turborepo
FROM base AS builder
WORKDIR /app

# Copier node_modules depuis deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/discord-bot/node_modules ./apps/discord-bot/node_modules
COPY --from=deps /app/packages ./packages

# Copier les sources
COPY . .

# Build uniquement le discord-bot avec Turbo
RUN npm install -g pnpm@10.13.1
RUN pnpm turbo build --filter=@ourmusic/discord-bot

# Étape 3: Image de production (minimale)
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire pour le runtime
COPY --from=builder /app/apps/discord-bot/dist ./dist
COPY --from=builder /app/apps/discord-bot/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Démarrer le bot Discord avec Bun
CMD ["bun", "run", "dist/index.js"]
