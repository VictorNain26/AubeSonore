# ============================
# Base stage
# ============================
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
  curl bash postgresql-client \
  && rm -rf /var/cache/apk/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

# ============================
# Dependencies stage
# ============================
FROM base AS dependencies

COPY package.json bun.lock ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production --no-cache

# ============================
# Production stage
# ============================
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

WORKDIR /app

# Copy dependencies and Bun
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /root/.bun /root/.bun

# Copy application source code
COPY . .

# Set correct permissions
RUN chmod +x /app/entrypoint.sh && \
    chown -R appuser:appgroup /app

# Security: Remove unnecessary packages
RUN apk del curl && rm -rf /var/cache/apk/*

# Labels for production
LABEL org.opencontainers.image.title="OurMusic Backend"
LABEL org.opencontainers.image.description="Backend API for OurMusic project"
LABEL org.opencontainers.image.version="1.0.0"
LABEL maintainer="victor.lenain26@gmail.com"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
