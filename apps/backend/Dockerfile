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
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Installer toutes les dépendances avec cache
RUN pnpm install --frozen-lockfile

# Étape 2: Build du backend avec Turborepo
FROM base AS builder
WORKDIR /app

# Copier node_modules depuis deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages ./packages

# Copier les sources
COPY . .

# Build uniquement le backend avec Turbo
RUN npm install -g pnpm@10.13.1
RUN pnpm turbo build --filter=@ourmusic/backend

# Étape 3: Image de production (minimale)
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copier uniquement ce qui est nécessaire pour le runtime
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1))'

EXPOSE 3000

# Démarrer l'application avec Bun
CMD ["bun", "run", "dist/index.js"]
