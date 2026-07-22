# Pochettes durables (cover snapshot vers R2)

## Problème

Une liked track stocke une **URL** de pochette (`liked_tracks.artwork_url`). Au like, cette URL pointe souvent vers le média AzuraCast (`now_playing.song.art`). Quand le fichier est supprimé du dossier AzuraCast, l'URL renvoie 404 → pochette cassée sur le front.

`enrichTrackInBackground` remplace déjà `artworkUrl` par celui de Songlink (CDN Apple Music, durable) **quand un match existe**. Mais AubeSonore diffuse des **artistes émergents souvent absents d'Apple Music / Spotify** : pour eux, Songlink ne trouve rien et l'URL reste celle d'AzuraCast, éphémère.

## Objectif

**Toujours afficher la vraie pochette**, indépendamment de la durée de vie du fichier dans AzuraCast, y compris pour les artistes hors plateformes. Pas de fallback comme solution : le fallback icône reste un ultime filet, jamais le résultat attendu.

## Principe

Au moment du like, l'URL source (AzuraCast ou Apple) est **valide**. On en **snapshotte les octets** vers un stockage durable qu'on possède (**Cloudflare R2**), et `artwork_url` devient une **URL R2 stable**. La pochette survit à toute suppression AzuraCast.

Politique validée : **snapshot de toutes les pochettes** (même quand un CDN externe existe) → contrôle total, zéro dépendance à un hotlink tiers.

## Architecture

```
like (front, artworkUrl = AzuraCast art)
  → likeTrack (persiste tel quel, temporairement)
  → enrichTrackInBackground (existant, asynchrone)
       ├─ searchSonglink → platformLinks + éventuelle art Apple
       ├─ bestSource = art Apple (si trouvée, meilleure résolution) sinon artworkUrl AzuraCast
       ├─ coverService.snapshotCover(bestSource) → URL R2 publique
       └─ UPDATE liked_tracks SET artwork_url = <URL R2>, platformLinks, songlinkUrl…
```

- **Stockage** : bucket R2 `aubesonore-covers`, exposé en lecture publique via domaine custom **`covers.aubesonore.fr`** (Cloudflare, cache edge, objets immuables). Aucune charge backend au service des covers.
- **Client** : `Bun.S3Client` natif (endpoint R2). **Aucune dépendance ajoutée** (pas d'`@aws-sdk`) — validé contre [bun.sh/docs/runtime/s3](https://bun.sh/docs/runtime/s3).
- **Adressage par contenu** : clé = `covers/<sha256(bytes)>.<ext>` → dédup automatique (deux morceaux, même pochette = un objet) et cache immuable légitime.

## Composants et interfaces

### `apps/backend/src/lib/storage/coverStore.ts`

Wrapper mince sur `Bun.S3Client`, creds depuis `config/env`.

- `putCover(bytes: Uint8Array, contentType: string): Promise<string>` — calcule le hash, upload en `public-read` + `Cache-Control: public, max-age=31536000, immutable` si l'objet n'existe pas déjà (`.exists()`), renvoie la **clé**.
- `publicUrl(key: string): string` — `${env.COVERS_PUBLIC_URL}/${key}`.

### `apps/backend/src/services/coverService.ts`

- `snapshotCover(sourceUrl: string): Promise<string | null>` 0. **Skip l'art générique** : si `isDefaultArtwork(sourceUrl)` (réutilise `@aubesonore/core/azuracast`, la même fonction que le front/mobile) → `null`. Un morceau réellement sans pochette n'a **pas** de « bonne cover » à figer ; il tombe sur l'icône de repli. On ne gèle jamais le placeholder générique d'AzuraCast comme s'il était la pochette.
  1. `assertSafeUrl(sourceUrl, { requireHttps: env.IS_PROD })` — **SSRF** (réutilise le guard de la PR #139 ; `sourceUrl` est influencé par le client).
  2. `fetch` avec `AbortSignal.timeout` (~8 s), garde **taille** (≤ 5 Mo) et **content-type** (`image/*` uniquement).
  3. `putCover(bytes, contentType)` → `publicUrl(key)`.
  4. Échec (réseau, type, taille) → `null` (le caller garde l'URL source ; retry au prochain refresh).

> Le backend dépendra de `@aubesonore/core` (`workspace:*`) pour `isDefaultArtwork` — logique platform-agnostic déjà partagée front/mobile, aucune duplication.

### Intégration `trackService.ts`

- `enrichTrackInBackground` : **restructurer** pour snapshotter **même sans match Songlink**. Aujourd'hui la fonction `return` tôt si `!songlinkData`. Nouveau flux : déterminer `bestSource` (art Apple si `songlinkData?.artworkUrl`, sinon l'`artworkUrl` initial), appeler `snapshotCover`, et si succès écrire l'URL R2 dans `artwork_url` (en plus des liens Songlink éventuels).
- `refreshTrackLinks` (refresh unitaire) : même logique de re-snapshot — sert de **retry** pour les échecs et de mise à jour.

### Schéma

**Aucun changement.** `artwork_url` (existant) contient désormais l'URL R2 une fois snapshottée. La projection `getLikedTracks` renvoie déjà `artworkUrl` — le front n'a rien à changer.

## Configuration (`config/env.ts`, centralisé)

Nouvelles variables (secrets en env, jamais commitées) :

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `COVERS_PUBLIC_URL` (ex. `https://covers.aubesonore.fr`)

Validation au boot comme le reste de `env.ts`. Si les creds R2 sont absents (dev sans R2), `snapshotCover` no-op et renvoie `null` (comportement actuel préservé).

## Service des covers (Cloudflare, setup manuel une fois)

À faire par le user dans le dashboard Cloudflare (pas d'accès API dashboard côté agent) :

1. Créer le bucket R2 `aubesonore-covers`.
2. Créer un **token API R2** (lecture/écriture sur ce bucket) → renseigner `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ACCOUNT_ID` en env backend.
3. Connecter un **domaine public custom** `covers.aubesonore.fr` au bucket (R2 → Settings → Public access → Custom domain).
4. (Optionnel) Cache Rule sur `covers.aubesonore.fr` : cache tout, respecte l'`immutable`.

Le CLAUDE.md backend sera mis à jour (nouvelle section « Covers durables (R2) »).

## Migration des likes existants

Script one-off `apps/backend/scripts/backfill-covers.ts` :

- Pour chaque liked track dont `artwork_url` n'est **pas** déjà une URL R2 (`!startsWith(COVERS_PUBLIC_URL)`) :
  - `snapshotCover(artwork_url)` → si succès, `UPDATE artwork_url`.
  - Si l'URL est déjà morte (AzuraCast supprimé, fetch échoue) → **irrécupérable**, laissé tel quel (fallback icône). `log()` le compte.
- Traitement par chunks (réutiliser le pattern `refreshAllLinks`, chunks de 5 + délai) pour ne pas marteler les sources.
- Idempotent (relançable) : les déjà-R2 sont sautés.

## Sécurité

- **SSRF** : `snapshotCover` passe systématiquement par `assertSafeUrl` avant tout `fetch` (l'URL vient du client). Bloque IP privées / metadata.
- **Taille/type** : garde ≤ 5 Mo + `image/*` avant upload → pas d'abus de stockage ni de contenu arbitraire servi.
- **Pas de secret exposé** : les creds R2 restent backend ; le bucket public ne sert que des images content-addressed.

## Gestion d'erreur

- Snapshot échoue → `artwork_url` garde la source ; le morceau dégrade au comportement actuel (peut casser si AzuraCast supprime avant un retry). Retry via `refreshTrackLinks` / re-like.
- R2 indisponible → snapshot no-op, aucune régression fonctionnelle du like (le like réussit sans dépendre de R2, choix « background »).

## Tests

- `coverService.snapshotCover` : mock `assertSafeUrl` + `fetch` + `coverStore` — cas succès (renvoie URL R2), type non-image rejeté, taille dépassée rejetée, fetch échoue → `null`, SSRF (URL privée) → `null`.
- `coverStore.putCover` : hash déterministe, dédup (`.exists()` → skip upload), clé/extension par content-type. Mock `Bun.S3Client`.
- Non-régression `getLikedTracks` : projection inchangée (toujours `artworkUrl`, jamais de bytes inline).

## Hors périmètre

- Redimensionnement / variants de résolution (on stocke l'original ; Cloudflare Image Resizing possible plus tard).
- Purge des covers orphelines (dé-like) — les objets content-addressed dédupliqués sont partagés ; un GC éventuel est un chantier P3+.
- Migration vers multi-région / autre CDN (R2 suffit jusqu'à P3).
