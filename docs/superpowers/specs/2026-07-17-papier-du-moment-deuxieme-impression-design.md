# « Le papier du moment », deuxième impression — spec de refonte design

Date : 2026-07-17 · Périmètre : `apps/frontend` uniquement · Note d'auto-review : 9,1/10

## Contexte et objectif

L'audit du 2026-07-17 (captures des quatre moments + revue du code) a établi que
l'exécution actuelle du design system retombe sur les clichés des designs générés
par IA : duo Fraunces + Inter, palettes crème + terracotta à l'aube et au
crépuscule, copy sur-poétisée, cascade d'entrée fade-up + stagger, vocabulaire de
composants par défaut. Le concept de fond — un papier qui prend la couleur de
l'heure — est la vraie signature du site et n'est pas en cause.

Objectif : réexécuter le concept pour qu'aucun élément ne puisse être pris pour un
défaut de génération, sans toucher à l'architecture des composants ni au backend.

## Décisions actées (avec Victor)

1. Le concept des quatre moments (aube / jour / crépuscule / nuit) est conservé et
   réexécuté — pas de page blanche.
2. Voix typographique : serif française de caractère, en polices libres.
3. Copy : une seule ligne poétique (la tagline du moment) ; tout le reste devient
   fonctionnel.
4. Périmètre : frontend web seul. Le mobile suivra dans un chantier séparé.
5. Une seule approche, auto-reviewée ≥ 9/10, sans maquettes intermédiaires.

## 1. Typographie — tout à l'encre

| Rôle                                               | Avant             | Après                                |
| -------------------------------------------------- | ----------------- | ------------------------------------ |
| Display (`--font-display`)                         | Fraunces Variable | **Young Serif** (graisse unique 400) |
| Corps / UI (`--font-sans` → renommé `--font-text`) | Inter             | **Spectral**                         |

- L'interface entière passe en serif, boutons et légendes compris. C'est le risque
  assumé de la direction : une radio _imprimée_.
- Données chiffrées (horloge du header, heures du rail, timeline, compteur
  d'auditeurs) : `font-variant-numeric: tabular-nums` (déjà en place sur le
  compteur, à généraliser).
- Chargement via Fontsource (`@fontsource/young-serif`, `@fontsource/spectral`
  graisses 400/500/600 + italique 400), suppression de
  `@fontsource-variable/fraunces` et `@fontsource/inter` (vérifier les noms exacts
  des paquets actuellement installés au moment de l'implémentation).
- L'échelle typo existante (caption → display) et les tailles sont conservées.
- Le renommage `--font-sans` → `--font-text` est répercuté dans le thème Tailwind
  (l'utilitaire `font-sans` disparaît au profit de la police par défaut du body ;
  aucun composant ne doit référencer `font-sans`).
- **Repli défini** : si Spectral déçoit sur les micro-libellés en conditions
  réelles, Spectral reste pour la prose et les données, et les micro-libellés
  passent sur une neutre non-Inter (Public Sans) — sans retoucher les tokens.

## 2. Couleur — quatre ciels réellement distincts

Jour et nuit sont conservés tels quels. Aube et crépuscule sont redessinés d'après
les couleurs vraies du ciel, hors de l'axe crème-terracotta.

| Moment     | `--paper`                       | `--ink`                        | `--accent`                    | `--on-accent`      |
| ---------- | ------------------------------- | ------------------------------ | ----------------------------- | ------------------ |
| Aube       | `hsl(10 45% 93%)` rose pâle     | `hsl(350 25% 14%)` brun-rosé   | `hsl(345 55% 45%)` framboise  | `hsl(10 45% 96%)`  |
| Jour       | inchangé `hsl(210 36% 97%)`     | inchangée                      | inchangé `hsl(214 74% 38%)`   | inchangé           |
| Crépuscule | `hsl(270 20% 93%)` lilas cendré | `hsl(270 20% 12%)` violet-noir | `hsl(30 80% 40%)` ambre brûlé | `hsl(270 20% 96%)` |
| Nuit       | inchangé `hsl(240 18% 10%)`     | inchangée `hsl(40 30% 92%)`    | inchangé `hsl(230 45% 74%)`   | inchangé           |

- Les dérivés (`--ink-soft`, `--ink-faint`, `--line`, `--paper-raised`…) restent
  calculés en `color-mix` comme aujourd'hui — aucun nouveau hex codé en dur.
- `--accent-dawn` (point de la marque) : à réaligner sur le nouvel accent aube.
- Contraste : chaque couple accent/papier et ink-faint/papier est vérifié AA au
  moment de l'implémentation (l'ambre sur lilas est le couple limite identifié ;
  ajuster la luminosité de l'ambre si < 4.5:1 pour du texte, < 3:1 pour les
  éléments graphiques).
- La meta theme-color reste lue au runtime depuis `--paper` (aucun hex re-hardcodé).

## 3. Signature — le ciel dans le papier

- Nouveau token par moment : `--sky`, teinte du ciel de l'heure, proche de
  `--paper` mais plus chromatique (ex. aube : rose plus saturé en haut de page).
- Le fond du `body` devient `linear-gradient(to bottom, var(--sky), var(--paper) 40%)`,
  très discret — une feuille posée près de la fenêtre.
- Les surfaces posées (`.panel`, modales, dropdowns, toasts) restent en aplat
  (`--paper-raised`) pour la lisibilité.
- Valeurs `--sky` de départ (à affiner à l'œil sur `/dev/system`) :
  aube `hsl(8 55% 89%)`, jour `hsl(210 45% 94%)`, crépuscule `hsl(268 28% 89%)`,
  nuit `hsl(238 22% 13%)`.

## 4. Motion — l'encre, pas l'ascenseur

Tout reste centralisé dans `src/lib/motion.ts`. Changements :

| Préset                             | Avant                                     | Après                                                                                                                    |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Entrée de page (`Entry` du Player) | cascade `opacity 0, y: 12` + stagger 0.08 | **« la lumière se lève »** : un seul fondu d'opacité orchestré (ciel + contenu ensemble), sans translation, sans stagger |
| Track flip (`trackFlip`)           | crossfade + slide vertical                | **« mise au net »** : crossfade + `filter: blur(3px) → 0`, 250 ms, sans translation                                      |
| Press (`pressScale 0.92`)          | scale au tap                              | **retour d'encre** : fond qui fonce à l'appui (`active:` sur `--paper-raised`), plus de scale                            |
| Témoin d'antenne                   | `animate-pulse` (2 s)                     | keyframe custom **respiration 4 s**                                                                                      |
| Rail (tilt vélocité ±4°)           | conservé                                  | conservé                                                                                                                 |
| `dataTick`, `modal`, `toggle`      | conservés                                 | conservés (le slide y:±4 du compteur est un tick de donnée, pas une cascade)                                             |

- `prefers-reduced-motion` : tout instantané, comme aujourd'hui (le blur est
  également désactivé).
- Les présets supprimés (`stagger`, `pressScale`) sont retirés de `motion.ts` et
  de tous les points d'usage — pas de code mort.

## 5. Copy — une seule ligne qui chante

La tagline du moment (header) reste l'unique voix poétique. Taglines resserrées :

| Moment     | Tagline                                              |
| ---------- | ---------------------------------------------------- |
| Aube       | « Le jour se lève sur ce qui restait dans l'ombre. » |
| Jour       | « Plein jour sur les morceaux qui le méritent. »     |
| Crépuscule | « La lumière descend, l'écoute se resserre. »        |
| Nuit       | « La nuit veille sur les découvertes de demain. »    |

Tout le reste devient fonctionnel :

| Emplacement                   | Avant                                                             | Après                                                                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TrackMeta` titre d'attente   | « L'antenne se prépare »                                          | « Chargement du direct »                                                                                                                                       |
| `ListenersBadge` (0 auditeur) | _« l'antenne vous attend »_ (italique)                            | icône + « 0 » (même rendu que n > 0)                                                                                                                           |
| `RecentRail` état vide        | « Le premier morceau de la journée s'écrit en ce moment. »        | « Aucun morceau pour l'instant. »                                                                                                                              |
| `RecentRail` erreur           | « Historique partiel — actualisation impossible pour le moment. » | « Historique momentanément indisponible. »                                                                                                                     |
| `AboutModal` description      | « Découverte musicale émergente »                                 | conservée (déjà factuelle)                                                                                                                                     |
| `AboutModal` bio              | phrase lyrique sur le lever du jour                               | « AubeSonore diffuse des sons rares, des artistes émergents et des classiques oubliés. Les couleurs du site suivent la lumière du jour, de l'aube à la nuit. » |
| `MOMENT_SHARE_PHRASES`        | conservées                                                        | conservées (contexte de partage, pas de l'UI)                                                                                                                  |

Règle transverse : plus de tirets cadratins décoratifs ni d'italique d'ambiance
dans les textes fonctionnels. L'affichage « AUBE — 06:18 » du header conserve son
tiret (séparateur de données, pas ornement).

## 6. Composants — la peau, pas l'API

- `Button` / `IconButton` / `ModalShell` / `DropdownMenu` : API inchangées, skin
  ajusté. L'échelle de radius est resserrée globalement : `--radius-sm` 2 px,
  `--radius-md` 4 px, `--radius-lg` 8 px — tous les consommateurs (boutons,
  panneaux, dropdowns, pochettes) suivent le token (ni pilules ni angles vifs —
  les deux extrêmes sont des clichés).
- Le bouton « Connexion » suit automatiquement (plus de look pilule).
- Recette des boutons sur pochette conservée (`rounded-full bg-paper/90
border-line`) — les pastilles rondes sur image restent justifiées par la cible
  tactile.
- Avatar-initiale, Lucide, sonner : conservés (marqueurs faibles, chantier
  disproportionné).
- `.eyebrow` (seule voix en capitales) et `.rule` : conservés, sans nouvel usage
  ajouté.
- La tagline du header perd son italique systématique si le rendu Spectral italique
  fait « généré » à l'écran — à juger sur `/dev/system`.

## 7. Non-buts

- Aucun changement backend, mobile, ni `packages/core`.
- Pas de refonte de layout (grilles et positions actuelles conservées).
- Pas de nouveau composant ni de nouvelle dépendance hors paquets Fontsource.
- Pas de mode clair/sombre manuel — le moment reste piloté par l'heure.

## 8. Critères d'acceptation

1. `pnpm typecheck && pnpm lint` propres ; `pnpm test` (Vitest frontend) vert.
2. Plus aucune référence à Fraunces ni Inter dans `apps/frontend` (code, CSS,
   `package.json`).
3. Captures des quatre moments (méthode `TZ` + headless de l'audit) : aucun des
   trois clusters IA reconnaissable (crème+serif contrastée+terracotta ; sombre à
   accent acide unique ; broadsheet zéro-radius).
4. Contrastes AA vérifiés pour les couples accent/papier et ink-faint/papier des
   quatre moments (texte 4.5:1, graphique 3:1).
5. `prefers-reduced-motion` : aucune animation (fondu, blur, respiration, tilt).
6. `/dev/system` (DevSystemPage) reflète les nouveaux tokens, polices et présets.
7. La charte mémoire « Le papier du moment » est mise à jour en fin de chantier.

## 9. Risques et replis

| Risque                                    | Mitigation / repli                                               |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Spectral peu lisible sur micro-libellés   | Repli défini §1 : Public Sans sur les micro-libellés uniquement  |
| Blur textuel baveux (Windows / low-DPI)   | 3 px max, 250 ms ; si insuffisant, repli crossfade pur sans blur |
| Ambre sur lilas < AA                      | Abaisser la luminosité de l'ambre jusqu'à 4.5:1                  |
| Dégradé `--sky` visible sous les panneaux | Panneaux en aplat `--paper-raised` (déjà la règle)               |
