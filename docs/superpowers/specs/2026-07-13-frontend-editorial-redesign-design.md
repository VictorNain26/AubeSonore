# Refonte éditoriale lumineuse — Design Spec

**Date :** 2026-07-13
**Périmètre :** `apps/frontend` uniquement
**Statut :** validé avec Victor (session du 13/07, seconde itération)
**Remplace :** `2026-07-13-frontend-redesign-design.md` pour tout ce qui touche au visuel. Le tri des features de la spec précédente (suppression share cards satori/resvg, push, stats modal ; conservation likes/export, sleep timer, cast, PWA, auth) reste acté.

## 0. Pourquoi cette seconde itération

La première implémentation (PR #88) est rejetée : glassmorphism daté, couleurs criardes des dégradés de ciel, surcharge d'éléments concurrents (ciel animé + waveform + timeline + fil + badges), typographie et espacements incohérents d'un composant à l'autre, historique complet de la journée sans intérêt. Les idées (moments de la journée, découverte) sont validées ; c'est l'exécution visuelle qui est refaite, avec cette fois : un système défini et validé **avant** les composants, appliqué avec la même rigueur à **toutes** les surfaces du site, et une boucle de vérification visuelle outillée (plus jamais à l'aveugle).

## 1. Direction : éditorial lumineux

Une page qui se lit comme un magazine : fond papier teinté par le moment, encre foncée, une grande serif display, beaucoup d'air. Le concept « le site sait quelle heure il est » s'exprime par la couleur du papier et un mot — plus par des dégradés animés.

- **Aube (5h–9h)** : papier crème rosé, encre brune, accent corail doux
- **Jour (9h–17h)** : blanc légèrement bleuté, encre presque noire, accent bleu profond
- **Crépuscule (17h–22h)** : ivoire ambré, encre chaude, accent terracotta
- **Nuit (22h–5h)** : seul moment sombre — papier encre profonde, texte ivoire, accent lunaire. Un fond blanc à 2h du matin serait agressif ; la nuit sombre est la version honnête du « moment = thème ».

**Interdits absolus** (ce qui a fait rater la v1) : glassmorphism (surfaces translucides, bordures blanches en alpha, backdrop-blur), dégradés multi-stops saturés, grain, halo, plus d'une chose animée à la fois à l'écran. Les surfaces sont le papier lui-même, séparées par des filets fins (encre à faible alpha) et l'espacement.

## 2. Le système (défini et validé avant tout composant)

Un seul fichier de tokens : `index.css` réécrit.

- **Palette** : 4 jeux `--paper / --ink / --accent` (+ dérivés `--ink-soft`, `--line` obtenus par color-mix) par `data-moment`. La mécanique `useMoment()` et les bornes de `lib/moments.ts` sont conservées telles quelles.
- **Typographie** : Fraunces Variable en display — titre de piste (clamp ~2.5–5rem), wordmark, en-têtes ; Inter pour tout le reste. Échelle stricte à 5 tailles nommées ; aucune taille hors échelle dans les composants.
- **Espacement** : échelle 4/8 stricte. Colonne centrée max ~640px (le rail horizontal peut déborder en pleine largeur).
- **Primitives** : 4 seulement — bouton (variante pleine accent / fantôme encre), ligne-ou-carte de piste, badge moment (texte simple), filet séparateur. Tout composant du site se construit avec ces primitives et les tokens ; rien d'autre.

**Critère de rigueur global (demande explicite de Victor)** : chaque surface du site — pas seulement la scène player — est reconstruite contre ce système. Aucun composant ne conserve de styles hérités de la v1.

## 3. La page

Une colonne, trois blocs :

1. **En-tête** : wordmark (Fraunces) + badge du moment (« Crépuscule — 19h42 ») discret, actions compte.
2. **La scène** : artwork net (plus aucun blur plein écran), titre en très grande serif, artiste, contrôles (lecture, volume, like, partage, cast, sleep timer) épurés sur une ligne. Waveform conservée mais fine et monochrome encre.
3. **« Vient de passer »** : rail horizontal (voir §4).

## 4. « Vient de passer » — rail horizontal

- Les **8 dernières pistes** en rail horizontal : pochette nette (~120–140px), titre + artiste dessous, heure de passage discrète. Like/partage au survol (desktop) ou au tap (mobile).
- **Défilement à caractère, mais sobre** : drag souris/doigt avec inertie, scroll-snap par pochette ; pendant le drag, micro-inclinaison/parallaxe des pochettes via `motion` (quelques degrés maximum) — l'effet « bac à vinyles qu'on feuillette ». Molette verticale traduite en défilement horizontal quand le curseur est sur le rail.
- Fondu sur les bords du rail pour signaler la suite ; pas de flèches, pas de dots.
- `prefers-reduced-motion` : scroll horizontal natif simple.
- Données : historique serveur existant (PR #68), tronqué aux 8 dernières ; aucun changement backend.

## 5. Motion minimal — GSAP supprimé

Supprimés : intro 2–3s, scroll narratif, halo soleil/lune, SplitText, et donc **GSAP + `@gsap/react`** (ils n'étaient justifiés que par ces chorégraphies). Une seule lib d'animation : `motion` (déjà présente), `motion-presets.ts` reste la source unique des durées/eases. Ce qui reste animé : fondu au changement de piste, transitions de modales, bascule douce du papier au changement de moment, micro-réaction du rail au drag. Jamais plus d'une chose à la fois.

## 6. Inventaire exhaustif des surfaces (même rigueur partout)

| Surface                                                                                                                                                                                                        | Sort                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Layout` / `HomePage`                                                                                                                                                                                          | Réécrits : colonne éditoriale, papier du moment                                                |
| `Player/` (index, PlaybackControls, VolumeControl, TrackMeta, TrackArtwork, ElapsedReadout, Timeline, WaveformCanvas, SecondaryControls, SleepTimer, CastButton, LibraryButton, ListenersBadge, ArtistContext) | Re-skinnés contre le système, logique intacte                                                  |
| `MomentBadge`                                                                                                                                                                                                  | Refait en texte simple (primitive badge)                                                       |
| `DayTimeline`, `HistoryItem`                                                                                                                                                                                   | **Supprimés** → nouveau `RecentRail` + `RailCard`                                              |
| `Sky/` (SkyBackground, CoverTint, useSkyChoreography, useScrollSky, sky.css)                                                                                                                                   | **Supprimé** en entier                                                                         |
| `AuthModal`, `LikedTracksModal`, `AboutModal`                                                                                                                                                                  | Re-skinnés : panneau papier, filets, typo du système                                           |
| `PWAInstallBanner`                                                                                                                                                                                             | Re-skinné                                                                                      |
| `ui/DropdownMenu`                                                                                                                                                                                              | Re-skinné                                                                                      |
| `ErrorFallback`                                                                                                                                                                                                | Re-skinné                                                                                      |
| Scrollbars, focus rings, états loading/erreur/vide                                                                                                                                                             | Tokens du système, définis dans `index.css`                                                    |
| Share cards (satori/resvg), push front+SW, stats modal                                                                                                                                                         | **Supprimés** (déjà actés spec précédente) → partage via Web Share API, fallback copie de lien |

## 7. Boucle visuelle outillée (exigence explicite)

- **Chrome DevTools MCP** ajouté à la config Claude Code du projet (`.mcp.json`) : dev server Vite lancé, page ouverte, screenshots pris, console lue à chaque jalon. Choisi contre Playwright MCP : pour itérer du design sur un seul navigateur, il couvre screenshot + console + réseau + perf dans un outil ; le cross-browser de Playwright est sans objet ici.
- Route **dev-only `/dev/system`** : affiche palette × 4 moments, échelle typo, échelle d'espacement, les 4 primitives dans tous leurs états. C'est le support de validation du système **avant** le premier composant, puis le garde-fou anti-dérive.
- Paramètre dev **`?moment=dawn|day|dusk|night`** pour forcer le moment et screenshoter les 4 ambiances sans attendre l'heure.
- Process par jalon : screenshot → comparaison sur critères précis (hiérarchie typo, palette, rythme d'espacement) → correction ; 2–3 itérations max puis validation de Victor.
- **Jalons de validation Victor** : ① `/dev/system` (le système), ② la scène player, ③ le rail, ④ modales et surfaces secondaires, ⑤ page complète aux 4 moments.

## 8. Performance & accessibilité

- Animations `transform`/`opacity` uniquement ; `prefers-reduced-motion` partout.
- Plus de blur plein écran ni de couche GPU coûteuse : le papier est un aplat.
- Bundle : retrait de GSAP, @gsap/react, satori, @resvg/resvg-wasm, code push — vérifié au bundle visualizer.
- Contraste AA minimum vérifié pour chaque couple papier/encre des 4 moments (y compris accent sur papier).
- Web-vitals conservés.

## 9. Tests

Stack existante (Vitest + RTL + MSW) :

- `useMoment` : tests existants conservés ;
- troncature + ordre des 8 dernières pistes (fonction pure) ;
- rail : rendu, fallback reduced-motion ;
- partage Web Share (support + fallback) ;
- chemins critiques player préservés (lecture, like, erreurs flux).

## 10. Hors périmètre

- Backend (retrait routes push = PR séparée, déjà acté).
- App mobile Expo.
- Multi-langue, pages éditoriales, thème manuel clair/sombre (le moment EST le thème).
