# Frontend Dockerfile - React + Vite
FROM node:20-alpine AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_AZURACAST_BASE_URL
ARG VITE_SITE_BASE_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AZURACAST_BASE_URL=$VITE_AZURACAST_BASE_URL
ENV VITE_SITE_BASE_URL=$VITE_SITE_BASE_URL

RUN pnpm build

# Production stage - serve with nginx
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
