# OurMusic Frontend

Frontend React/Vite pour la webradio collaborative **OurMusic**.
Cette application permet d’écouter la radio en streaming, de liker des morceaux et de synchroniser vos favoris sur Spotify.

## Fonctionnalités

- Lecture du flux AzuraCast avec mise à jour en temps réel via SSE
- Authentification (inscription, connexion, réinitialisation) grâce à `better-auth`
- Liste des morceaux aimés et synchronisation facultative avec Spotify
- Interface responsive propulsée par Tailwind CSS
- Application installable (PWA)

## Installation

1. Installez les dépendances :
   ```bash
   pnpm install
   ```
2. Copiez `.env.exemple` vers `.env` puis renseignez :
   - `VITE_API_BASE_URL` : URL de l’API backend
   - `VITE_AZURACAST_BASE_URL` : URL de votre serveur AzuraCast
   - `VITE_SITE_BASE_URL` : URL publique du site

## Développement

Lancez le serveur Vite avec :
```bash
pnpm dev
```
L’application est disponible sur <http://localhost:5173>.

## Build production

```bash
pnpm build
```
Le répertoire `dist/` contient alors les fichiers statiques.

### Docker

Un `Dockerfile` est fourni pour servir l’application via Nginx :
```bash
docker build -t ourmusic-frontend .
docker run -p 80:80 ourmusic-frontend
```

## Tests

Les tests Vitest (si configurés) peuvent être lancés avec :
```bash
pnpm test
```

## Déploiement

Le workflow GitHub [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) permet un déploiement automatique sur serveur via SSH.
