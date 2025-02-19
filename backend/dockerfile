# Utiliser l'image Node 18 Alpine (minimale)
FROM node:18-alpine

# Installer les paquets nécessaires (on ajoute firefox)
RUN apk add --no-cache curl unzip bash python3 py3-pip pipx ffmpeg firefox

# Installer Bun via le script officiel
RUN curl -fsSL https://bun.sh/install | bash

# Ajouter Bun au PATH
ENV BUN_INSTALL="/root/.bun"
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

# Vérifier l'installation de Bun
RUN bun --version

# Configurer pipx et installer spotdl + yt-dlp
ENV PIPX_BIN_DIR=/usr/local/bin
ENV PIPX_HOME=/usr/local/pipx
RUN pipx ensurepath
RUN pipx install spotdl --system-site-packages
RUN pipx install yt-dlp --system-site-packages

# Vérifier que spotdl et yt-dlp sont bien installés
RUN spotdl --version && which spotdl
RUN yt-dlp --version && which yt-dlp

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json bun.lockb* ./

# Installer les dépendances avec Bun
RUN bun install

# Copier le reste du code source
COPY . .

# Exposer le port de Bun (3000, par défaut)
EXPOSE 3000

# Démarrer l'application Bun (index.js)
CMD ["bun", "index.js"]
