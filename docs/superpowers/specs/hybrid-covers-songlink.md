# Covers hybrides + fiabilité Songlink (suppression R2)

## Décision

Abandonner le snapshot R2 des pochettes. À la place, approche **hybride** :

- **Cover réelle quand une source externe durable existe** (CDN Apple via iTunes, vérifié) → on stocke l'URL, jamais d'octets.
- **Trou** (morceau introuvable/non vérifié) → visuel **onde** généré, déterministe par morceau, rendu côté front.
- **R2 supprimé** entièrement (aucune provision prod n'a eu lieu — retour arrière propre).

## Validation empirique (16 morceaux réels de la station)

- 13/16 (81%) → match iTunes **vérifié** (vraie cover durable), même pour des émergents.
- 1/16 rejeté par la vérification : iTunes renvoyait « The Sophs — HOUSE » pour « The Sophs — GOLDSTAR » (mauvais morceau) → sans vérification = **mauvaise cover**. Attrapé.
- 2/16 sans résultat iTunes → onde (vrai trou).
- Le top-résultat iTunes était toujours le meilleur quand présent. Seuil retenu : `title ≥ 0.60` **et** `artist ≥ 0.55` (similarité normalisée).

## Backend

### Suppression R2

Supprimer : `services/coverService.ts` (+ test), `lib/storage/coverStore.ts` (+ test), `scripts/backfill-covers.ts`, les variables R2 (`config/env.ts` : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `COVERS_PUBLIC_URL`), leurs entrées dans `.env.example`, et la section « Covers durables (R2) » du `apps/backend/CLAUDE.md`. Retirer le seam `coverSnapshot` de `trackService.ts`.

### Songlink : vérification du match (`services/songlinkService.ts`)

Le bug : `searchItunes` prend `results[0]` sans vérifier → mauvaise cover pour un émergent. Fix :

- Nouvelle fonction pure de normalisation + similarité (module dédié `lib/text/matchScore.ts`) :
  - `normalize(s)` : minuscules, retrait des accents (NFKD→ASCII), suppression `feat`/parenthèses, réduction aux `[a-z0-9]+`.
  - `similarity(a, b)` : ratio type Levenshtein/`SequenceMatcher` sur chaînes normalisées, ∈ [0,1].
  - `isMatch(query, candidate)` : `similarity(title) ≥ 0.60 && similarity(artist) ≥ 0.55`.
- `searchItunes(title, artist)` : requête `limit=3`, calcule le score de chaque résultat, garde le **meilleur** ; si aucun ne passe `isMatch` → **`null`** (pas de cover). Ne cache un négatif que sur un vrai « 0 result » ou un rejet déterministe (pas sur erreur transitoire).
- `searchSonglink` inchangé dans son rôle : il enrichit les **liens** multi-plateformes à partir de l'URL iTunes vérifiée. Il n'est plus responsable de la cover — la cover vient de l'`artworkUrl` iTunes vérifié.

### Enrichissement (`services/trackService.ts`)

Les 3 sites (`enrichTrackInBackground`, `refreshAllLinks`, `refreshTrackLinks`) :

- `verifiedArt = songlinkData?.artworkUrl ?? null` (déjà issu du match vérifié).
- `update.artworkUrl = verifiedArt ?? existingAzuracastUrl` — on **garde l'URL AzuraCast** quand aucune source durable (la vraie cover s'affiche tant qu'elle vit ; le front bascule sur l'onde à l'erreur). On n'écrase jamais une URL durable par l'éphémère.
- Plus aucun appel de snapshot.

## Frontend

### Visuel onde (`design/atoms/Thumbnail.tsx` + `design/organisms/TrackArtwork.tsx`)

Le repli actuel (`src` absente ou `onError`) affiche une icône `Music` générique. Le remplacer par un visuel **onde/dégradé déterministe** :

- Nouveau composant `design/atoms/CoverGlyph.tsx` : rend un dégradé + motif d'onde **statique** (SVG/CSS, pas d'animation par frame), teinté par un **hash déterministe** de `${artist}|${title}` → teinte(s). Même morceau = même visuel, stable et reconnaissable.
- `Thumbnail` et `TrackArtwork` : quand pas d'image (absente ou erreur), rendre `CoverGlyph` (avec `seed` = artiste+titre) au lieu de l'icône.
- Respect tokens uniquement (couleurs dérivées via HSL sur la palette du design system, jamais de hex en dur hors `tokens.css` si possible — sinon teinte calculée acceptable car dynamique par nature ; à cadrer dans le plan).
- `prefers-reduced-motion` sans objet (visuel statique). Perf : négligeable sur longue liste (rendu unique, pas de canvas animé).

Story Storybook pour `CoverGlyph` (états : plusieurs seeds, deux thèmes).

## Tests

- **Unitaires** `matchScore` : normalisation (accents, feat, casse, ponctuation), seuils (le cas GOLDSTAR/HOUSE rejeté, les vrais matchs acceptés).
- **Unitaires** `searchItunes` (mock fetch) : bon résultat vérifié → renvoie artwork ; mauvais top-résultat → `null` ; 0 result → `null` caché ; erreur transitoire → `null` non caché.
- **Harnais empirique** (script, non-CI) : rejoue une liste de morceaux réels contre iTunes et imprime le taux de match — pour re-mesurer après tuning du seuil. Pas dans la suite (dépend du réseau).
- **Frontend** : story `CoverGlyph` + non-régression `Thumbnail` (repli = onde).

## Hors périmètre

- 2e résolveur (Spotify client-credentials, MusicBrainz/Cover Art Archive) — écarté volontairement (complexité + config), le trou tombe sur l'onde.
- Redimensionnement/proxy d'images — inutile (URLs CDN externes ou éphémères, pas d'octets chez nous).
