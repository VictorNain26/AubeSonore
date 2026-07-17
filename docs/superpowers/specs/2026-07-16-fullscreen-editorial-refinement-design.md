# AubeSonore — Plein écran éditorial & uniformisation (spec)

Date : 2026-07-16
Périmètre : frontend web (+ retraits ciblés). Mobile exclu. Backend intouché.
Supersede le layout de `2026-07-13-frontend-editorial-redesign-design.md` ; les tokens, la typographie et les primitives de cette spec restent la base.

## 1. Histoire de marque

Le nom porte le manifeste : **AubeSonore fait se lever le jour sur la musique qui était encore dans l'ombre** (découverte musicale émergente). L'aube est le moment où l'émergent devient visible. Parce que la lumière ne s'arrête pas, le site vit le cycle entier avec l'auditeur : aube, jour, crépuscule, nuit — chaque moment raconte la même histoire sous un autre angle (les `MOMENT_TAGLINES` existantes sont conservées telles quelles).

Conséquences design :

- **L'aube est le moment-signature.** Wordmark, icône PWA, modale À propos et visuels de partage s'ancrent dans la palette d'aube, quel que soit le thème courant. Les trois autres moments sont des déclinaisons.
- Le manifeste « Découverte musicale émergente » quitte le footer (supprimé) et remonte dans l'en-tête ou la modale À propos.
- Expérience cible : « une radio qui vit avec toi » — un objet posé là, pas une web-app.

## 2. Décisions fonctionnalités

### Conservé (inchangé fonctionnellement)

Stream + volume/mute/reconnexion, now-playing (titre/pochette/waveform/temps), compteur d'auditeurs, bio artiste (Last.fm), rail « Vient de passer », auth complète (email vérifié + Google/Spotify + reset), likes + enrichissement Songlink, bibliothèque (recherche, suppression, refresh liens), plateforme préférée, partage (Web Share + fallback), sleep timer avec fade-out, Media Session, PWA (installation + cache pochettes), thème par moment, À propos.

### Retiré

1. **Chromecast** : suppression de `lib/cast/chromecast.ts`, du loader SDK Google Cast, de la portion Chromecast du `castStore` et des types associés. **AirPlay conservé** (API WebKit native, quelques lignes). `CastButton` devient un bouton AirPlay seul, affiché uniquement quand `WebKitPlaybackTargetAvailabilityEvent` le permet.
2. **Exports TuneMyMusic et liste Songlink** : l'export bibliothèque ne propose plus que le **CSV** (TuneMyMusic importe le CSV). `lib/exportLibrary.ts`, `@aubesonore/core/export` et l'UI de `LikedTracksModal` s'allègent en conséquence.

### Backend orphelin (décision actée)

`/api/stats`, `/api/push/*` et les tables `user_stats` / `push_subscriptions` restent en place, réservés à l'app mobile. Aucun changement backend dans ce chantier.

## 3. Layout « objet radio » — 100dvh, zéro scroll

La page est une grille pleine hauteur (`100dvh`) à trois zones, sans scroll de page :

```
en-tête (hauteur auto, fine)     : wordmark, moment + heure vive, À propos, compte
zone player (1fr, absorbe tout)  : pochette, titre/artiste, timeline+waveform, contrôles
rail (hauteur fixe)              : « Vient de passer », ancré en bas
```

- **Desktop (≥1024px)** : pochette et bloc texte côte à côte ; la pochette n'est plus bornée à 280px, elle se dimensionne sur la hauteur disponible ; le titre Fraunces se déploie comme une « une » de journal.
- **Mobile** : pile verticale ; la pochette prend `min()` de la largeur et de la hauteur restante pour que contrôles + rail tiennent toujours.
- **Bio artiste** : `ArtistContext` (accordéon qui pousse le layout — cause principale du scroll actuel) devient un **panneau superposé** utilisant l'enveloppe de modale commune, ouvert depuis un affordance discret près du nom d'artiste.
- Compteur d'auditeurs et bouton bibliothèque intégrés à la ligne de contrôles secondaires.
- Le footer est supprimé.
- **Garde-fou** : sous ~600px de hauteur de fenêtre, un scroll interne est toléré plutôt que d'écraser les contrôles ; au-dessus, zéro scroll garanti et testé.

## 4. Uniformisation des composants

Règle : tout élément d'UI se construit à partir des primitives existantes (`.panel`, `.rule`, `.skeleton`, tokens moment, échelle typo 5 tailles, rayons `sm/md/lg`, eases `fluid/snappy`). Aucun style ad hoc.

- **Enveloppe de modale commune** (nouveau composant `ui/`) : entrée/sortie animée unique, en-tête avec filet `.rule`, bouton fermer, focus-trap, fermeture Échap/overlay, `prefers-reduced-motion` respecté. Adoptée par `AuthModal`, `LikedTracksModal`, `AboutModal` et le nouveau panneau artiste.
- **Boutons normalisés** : trois variantes nommées — accent, encre, fantôme — remplaçant les combinaisons `hover:` improvisées. Le bouton play reste l'exception monumentale.
- **Iconographie** : lucide uniquement ; tailles 16px (inline texte), 20px (contrôles secondaires).
- **États vides/chargement** : skeletons harmonisés ; messages vides rédigés dans le ton éditorial (bibliothèque vide, rail vide, artiste sans bio).
- **Toasts** : style `.panel` conservé, vérifié sur les 4 moments.

## 5. Process de test end-to-end (rejoué après chaque phase)

1. `pnpm typecheck && pnpm lint && pnpm test` (frontend Vitest ; backend non touché).
2. App en dev, pilotée via Chrome DevTools : captures d'écran aux **4 moments forcés × 3 viewports** (390×844, 768×1024, 1440×900), soit 12 captures inspectées.
3. Vérification programmatique zéro scroll : `document.documentElement.scrollHeight <= window.innerHeight` sur les 12 combinaisons (hauteur ≥ 600px).
4. Parcours fonctionnels : play/stop, volume/mute, like connecté et non connecté (→ modale auth), bibliothèque (recherche, suppression, export CSV, plateforme préférée, refresh liens), partage, sleep timer, panneau artiste, présence conditionnelle AirPlay, bannière PWA.
5. Zéro erreur console sur tous les parcours ; Lighthouse accessibilité ≥ 95 ; `prefers-reduced-motion` vérifié.

Le forçage de moment pour les tests s'appuie sur le mécanisme existant (`data-moment` sur la racine) via un override explicite en dev.

## 6. Critères de succès

- Aucun scroll de page à tous les viewports testés (hauteur ≥ 600px), aux 4 moments.
- Tous les composants passent par les primitives et l'enveloppe de modale commune ; zéro combinaison de style ad hoc restante dans les composants touchés.
- Chromecast et exports non-CSV absents du bundle (vérifiable dans `dist`).
- Les 5 étapes du process de test passent.
- L'histoire est lisible dans l'interface : signature aube, manifeste visible, taglines par moment.
