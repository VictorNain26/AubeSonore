# Refonte du player — « manchette + fil d'onde »

Refonte visuelle et structurelle du player now-playing (`src/components/Player/**` +
vues `src/design/**`). Corrige des problèmes de mise en page constatés en rendu réel
(desktop + mobile, 2 thèmes) et affine le geste central play/stop et la waveform.

## Problèmes constatés (rendu réel, 2026-07-22)

1. **Play sur la cover** — bouton accent en `absolute -bottom-3 -right-3`, chevauche le
   coin bas-droit de la pochette ; déborde presque sur mobile. Non désiré.
2. **Titre fragile** — `text-display` (jusqu'à ~4rem) + `text-wrap:balance` : un titre long
   s'équilibre en 2 grosses lignes et pousse le bloc hors du viewport (`overflow-hidden`
   coupe le reste).
3. **Icônes partage/like** — 16px (`size-4`) dans des cibles de 44px : minuscules face au
   titre géant et au bouton play, visuellement perdues.
4. **Waveform** — en lecture : fil fin qui ne remplit pas la largeur (gros vide à droite),
   amplitude inégale (ample à gauche, plate à droite), crêtes aplaties/anguleuses (« carré »).
   À l'arrêt : ligne 100% plate qu'on confond avec une bordure.
5. **Hiérarchie** — colonne droite ancrée en haut, immense vide en bas ; contrôles éclatés
   (like/partage collés au titre, volume orphelin en bas).

## Direction retenue

**Manchette + fil d'onde** : on garde l'asymétrie éditoriale (cover à gauche, texte à
droite sur desktop). Le play sort de la cover et devient **l'ancre d'une ligne de
transport** d'où l'onde s'écoule sur toute la largeur restante — cohérent avec la
signature du design system v3 « l'onde comme matière ». Aucun badge LIVE (cf.
[[design-no-live-label]]).

## Spécification par zone

### Layout

**Desktop (≥1024px)** — `cover | colonne droite`, la colonne droite **centrée
verticalement** sur la hauteur de la cover (comble le vide bas). De haut en bas :

```
Titre
Artiste
[▶ play]  ∿∿∿∿∿∿∿  fil d'onde pleine largeur  ∿∿∿∿∿∿∿
Like   Partage   Volume
```

**Mobile (<1024px)** — empilé et centré : cover pleine largeur → titre → artiste →
ligne `[▶] + onde` → barre d'actions. Même grammaire, repliée. Le fil d'onde reste sur
la même ligne que le play (play `shrink-0`, onde `flex-1 min-w-0`).

### Cover (`TrackArtworkView`)

- **Plus aucun overlay.** On retire le `PlaybackControls` positionné en absolute.
- `aspect-square`, `rounded-md`, `artwork-size` inchangés. Micro-scale en lecture conservé.

### Titre (`TrackMetaView`)

- `line-clamp-2` + ellipsis, `text-wrap:balance` conservé (esthétique des titres courts).
- Attribut `title={title}` pour exposer le titre complet (survol + lecteur d'écran).
- Garde `font-display`, `text-title lg:text-display`, crossfade `inkFlip` sur flip.
- **Résultat** : un titre long ne peut plus casser la mise en page (hauteur bornée à 2 lignes).

### Artiste

- Inchangé : dek `text-lead text-text-muted`, lien souligné vers la bio si disponible.

### Bouton play/stop (`PlaybackControlsView`) — révisé

- **Ancre du fil d'onde**, `shrink-0`. Reste le seul bloc accent plein (`bg-accent
text-on-accent`). Taille `size-14` (56px), `rounded-full`.
- **Icônes pleines** au lieu des outlines lucide fins : triangle play plein et carré
  stop plein (`fill-current`, arrondi léger sur le stop), plus lisibles et plus « média »
  sur fond accent. Décalage optique du triangle conservé.
- **Micro-interaction tactile** (sous `prefers-reduced-motion: no-preference`) :
  `hover:scale-[1.03]`, `active:scale-95`, en plus du crossfade play↔stop existant
  (`toggleTransition`, ~150–250ms `ease-out-quart`). Fallback opacité si `reduce`.
- États complets : hover, `focus-visible` (ring accent), active, `aria-pressed`,
  `aria-label` dynamique (déjà présents).
- **Pas d'anneau de progression** (radio live, pas de position scrubbable).

### Barre d'actions unifiée

- Une **seule rangée** regroupant Like · Partage · Volume (les actions like/partage
  quittent le bloc titre ; le volume rejoint la rangée). Alignée à gauche (desktop),
  centrée (mobile). `gap` cohérent, base 4/8.
- Icônes Like & Partage : **16px → 20px** (`size-5`). Cibles 44px conservées
  (`Button variant="icon"`). Like actif = `text-accent` + `fill-current`.

### Volume (`VolumeControl`)

- **Comportement déjà en place** : bouton + slider qui se déploie au survol (desktop) /
  au tap (mobile). On l'harmonise en taille/espacement dans la nouvelle barre.
- **Masqué sur mobile** (`hover: none`) : le volume système suffit. On conserve le
  hook `isMobile` existant pour décider du rendu.

### Waveform (`WaveformCanvas` + `WaveformCanvasView`) — « le fil »

- **Pleine largeur** : `flex-1` dans la ligne de transport (remplit l'espace à droite du
  play). Hauteur relevée pour la lisibilité (cible `h-10`, à valider visuellement).
- **Amplitude homogène de bout en bout** : supprimer l'atténuation latérale
  (`distFromCenter` / `logDist`) qui crée les zones plates et le vide à droite. Répartir
  les bandes de fréquence sur toute la largeur.
- **Courbe lissée** : densifier les points et/ou améliorer l'interpolation pour supprimer
  les crêtes « carré ». Conserver le rendu 1 ligne d'encre `--color-text`, `lineJoin`/
  `lineCap` round, pas de gradient ni glow.
- **Repos (isPlaying=false)** : remplacer la ligne 100% plate par une **respiration
  lente** — ondulation basse amplitude, période lente. **Figée** sous
  `prefers-reduced-motion: reduce` (une onde immobile, distincte d'une bordure).
- rAF interne conservé (pas de re-render React par frame), refs `isPlaying`/`songId`,
  gestion `visibilitychange`, dpr/ResizeObserver, lecture `--color-text` par thème :
  tout conservé.

## Contraintes design system (non négociables)

- **Tokens uniquement** : aucune couleur/espacement/typo/rayon hors `tokens.css`. Pas de
  valeurs arbitraires. Vocabulaire limité (`bg-surface`, `text-text`, `bg-accent`, …).
- **Tailwind v4** : utilities existantes ; toute nouvelle utility/variant → `tokens.css`.
- `node scripts/check-contrast.mjs` passe (aucune paire nouvelle attendue).
- **A11y** : cibles ≥44px, `focus-visible` sur tout interactif, `aria-*` corrects, canvas
  `aria-hidden`. Contraste AA sur les 2 thèmes.
- **Motion** : décoratif seulement sous `no-preference`, 150–250ms, `ease-out-quart`.
- **Storybook** : mettre à jour les stories colocalisées des vues touchées
  (`PlaybackControls`, `TrackMeta`, `TrackArtwork`, `SecondaryControls`, `WaveformCanvas`,
  `Antenna`) — tous états × 2 thèmes, addon-a11y clean.

## Architecture / fichiers impactés

- `src/components/Player/index.tsx` — recomposition : cover sans overlay ; nouvelle **ligne
  de transport** (play + Antenna) ; colonne droite centrée verticalement ; barre d'actions
  unifiée. C'est le point d'assemblage principal.
- `src/design/organisms/TrackArtwork.tsx` — inchangé (l'overlay vivait dans `index.tsx`).
- `src/design/organisms/TrackMeta.tsx` — titre `line-clamp-2` + `title=` ; les boutons
  like/partage sortent d'ici vers la barre d'actions (props/rendu déplacés).
- `src/design/molecules/PlaybackControls.tsx` — icônes pleines, micro-interaction, taille.
- `src/design/organisms/SecondaryControls.tsx` + `Antenna.tsx` — recomposés dans la ligne
  de transport / barre d'actions ; volume masqué en mobile.
- `src/components/Player/WaveformCanvas.tsx` + `src/design/organisms/WaveformCanvas.tsx` —
  algo (amplitude homogène, lissage, respiration au repos), largeur/hauteur.
- Stories `.stories.tsx` correspondantes.

La répartition présentational (vue design) / container (store) est conservée : chaque
vue reste props-in, testable et storiée.

## Hors scope (YAGNI)

- **État buffering/loading du bouton** : le store n'expose que `isPlaying`/`playError`.
  Pas d'ajout d'état de chargement dans le store dans cette itération (à rouvrir si besoin).
- Refonte de `RecentTracks`, de l'`ArtistContext`/`ArtistBio`, du header/shell.
- Nouvelle palette ou nouveaux tokens.

## Critères de succès

1. Aucun bouton ne chevauche la cover (desktop + mobile).
2. Un titre très long (≥ ~40 caractères) ne casse pas la mise en page (borné 2 lignes,
   ellipsis, reste du layout intact).
3. Icônes like/partage à 20px, cibles 44px, lisibles.
4. Waveform pleine largeur, amplitude homogène, courbe lisse (plus de « carré »),
   respiration visible au repos et figée sous `reduce`.
5. Bouton play/stop révisé : icônes pleines, feedback tactile, cohérent comme ancre.
6. `pnpm typecheck && pnpm lint` verts ; `pnpm test` (Vitest) vert sur les modules touchés ;
   `check-contrast.mjs` vert ; addon-a11y clean.
7. Vérification visuelle 2 thèmes × 2 viewports (1280×800 / 390×844), à l'arrêt et en
   lecture, validée avant merge (cf. [[design-verification-loop]]).
