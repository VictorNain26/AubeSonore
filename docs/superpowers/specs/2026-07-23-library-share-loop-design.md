# Boucle découverte → partage : refonte de la bibliothèque et du partage

**Date** : 2026-07-23
**Périmètre** : `apps/frontend` (web) + un endpoint `apps/backend`.
**Prérequis** : l'app `apps/mobile` est supprimée (chore séparé). Plus aucune contrainte de compatibilité mobile — le nettoyage `core`/backend est complet.
**Statut** : design validé, prêt pour le plan d'implémentation.

## Contexte

La modal « Ma bibliothèque » mélange quatre contrôles de niveaux différents (export CSV, « Mettre à jour les liens », sélecteur de plateforme, liste des morceaux). Le vrai job de l'utilisateur — réécouter et partager ce qu'il a aimé — est noyé. En parallèle, le partage envoie des liens de mauvaise qualité et l'ouverture des morceaux affiche souvent une « fausse recherche ».

### Problèmes racine identifiés (lecture du code)

1. **La « fausse recherche »** — Au like, le backend insère `platformLinks: null` puis résout les liens Songlink **en arrière-plan** (`enrichTrackInBackground`). Le frontend ne re-fetch jamais → il continue d'afficher un lien de **recherche** (icône loupe) au lieu du morceau. Le bouton « Mettre à jour les liens » n'est qu'une **béquille manuelle** pour forcer ce re-fetch.
2. **Le partage fuit vers une plateforme tierce** — `getTrackShareUrl` renvoie en priorité un lien Spotify direct ; le message ne ramène jamais vers AubeSonore.
3. **Le `youtubeUrl` est un faux lien** — Au like, `useLikeAction.ts:57` fabrique une **URL de recherche** YouTube (`youtube.com/results?search_query=…`), pas un lien de vidéo. C'est un fallback trompeur.
4. **Le sélecteur de plateforme n'a aucune affordance** — rendu comme un simple bouton bordé, sans chevron ni logo ; l'utilisateur ne voit pas que c'est une sélection.
5. **La suppression est brutale** — retrait optimiste immédiat + toast undo : sur un miss-click, le morceau disparaît sur-le-champ.

## Objectifs

- Rendre la bibliothèque centrée sur **réécouter** et **partager**.
- Partage **pro, instantané, jamais résolu au moment du clic**, portant la marque AubeSonore dans le texte.
- Supprimer définitivement la « fausse recherche » : un bouton « ouvrir » mène toujours à un lien réel, jamais à une recherche déguisée.
- Suppression protégée contre le miss-click, sans dialog lourd.

## Non-objectifs (YAGNI)

- **Pas de nouvelle surface web** (pas de page morceau `aubesonore.fr/t/<id>`, pas de song.link comme destination — jugé « pas pro »).
- **Pas de polling permanent** des liens ; un refetch ponctuel suffit.

## Décisions produit (tranchées)

| Sujet                       | Décision                                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Destination de partage      | **Lien direct de la plateforme préférée** de l'émetteur (celle du compte). Sinon un autre lien plateforme **réel**. Jamais song.link, jamais une recherche. Marque AubeSonore portée par le **texte** du message. |
| Vitesse de partage          | Jamais résolu au clic. Likés = liens déjà en DB. Morceau en cours = **pré-résolu en arrière-plan** via l'ISRC.                                                                                                    |
| Préférence de plateforme    | Migre de la modal vers le **menu compte du header**. Sert à **ouvrir** ses morceaux **et** à choisir le lien de partage.                                                                                          |
| Export CSV                  | Retiré partout (front + helper `core/export`).                                                                                                                                                                    |
| « Mettre à jour les liens » | Retiré partout (front + routes/services backend), remplacé par un **refetch automatique** à l'ouverture de la modal.                                                                                              |
| Suppression                 | **Undo inline** : la ligne ne disparaît pas ; elle passe en « Retiré · Annuler » (grisée) quelques secondes, puis part.                                                                                           |

## Architecture — 4 branches courtes (main-first)

### Branche 1 — Refonte du lien (partage + ouverture), dans `core` + `share`

Le cœur : une résolution unique « meilleur lien plateforme réel ».

- Réviser `getPreferredLink` (`packages/core/src/share.ts`) : `platformLinks[preferred]` → premier `platformLinks` réel → **`null`**. Supprimer le fallback `getSearchUrl` et la notion `isSearch`. Retour : `{ url: string | null }`.
- Réviser `getTrackShareUrl` : même base ; renvoie `null` s'il n'existe aucun lien plateforme réel (plus de fallback songlink/youtube-recherche).
- Supprimer `getSearchUrl` (plus aucun consommateur après nettoyage) — le mobile parti, rien ne le référence.
- `buildShareText` / `shareTrack` : texte inchangé (« … découvert sur AubeSonore ») ; un partage n'est proposé que si un lien réel existe.
- Impact automatique : player (`useTrackActions`) et rail (`RecentTracks`) consomment la nouvelle logique.
- Tests : `share.test.ts`, `shareTrack.test.ts` mis à jour (plus de cas « recherche »).

### Branche 2 — Modal bibliothèque épurée

Fichiers : `LikedTracksModalView.tsx`, `LikedTrackRow.tsx`, `LikedTracksModal.tsx`, stories + tests colocalisés ; suppression de `apps/frontend/src/lib/exportLibrary.ts` et de `packages/core/src/export.ts`.

- **Header modal** : titre + compteur uniquement. Retirer les boutons CSV, « Mettre à jour les liens », et le sélecteur de plateforme.
- **Ligne** (`LikedTrackRow`) : cover · titre/artiste · **ouvrir** (lien réel, `ExternalLink`) · **partager** (nouveau, `Share2`) · **supprimer**. Plus d'icône loupe.
- **Bouton ouvrir** : si `url === null` → désactivé + état « liens en cours de résolution » (pas de lien mort).
- **Bouton partager** : réutilise `shareTrack` ; désactivé si pas de lien réel.
- **Suppression undo-inline** : au clic, la ligne passe en état `pendingRemoval` (grisée, texte « Retiré », bouton « Annuler ») ; après ~5 s sans annulation, appel réel `unlikeTrack`. Annuler restaure la ligne sans requête. Remplace le toast + retrait optimiste actuels.
- **Refetch à l'ouverture** : à l'ouverture de la modal, appeler `useLikedTracksStore.refresh()` pour récupérer les liens résolus au like → la « fausse recherche » disparaît.
- États complets (hover/focus-visible/active/disabled), cibles ≥ 44 px, both themes, addon-a11y clean (rappel `apps/frontend/CLAUDE.md`).

### Branche 3 — Préférence de plateforme dans le menu compte

Fichiers : `LayoutView.tsx`, `Menu.tsx` (potentiel), store `preferencesStore`.

- Ajouter une section « Plateforme préférée » (8 plateformes, `PLATFORMS`) au menu utilisateur du header.
- **Contrainte composant** : `Menu` bascule en mode radio dès qu'un item porte `selected` (`Menu.tsx:29`). Mélanger 8 plateformes (`selected`) et « Déconnexion » (action simple) dans un seul menu casserait la logique. Deux options à trancher au plan : (a) un **sous-menu** « Plateforme préférée » qui ouvre un second niveau radio, puis « Déconnexion » à la racine ; (b) étendre `Menu` pour supporter des **groupes** (radio-group + actions). Préférence : (a), plus petit, sans toucher au primitive.
- Retirer le sélecteur résiduel de la modal (déjà fait en branche 2) ; le store `updatePlatform` reste, seul le point d'entrée UI change.

### Branche 4 — Pré-résolution du morceau en cours (backend + player)

- **Backend** : endpoint léger `GET /api/track/links` (params : `isrc` ou `title`+`artist`) qui renvoie `platformLinks` depuis le cache Songlink (7 j) / `searchSonglink`, en réutilisant l'infrastructure existante. **Doc-first** : vérifier la doc Odesli/iTunes pour la résolution fiable par **ISRC** avant d'implémenter (l'ISRC est exposé par le now-playing, `azuracast/validators.ts:13`).
- **Front (player)** : quand le morceau à l'antenne change, appeler cet endpoint **en arrière-plan** et mémoriser les `platformLinks` du morceau courant → le partage au player devient instantané, sans jamais résoudre au clic.
- Respecter les baselines SSRF/headers backend (`CLAUDE.md`).

## Nettoyage (mobile parti → complet)

- **Front** : boutons CSV & refresh, `apps/frontend/src/lib/exportLibrary.ts`.
- **`core`** : `packages/core/src/export.ts` (`formatAsCSV`, `formatAsTuneMyMusic`, `formatAsSonglinkList`) et `refreshAllLinks`/`refreshLinks` dans `api.ts` — plus aucun consommateur.
- **Backend** : routes `refresh-all-links` + `:trackId/refresh-links` et services `refreshAllLinks`/`refreshTrackLinks`.
- Le champ DB `youtubeUrl`-recherche cesse d'être utilisé ; son retrait du schéma est hors périmètre (déféré).

## Fallbacks & états (transverse)

- **Aucun lien réel** (résolution en cours ou morceau introuvable) : ouvrir/partager **désactivés** avec libellé « liens en cours de résolution ». Jamais de lien mort, jamais de recherche.
- **Reduced motion** : l'undo-inline et les transitions respectent `prefers-reduced-motion` (fallback opacité).

## Tests

- `core/share.test.ts`, `shareTrack.test.ts` : nouvelle priorité de lien, cas `null`, plus de cas recherche.
- `LikedTracksModal.test.tsx` : refetch à l'ouverture, undo-inline (retrait différé + annulation), bouton partager présent, absence des boutons CSV/refresh.
- Backend (bun) : test de l'endpoint `/api/track/links` (cache hit, ISRC, négatif).
- `node scripts/check-contrast.mjs` + typecheck + lint zéro warning avant merge de chaque branche.

## Risques / points doc-first

- **Résolution par ISRC** : à valider contre la doc Odesli/iTunes (branche 4) — ne pas coder de mémoire.
- **`Menu`** : ne pas casser le mode radio existant (branche 3).
- **Nettoyage backend** : vérifier qu'aucune référence résiduelle aux routes/services `refresh*` ne subsiste après suppression.

## Ordre de merge

0. **Chore préalable** : suppression de `apps/mobile` (+ CI `Mobile typecheck` + branch protection).
1. **Branche 1** (lien) — fondation, débloque partage propre partout.
2. **Branche 2** (modal) — dépend de 1.
3. **Branche 3** (plateforme header) — indépendante de 2, peut suivre.
4. **Branche 4** (pré-résolution player) — dépend de 1.
