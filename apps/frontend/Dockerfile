# 🛠️ Étape 1 : Build Vite avec PNPM
FROM node:20-alpine AS builder

# Répertoires de travail
WORKDIR /app

# Copie des fichiers nécessaires en priorité pour profiter du cache Docker
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY . .

# Activation et installation de PNPM
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate

# Installation des dépendances avec verrouillage strict
RUN pnpm install --frozen-lockfile

# Build Vite
RUN pnpm build

# 🧩 Étape 2 : Serveur Nginx minimal pour production
FROM nginx:stable-alpine

# Suppression de la conf par défaut (optionnelle selon image)
RUN rm -f /etc/nginx/conf.d/default.conf

# Copie des fichiers de build dans le dossier Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copie de ta configuration Nginx personnalisée
COPY default.conf /etc/nginx/conf.d/default.conf

# Exposition du port HTTP
EXPOSE 80

# Lancement de Nginx au démarrage
CMD ["nginx", "-g", "daemon off;"]
