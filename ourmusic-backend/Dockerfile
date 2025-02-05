# Utiliser une image Node 18 Alpine
FROM node:18-alpine

# Installer les paquets nécessaires, y compris bash
RUN apk add --no-cache curl unzip bash

# Forcer l'utilisation de bash pour les commandes RUN suivantes
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Installer Bun via le script officiel
RUN curl -fsSL https://bun.sh/install | bash

# Ajouter le répertoire d'installation de Bun au PATH
ENV PATH="/root/.bun/bin:${PATH}"

# Revenir au shell par défaut (/bin/sh) pour les étapes suivantes
SHELL ["/bin/sh", "-c"]

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances pour bénéficier du cache Docker
COPY package.json bun.lockb* ./

# Vérifier que la commande bun est bien présente (optionnel)
RUN bun --version

# Installer les dépendances avec bun
RUN bun install

# Copier le reste du code source
COPY . .

# Exposer le port utilisé par votre application (ici 3000)
EXPOSE 3000

# Démarrer l'application en mode watch pour le hot reload
CMD ["bun", "run", "--watch", "app.js"]
