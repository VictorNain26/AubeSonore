# Root Dockerfile for Koyeb deployment
# Builds the backend from monorepo context

FROM oven/bun:1 AS base
WORKDIR /app

# Install pnpm for workspace resolution
RUN npm install -g pnpm@10.13.1

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy all package.json files for dependency resolution
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/logger/package.json ./packages/logger/

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared-utils/node_modules ./packages/shared-utils/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/logger/node_modules ./packages/logger/node_modules 2>/dev/null || true

# Copy source files
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/logger ./packages/logger
COPY apps/backend ./apps/backend

# Build shared packages first, then backend
WORKDIR /app
RUN pnpm --filter @ourmusic/shared-types build && \
    pnpm --filter @ourmusic/shared-utils build && \
    pnpm --filter @ourmusic/backend build

# Production stage
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built application and dependencies
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/drizzle ./drizzle
COPY --from=builder /app/apps/backend/drizzle.config.js ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs
USER bunjs

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
