# Mobile AubeSonore

Application mobile de la webradio, en [Expo](https://expo.dev/) (React Native). Elle consomme la même API backend et partage sa logique métier via `@aubesonore/core`.

## Stack

- Expo SDK 55, React Native 0.83 (New Architecture)
- Expo Router (écrans dans `src/app/`)
- Reanimated, nativewind (Tailwind pour React Native)
- Zustand (slices partagées depuis `packages/core`)

## Prérequis

- [Bun](https://bun.sh/) / pnpm (installés à la racine du monorepo)
- Un simulateur iOS / émulateur Android, ou l'app **Expo Go** sur un appareil
- Un compte [EAS](https://expo.dev/eas) pour les builds et soumissions

## Développement

```bash
pnpm --filter @aubesonore/mobile dev     # expo start
# puis : i (iOS), a (Android), w (web)

pnpm --filter @aubesonore/mobile ios     # build natif + simulateur iOS
pnpm --filter @aubesonore/mobile android # build natif + émulateur Android
```

## Builds & distribution (EAS)

```bash
pnpm --filter @aubesonore/mobile build:preview      # build EAS (canal preview)
pnpm --filter @aubesonore/mobile build:production    # build EAS (production)
pnpm --filter @aubesonore/mobile update:production    # OTA update (production)
pnpm --filter @aubesonore/mobile submit:android       # soumission store
```

## Qualité

```bash
pnpm --filter @aubesonore/mobile lint
pnpm --filter @aubesonore/mobile typecheck
```

> Les bumps de la stack mobile (Expo / React Native) passent en revue manuelle via Renovate — voir la racine.

## Licence

MIT
