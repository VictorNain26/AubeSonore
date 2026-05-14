# =============================================================================
# AubeSonore Backend — Dockerfile for Koyeb
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: install all workspace deps
# -----------------------------------------------------------------------------
FROM node:22-slim AS deps
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/core/package.json ./packages/core/

RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 2: build shared packages
# -----------------------------------------------------------------------------
FROM deps AS builder

COPY packages ./packages
COPY apps/backend ./apps/backend
COPY tsconfig.base.json ./

RUN pnpm --filter @aubesonore/shared-types build && \
    pnpm --filter @aubesonore/core build

# -----------------------------------------------------------------------------
# Stage 3: minimal runtime
# -----------------------------------------------------------------------------
FROM oven/bun:slim AS runner

# Non-root user (matching apps/backend/Dockerfile convention)
RUN groupadd --system --gid 1001 bunjs && \
    useradd --system --uid 1001 --gid bunjs bunjs

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend ./apps/backend

RUN chown -R bunjs:bunjs /app

USER bunjs

WORKDIR /app/apps/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
