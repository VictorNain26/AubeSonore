# Covers hybrides + fiabilité Songlink — Plan d'implémentation

> Sous-skill : superpowers:subagent-driven-development. Étapes en cases à cocher.

**Goal :** Remplacer le snapshot R2 par une approche hybride (cover iTunes vérifiée sinon visuel onde), et fiabiliser le match iTunes.

**Architecture :** Module pur de similarité côté backend → vérification dans `searchItunes` → enrichissement garde l'URL AzuraCast dans le trou → front rend un `CoverGlyph` déterministe quand l'image manque/échoue. R2 entièrement retiré.

**Spec :** `docs/superpowers/specs/hybrid-covers-songlink.md`.

## Global Constraints

- Backend : fichiers dotted (`matchScore.ts`), named exports, TS strict, valibot aux frontières. Tests `bun test`. Pas de commentaires sauf WHY non-évident.
- Frontend : PascalCase composants, Tailwind v4 tokens uniquement (aucun hex/px hors `tokens.css`), design system atomique, story colocalisée pour tout atome (tous états × 2 thèmes, addon-a11y propre). Tests Vitest.
- `pnpm typecheck && pnpm lint` zéro warning ; tests verts avant de clore une tâche.
- Règle **artiste d'abord** : une cover d'un autre morceau du même artiste est acceptable ; seul un mauvais artiste est rejeté. `artistMatch` = `similarity(artist) ≥ 0.70` (gate cover). `songMatch` = `artistMatch && similarity(title) ≥ 0.60` (gate liens uniquement).

---

### Task 1 : Module de similarité `matchScore`

**Files :**

- Create : `apps/backend/src/lib/text/matchScore.ts`
- Test : `apps/backend/src/lib/text/matchScore.test.ts`

**Interfaces (Produces) :**

- `normalize(s: string): string`
- `similarity(a: string, b: string): number` (∈ [0,1])
- `artistMatch(a: string, b: string): boolean` — `similarity(a,b) ≥ 0.70` (gate COVER)
- `songMatch(query: { title; artist }, candidate: { title; artist }): boolean` — `artistMatch(artist) && similarity(title) ≥ 0.60` (gate LIENS)

- [ ] **Test d'abord** (`bun test`) :

```ts
import { describe, it, expect } from 'bun:test';
import { normalize, artistMatch, songMatch } from './matchScore';

describe('normalize', () => {
  it('lowercases, strips accents, feat and punctuation', () => {
    expect(normalize("L'Avenir")).toBe('l avenir');
    expect(normalize('Blue Bird (Feat Keren Ilan)')).toBe('blue bird');
    expect(normalize('Kiwi jr.')).toBe('kiwi jr');
  });
});
describe('artistMatch (cover gate — artist only)', () => {
  it('accepts the same artist regardless of the song', () => {
    expect(artistMatch('The Sophs', 'The Sophs')).toBe(true);
  });
  it('rejects a different artist', () => {
    expect(artistMatch('gemstonemario', 'Écho Mémoire')).toBe(false);
  });
  it('tolerates casing/punctuation drift', () => {
    expect(artistMatch('canaries', 'Canaries')).toBe(true);
    expect(artistMatch('Kiwi jr', 'Kiwi jr.')).toBe(true);
  });
});
describe('songMatch (links gate — right song)', () => {
  it('accepts the exact song by the right artist', () => {
    expect(
      songMatch(
        { title: 'GOLDSTAR', artist: 'The Sophs' },
        { title: 'GOLDSTAR', artist: 'The Sophs' }
      )
    ).toBe(true);
  });
  it('rejects a different song by the right artist (cover ok, links not)', () => {
    expect(
      songMatch({ title: 'GOLDSTAR', artist: 'The Sophs' }, { title: 'HOUSE', artist: 'The Sophs' })
    ).toBe(false);
  });
});
```

- [ ] **Implémentation** : `normalize` (NFKD→ASCII, minuscules, retrait `(...)`/`feat`, `[^a-z0-9]+`→espace, trim). `similarity` = Levenshtein normalisé (pas de dépendance nouvelle). `artistMatch` = `similarity ≥ 0.70`. `songMatch` = `artistMatch(artist) && similarity(title) ≥ 0.60`.
- [ ] **Run** `bun test src/lib/text/matchScore.test.ts` → vert.
- [ ] **Commit** : `feat(backend): add normalized title/artist match scoring`

---

### Task 2 : Vérification du match dans `searchItunes`

**Files :**

- Modify : `apps/backend/src/services/songlinkService.ts`
- Test : `apps/backend/src/services/songlinkService.test.ts` (create — mock `globalThis.fetch`)

**Interfaces (Consumes) :** `matchScore.isMatch` (Task 1). **Produces :** `searchSonglink` inchangé en signature ; `artworkUrl` non-null seulement si match vérifié.

- [ ] **Test d'abord** (mock fetch) : (a) top-résultat correct → `searchItunes` renvoie `{ trackViewUrl, artworkUrl }` ; (b) top-résultat mauvais (titre ne matche pas) alors qu'un meilleur existe plus bas → renvoie le meilleur si vérifié, sinon `null` ; (c) aucun résultat vérifié → `null` **caché** ; (d) HTTP 5xx → `null` **non caché** (retry possible).

```ts
// squelette
const okResp = (results: unknown[]) =>
  new Response(JSON.stringify({ resultCount: results.length, results }), { status: 200 });
```

- [ ] **Implémentation** : requête iTunes `limit=3` ; mapper chaque résultat en `{title: trackName, artist: artistName}` ; garder le meilleur par score combiné ; si `!isMatch(query, best)` → `null` (cacher comme négatif déterministe). Sinon renvoyer `{ trackViewUrl, artworkUrl }` (upscale `100x100bb`→`600x600bb`). Conserver la convention cache : transitoire (`throw`/réseau) non caché.
- [ ] **Run** `bun test src/services/songlinkService.test.ts` → vert.
- [ ] **Commit** : `fix(backend): verify iTunes match before trusting cover/link`

---

### Task 3 : Suppression R2 + réécriture de l'enrichissement

**Files :**

- Delete : `apps/backend/src/services/coverService.ts`, `apps/backend/src/services/coverService.test.ts`, `apps/backend/src/lib/storage/coverStore.ts`, `apps/backend/src/lib/storage/coverStore.test.ts`, `apps/backend/scripts/backfill-covers.ts`
- Modify : `apps/backend/src/services/trackService.ts`, `apps/backend/src/services/trackService.test.ts`, `apps/backend/src/config/env.ts`, `apps/backend/.env.example`, `apps/backend/CLAUDE.md`

- [ ] Retirer de `config/env.ts` : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `COVERS_PUBLIC_URL` (+ leur validation croisée). Retirer ces clés de `.env.example` et la section « Covers durables (R2) » du `CLAUDE.md` backend.
- [ ] Dans `trackService.ts` : supprimer l'import `snapshotCover` et l'export `coverSnapshot`. Aux 3 sites (`enrichTrackInBackground`, `refreshAllLinks`, `refreshTrackLinks`) remplacer le calcul snapshot par :

```ts
const verifiedArt = songlinkData?.artworkUrl ?? null;
const nextArt = verifiedArt ?? existingAzuracastUrl ?? null; // ne jamais écraser du durable par de l'éphémère
if (nextArt) update.artworkUrl = nextArt;
```

(où `existingAzuracastUrl` = l'`artworkUrl` déjà en base pour ce like).

- [ ] Mettre à jour `trackService.test.ts` : retirer le spy `coverSnapshot`/`mock.module('./coverService')` (déjà remplacé par un seam — supprimer le seam), asserter que : match vérifié → `artworkUrl` = URL iTunes ; pas de match → `artworkUrl` garde l'URL AzuraCast.
- [ ] **Run** `bun test` (toute la suite backend) → vert, plus aucune référence R2 (`grep -ri "R2\|coverStore\|snapshotCover\|COVERS_PUBLIC_URL" src scripts` = vide).
- [ ] **Commit** : `refactor(backend): drop R2 cover storage, keep AzuraCast url in the gap`

---

### Task 4 : Atome `CoverGlyph` (visuel onde déterministe)

**Files :**

- Create : `apps/frontend/src/design/atoms/CoverGlyph.tsx`, `apps/frontend/src/design/atoms/CoverGlyph.stories.tsx`

**Interfaces (Produces) :** `CoverGlyph({ seed: string; size?: 'sm' | 'md'; className?: string })`.

- [ ] **Implémentation** : hash déterministe de `seed` (`${artist}|${title}`) → sélection d'une **teinte parmi une petite palette dérivée des tokens** (ex. tableau de N classes/utilities de teinte définies dans `tokens.css` ou dérivées de `--accent`), + un motif d'**onde statique** en SVG inline (2–3 courbes, opacité douce). Aucune animation. Aucun hex en dur dans le composant : les couleurs viennent de variables/utilities du design system ; la sélection déterministe = index `hash % N`.
  - Si une palette de teintes n'existe pas encore, l'ajouter dans `tokens.css` (2 blocs de thème) — N teintes « glyph » (`--glyph-1..N`) + exposition `@theme`. Mettre à jour `scripts/check-contrast.mjs` si une paire texte/fond est introduite.
- [ ] **Story** `CoverGlyph.stories.tsx` : `Showcase` avec plusieurs seeds (dont les vrais « Aubory Bugg — nosedive », « gemstonemario — Dilema »), tailles sm/md ; vérifier 2 thèmes + addon-a11y propre.
- [ ] **Run** `pnpm --filter @aubesonore/frontend typecheck && node scripts/check-contrast.mjs`.
- [ ] **Commit** : `feat(frontend): add deterministic CoverGlyph wave placeholder`

---

### Task 5 : Câbler `CoverGlyph` dans `Thumbnail` et `TrackArtwork`

**Files :**

- Modify : `apps/frontend/src/design/atoms/Thumbnail.tsx`, `apps/frontend/src/design/organisms/TrackArtwork.tsx`, leurs stories
- Test : story/`*.test` existants si présents

**Interfaces (Consumes) :** `CoverGlyph` (Task 4).

- [ ] `Thumbnail` : ajouter prop optionnelle `seed?: string`. Quand `!showImage` (src absente **ou** `onError`), rendre `<CoverGlyph seed={seed ?? alt} size={size} />` au lieu de l'icône `Music`. Garder `onError` → bascule.
- [ ] `TrackArtwork` (organism, grande pochette du player) : même logique de repli sur `CoverGlyph` (grand format) au lieu de l'icône.
- [ ] Passer `seed={\`${artist}|${title}\`}` depuis les consommateurs (`LikedTrackRow`, `TrackArtwork` du player, etc.).
- [ ] Mettre à jour les stories : un état « sans cover » montre le `CoverGlyph`.
- [ ] **Run** `pnpm --filter @aubesonore/frontend test && pnpm --filter @aubesonore/frontend typecheck`.
- [ ] **Commit** : `feat(frontend): render CoverGlyph fallback in Thumbnail and TrackArtwork`

---

## Revue finale

Revue whole-branch (opus) : cohérence R2 totalement absent, seuils de match, discipline tokens (aucun hex hors `tokens.css`), stories/a11y, non-régression enrichissement. Puis finishing-a-development-branch.
