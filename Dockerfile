# Root Dockerfile for Koyeb deployment
# Builds the backend from monorepo context

FROM node:20-slim AS base
WORKDIR /app

# Install bun and pnpm
RUN npm install -g pnpm@10.13.1 && \
    curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

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
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules 2>/dev/null || true
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
RUN pnpm --filter @ourmusic/shared-types build || true && \
    pnpm --filter @ourmusic/shared-utils build || true && \
    pnpm --filter @ourmusic/backend build || true

# Production stage
FROM node:20-slim AS runner
WORKDIR /app

# Install bun for runtime
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
ENV NODE_ENV=production

# Copy built application and dependencies
COPY --from=builder /app/apps/backend/dist ./dist 2>/dev/null || true
COPY --from=builder /app/apps/backend/src ./src
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/drizzle ./drizzle
COPY --from=builder /app/apps/backend/drizzle.config.js ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

EXPOSE 3000

# Run with bun - fallback to src if dist doesn't exist
CMD ["sh", "-c", "if [ -f dist/index.js ]; then bun run dist/index.js; else bun run src/index.ts; fi"]
