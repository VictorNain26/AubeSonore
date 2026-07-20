# Design definitif — page live AubeSonore (frontend web)

Date : 2026-07-20. Objectif : porter le design de la page live de 8/10 a >= 9.5/10 sans toucher a l'identite (concept « papier du moment », typo Spectral + Young Serif, tokens de `src/index.css`).

**Hierarchie produit** (guide chaque arbitrage, dans cet ordre) : 1. ecouter le direct, 2. decouvrir (morceau, artiste, contexte), 3. partager, 4. reecouter ses morceaux sur sa plateforme favorite (like → bibliotheque → export). Le site reste epure : tout element qui ne sert pas un de ces quatre usages est retire (ex. compteur d'auditeurs).

## Diagnostic (audit visuel du 2026-07-20)

Screenshots reels (4 moments x desktop 1440 + mobile 390). Points forts : identite, tokens, etats loading/error, a11y de base, mobile. Defauts a corriger :

1. La colonne « direct » n'a pas de gestalt : pochette, titre display, waveform et controles flottent en constellation ; grand vide au-dessus de la pochette a 1440x900.
2. Hierarchie inversee : le play (geste n° 1 d'une radio) est un bouton moyen en orbite ; le titre domine tout.
3. La trace d'antenne est placee comme une progress bar (pleine largeur entre titre et controles) ; a l'arret, ses pointilles plats semblent casses.
4. Like/share caches en overlay sur la pochette, deconnectes du morceau.
5. Quand `AntennaStatus` est masque (0 auditeurs), plus rien ne dit « live » hormis le point du logo.
6. Le journal « Vient de passer » rivalise en poids visuel avec le direct.
7. Jour et crepuscule sont quasi indistinguables ; le concept central perd sa force 12 h/24.
8. Micro-defauts : contraste `--ink-faint` fragile (fix AA deja necessaire, commit ef76235), cibles tactiles 40 px < 44 px, theme-color hardcode dans `index.html`, `src/assets/react.svg` orphelin.

## Decision de composition : « la manchette » (proposition A retenue)

Desktop (>= lg) — colonne direct ancree dans le tiers haut, plus de centrage flottant :

```
masthead   : ● AubeSonore · NUIT          ⓘ ⌸ [Connexion]
filet live : EN DIRECT · DJ · depuis Xmin
manchette  : [pochette + play superpose]  666
                                          GHO$$ · ♡ ⤴
                                          ≈ trace d'antenne ≈
contexte   : bio de l'artiste (2-3 lignes, contenu ArtistContext)
satellites : volume · AirPlay (discrets, sous la manchette)
```

Regles :

- **Filet live permanent** sous le masthead : « En direct · DJ · depuis Xmin ». C'est la ligne qui porte la narration radio ; `aria-live` conserve. **Le compteur d'auditeurs est supprime partout** (UI epuree ; pas de social proof chiffree). Le composant retire le fetch associe cote front.
- **Play superpose au coin bas de la pochette** : cible ronde accent >= 56 px, seul bloc accent plein de la page. Pochette + play = un seul objet.
- **Titre + artiste + like/share groupes** : like/share quittent l'overlay pochette et rejoignent la ligne artiste (IconButton >= 44 px). Le titre garde `text-display`.
- **Trace d'antenne integree a la manchette**, calee sur la largeur du bloc texte (plus jamais pleine largeur). A l'arret : pas de pointilles — la trace disparait et laisse un libelle idle (« Appuyez pour ecouter le direct ») en `--ink-soft`.
- **Le vide devient contexte** : 2-3 lignes de bio artiste (deja fournies par `ArtistContext`/`useArtistInfo`) sous la manchette, en colonne de texte editoriale. Pas de nouvel appel API.
- Mobile (< lg) : empilement inchange dans l'esprit, ordre : filet live → pochette+play → titre+actions → trace/idle → contexte → journal.

## Journal « Vient de passer » : rétrogradé en colonne de marge

- Largeur `20rem` → `17rem`.
- 6 lignes max visibles ; le reste vit dans la bibliotheque (bouton existant).
- Vignettes reduites (40 → 32 px), titres en `text-body`, heures en `caption` + `--ink-faint`, encre generale adoucie (`--ink-soft`).
- Etats loading/empty/error conserves tels quels (skeletons, microcopie degradee).

## Differenciation jour / crepuscule

Le crepuscule doit etre lisible comme un moment distinct sans casser l'harmonie :

- Rechauffer nettement le papier du crepuscule (glisser la teinte de `270 20% 93%` vers un lilas-rose plus sature et legerement plus sombre) et assombrir/rechauffer `--sky` pour evoquer la lumiere descendante.
- L'accent ambre est bon ; c'est le papier/ciel qui ne raconte rien.
- Critere d'acceptation : en screenshots cote a cote, les 4 moments sont identifiables en < 2 s par une personne exterieure ; tous les couples texte/fond restent AA (4.5:1), verifies token par token (zone fragile : `--ink-faint` sur `--sky`).

## Composants secondaires — corrections (revue du 2026-07-20, code + captures interactives)

**AuthModal** — fonctionnel (5 modes, OAuth Google, toasts) mais formulaires sous le standard :

- Ajouter de vrais `<label>` associes (le placeholder seul disparait a la saisie) — champs nom/email/mot de passe/confirmation.
- Validation inline au blur + message d'erreur sous le champ concerne (`aria-invalid`, bordure danger) au lieu du toast generique ; la non-correspondance des mots de passe se signale sur le champ.
- Toggle voir/masquer : retirer `tabIndex={-1}` (le rendre atteignable clavier), cible >= 44 px.
- Bouton retour aussi en mode reset-password (aujourd'hui seulement en forgot).

**LikedTracksModal** (usage n° 4 : reecouter sur sa plateforme) — le par-morceau est bon (8 plateformes, preference persistee) :

- Bouton supprimer visible en permanence sur tactile (aujourd'hui `opacity-0` hors hover) + un undo via toast (action destructive sans filet aujourd'hui).
- Focus des lignes non masque par le header sticky (WCAG 2.4.11) : `scroll-padding-top`.
- Virtualisation ou pagination de la liste (rend actuellement tous les items).
- `max-h-[280px]` en dur → token.

**ArtistContext** — critique car la bio entre dans la manchette : gerer `isLoading` (skeleton) et l'absence de bio (masquer proprement la zone, jamais un clic sans feedback). Les artistes similaires en `text-accent` non cliquables = fausse affordance → soit cliquables, soit couleur d'encre normale.

**VolumeControl** — slider entierement cache jusqu'au hover (`opacity-0 pointer-events-none`) : affordance faible, inaccessible au clavier tant que non deploye, et introuvable par automation (aucun bouton nomme « volume »). Le rendre focusable/deployable au focus clavier, et nommer le bouton avec « volume ».

**SecondaryControls** — etat mute/prevVolume local desynchronise du store player (demuter peut sauter a 100 %) → deplacer dans le store.

**AirPlayButton** — etat actif signale par la couleur seule (WCAG 1.4.1) → ajouter un indicateur non chromatique (point, soulignement).

**AboutModal** — liens Instagram/Spotify/Discord en `href="#"` (morts) : les remplir ou les retirer ; icones generiques (Globe pour Instagram) a remplacer par des pictos fideles.

**PWAInstallBanner** — bouton « Installer » passe sur `Button variant="accent"` ; `env(safe-area-inset-bottom)` ; garde SSR sur `localStorage`.

**ErrorFallback (ModalErrorFallback)** — overlay bloquant sans focus trap ni Escape ni `aria-modal` ; microcopie generique. Rebasculer sur `ModalShell` (Radix) et nommer le probleme + l'action.

**Toaster** — `duration 3000` uniforme : trop court pour les erreurs → duree par severite (erreurs persistantes ou >= 6 s) ; sortir les classes `!border-l-[var(...)]` vers des utilitaires ; coordonner la zone basse avec la PWA banner (`bottom-center` peut entrer en collision).

## Corrections transverses

- Toutes les cibles tactiles interactives >= 44 px (volume, boutons d'entete, actions journal) — minimum legal 24 px WCAG 2.2, cible 44 px tactile.
- `color-scheme` declare et `theme-color` initial coherent avec le moment par defaut (le runtime `useMoment` continue de le rafraichir).
- Supprimer `src/assets/react.svg` (orphelin).
- Sortir les classes ad hoc `!border-l-[var(...)]` du Toaster vers des tokens/utilitaires.
- Motion : conserver les tokens de `src/lib/motion.ts` ; la nouvelle manchette reutilise `pageEntry`/`trackFlip` ; aucun nouveau pattern de mouvement.

## Non-objectifs

- Pas de refonte d'identite (couleurs de base, typo, vocabulaire editorial intacts).
- Pas de dark-mode toggle ni de persistance du moment.
- Pas de Figma ni de maquettes : le design s'itere en code.
- Mobile app Expo hors scope.
- Export playlist direct vers Spotify/Deezer (creation de playlist via API) : hors scope de ce chantier design — l'ouverture par morceau sur 8 plateformes + export CSV couvrent l'usage n° 4 ; a evaluer plus tard comme feature produit.

## Workflow de verification (agents IA, mi-2026)

Chaque lot d'implementation suit la boucle : implementer → lancer le dev server → screenshoter les 4 moments x {1440x900, 390x844} (Chrome headless) → critique visuelle contre cette spec → corriger → `pnpm typecheck && pnpm lint && pnpm test` → PR. Criteres d'arret : composition conforme aux regles ci-dessus, AA verifie sur les couples de tokens, cibles >= 44 px, aucun CLS introduit (skeletons conserves), `DevSystemPage` mis a jour si un token change.

## Decoupage previsionnel (pour le plan d'implementation)

1. Manchette desktop + filet live + suppression du compteur d'auditeurs + deplacement like/share + etat idle de la trace + etats ArtistContext (la bio entre dans la manchette).
2. Journal en colonne de marge.
3. Tokens crepuscule + verification AA des 4 moments.
4. Formulaires AuthModal (labels, validation au blur, toggle clavier).
5. LikedTracksModal (suppression visible + undo, focus/sticky, virtualisation).
6. Corrections transverses (cibles 44 px partout — IconButton ~36 px aujourd'hui —, volume au clavier, mute dans le store, AirPlay non chromatique, liens AboutModal, PWA banner, ErrorFallback sur ModalShell, durees Toaster, color-scheme, nettoyage).

Chaque lot = une PR courte, mergee des que verte (cadence main-first).
