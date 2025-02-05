FROM node:18-alpine

WORKDIR /app

# Installer curl (ainsi que pnpm globalement)
RUN apk add --no-cache curl && npm install -g pnpm

# Copier les fichiers de dépendances pour profiter du cache
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copier le reste du code source
COPY . .

# Exposer le port utilisé par Vite (par défaut 5173)
EXPOSE 5173

# Lancer le serveur de développement Vite (qui gère le HMR)
CMD ["pnpm", "run", "dev"]
