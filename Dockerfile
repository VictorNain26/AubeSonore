# =============================================================================
# OurMusic Backend - Dockerfile for Koyeb Deployment
# Based on official Node.js + corepack + Bun documentation
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies Installation
# Using node:20-slim with corepack for pnpm (as per pnpm Docker docs)
# -----------------------------------------------------------------------------
FROM node:20-slim AS deps

# Enable corepack for pnpm support (Node.js official method)
RUN corepack enable pnpm

WORKDIR /app

# Copy only files needed for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/logger/package.json ./packages/logger/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: Build shared packages
# -----------------------------------------------------------------------------
FROM deps AS builder

# Copy source files
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY tsconfig.base.json ./

# Build shared packages that export from dist/
RUN pnpm --filter @ourmusic/shared-types build && \
    pnpm --filter @ourmusic/shared-utils build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# Using oven/bun:slim for minimal Bun runtime (as per Bun Docker docs)
# -----------------------------------------------------------------------------
FROM oven/bun:slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files for workspace resolution
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy node_modules (pnpm structure)
COPY --from=builder /app/node_modules ./node_modules

# Copy built shared packages
COPY --from=builder /app/packages ./packages

# Copy backend application
COPY --from=builder /app/apps/backend ./apps/backend

# Set working directory to backend
WORKDIR /app/apps/backend

# Expose port
EXPOSE 3000

# Run with Bun (executes TypeScript directly)
CMD ["bun", "run", "src/index.ts"]
