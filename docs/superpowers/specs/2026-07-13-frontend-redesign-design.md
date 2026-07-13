# Refonte front AubeSonore — Design Spec

**Date :** 2026-07-13
**Périmètre :** `apps/frontend` uniquement (le nettoyage backend push fera l'objet d'une PR séparée)
**Statut :** validé avec Victor (session du 13/07) — approche A « refonte d'atmosphère », enrichie motion design

## 1. Ligne éditoriale

Deux piliers qui se répondent :

- **Le fond — la découverte.** AubeSonore est une webradio de découverte musicale : des morceaux hors du mainstream, pas nécessairement récents, qui n'ont pas eu leur lumière.
- **La forme — le rythme du jour.** La programmation suit réellement le cycle de la journée (playlists AzuraCast Dawn 5h–9h, Day 9h–17h, Dusk 17h–22h, Night 22h–5h). L'interface incarne ce cycle : le site « sait quelle heure il est ».

La soudure entre les deux, c'est le nom : l'aube est le moment où quelque chose devient visible pour la première fois. AubeSonore = l'endroit où des morceaux restés dans l'ombre se lèvent. La lumière du jour est la métaphore de la découverte rendue littérale.

**Critère d'arbitrage de toute décision UI :** est-ce que ça exprime le moment de la journée et/ou la découverte de ce qui joue ? Sinon, ça dégage.

## 2. Tri des features (fondé sur les données du 13/07)

Données : 1 utilisateur, 13 likes (dernier le 13/07), 0 abonnement push, 1 session en 90 jours. Projet en pré-audience : chaque feature se juge sur « sert le récit » et « usage réel ».

| Feature | Décision | Justification |
| --- | --- | --- |
| Fond ambiant | **Repensé** — ciel génératif 2 couches | Porteur principal du thème |
| Historique | **Repensé** — fil-journée | LA feature narrative ; reprend le refactor WIP de mai (suppression `FullHistoryModal`) |
| Player | **Recentré** | Cœur de la scène + badge du moment |
| Likes + export | Gardé | Usage réel |
| Sleep timer | Gardé | Évidence de Nuit |
| Waveform | Gardée | Exprime le rythme de la musique (2e pilier) |
| Cast, PWA, auth (email + Google) | Gardés tels quels | Coût nul |
| Share cards (renderer satori/resvg) | **Supprimé** → Web Share API | Zéro usage ; retire satori + resvg-wasm du bundle. Copy : « [titre] — découvert à l'aube sur AubeSonore » + lien ; fallback copie du lien |
| Notifications push (front + SW) | **Supprimé** | 0 abonné ; une radio d'ambiance n'a rien d'événementiel à pousser |
| Stats modal | **Supprimé** | Le fil-journée raconte mieux que des compteurs |

## 3. Système de moments

- Source de vérité des bornes : les mêmes plages que les playlists AzuraCast — `dawn` 5h–9h, `day` 9h–17h, `dusk` 17h–22h, `night` 22h–5h. Constantes partagées dans un module unique (`lib/moments.ts`).
- `data-moment="dawn|day|dusk|night"` posé sur `<html>` par un hook `useMoment()` : calcule le moment courant, programme **un** timer vers la prochaine bascule (pas de polling), heure locale du visiteur.
- CSS custom properties par moment (teintes du ciel, accent, intensité de lumière) branchées dans les tokens Tailwind 4 via `@theme`. Quatre ambiances discrètes ; la bascule est chorégraphiée (voir §4), pas un dégradé continu minute par minute.

## 4. Le ciel génératif (identité visuelle)

Fond en deux couches :

1. **Le ciel** — génératif, pas une image : dégradé multi-stops piloté par les tokens du moment + grain subtil + halo soleil/lune positionné selon l'heure réelle. CSS pur pour l'état stable (zéro coût), GSAP pour les moments de vie :
   - à l'arrivée sur le site : la lumière « se lève » (timeline d'intro 2–3 s, une fois) ;
   - au changement de moment : lever/coucher chorégraphié.
2. **Le cover** — le blur du artwork de la piste en cours vient teinter le ciel (mécanique de préchargement de l'actuel `AmbientBackground` conservée). Allègement concret vs l'actuel `blur-[60px]` plein écran : image downscalée (≤ 64 px de côté) avant flou, rayon réduit (~40 px) — le coût GPU devient négligeable sans perte visuelle sur un aplat flouté. La musique colore la lumière, elle ne la dicte plus. Sans cover : le ciel seul porte l'atmosphère (plus jamais de fond plat).

## 5. Scroll narratif — le voyage dans la journée

Signature UX : en scrollant le fil-journée, ScrollTrigger (scrub) fait rejouer au ciel la lumière du moment traversé — descendre vers les pistes du matin ramène l'ambiance de l'aube. Le scroll est une machine à remonter la journée : forme et contenu racontent la même chose.

Précision d'architecture : le scroll ne touche **que la couche ciel** (interpolation visuelle GSAP). Le moment réel (`data-moment`, tokens, badge du player) reste piloté par l'horloge — remonter le fil ne « change pas l'heure » de l'interface, il éclaire le passé. Retour en haut de page = le ciel revient au présent.

## 6. Fil-journée

L'historique plat devient le récit de la journée en cours :

- pistes groupées sous des en-têtes de moments (Aube, Jour, Crépuscule, Nuit) — groupement par fonction pure testable à partir des bornes de `lib/moments.ts` ;
- chaque ligne : heure, titre, artiste, like, partage ;
- données : l'historique étendu synchronisé serveur existant (PR #68) — aucun changement backend ;
- reprend le refactor WIP de mai : fil inline, plus de modale plein écran.

## 7. Typographie

- Inter reste pour le texte courant.
- Ajout d'une display à caractère pour le wordmark et le nom du moment — **candidat : Fraunces (variable)**, à valider visuellement sur maquette avant adoption définitive.
- SplitText (GSAP) pour l'entrée du titre au changement de piste.

## 8. Outils & règle de répartition

- **`motion`** (successeur maintenu de framer-motion, même API) : micro-transitions de composants React — trackFlip, dataTick, mount/unmount, presence. Migration = renommage d'imports, pas de réécriture ; `motion-presets.ts` reste la source unique des durées/eases.
- **GSAP + `@gsap/react`** (`useGSAP`) : chorégraphies narratives — timelines du ciel, ScrollTrigger, SplitText. 100 % gratuit, plugins inclus.
- **Règle : chacun son étage, aucune migration croisée.** Un composant n'importe jamais les deux.
- Aucune autre dépendance nouvelle. Suppression de `satori`, `@resvg/resvg-wasm` (share cards) et du code push.

## 9. Performance & accessibilité (non négociable)

- Animations : `transform`/`opacity` uniquement ; timelines killées hors viewport ; discipline `will-change`.
- `prefers-reduced-motion` : toutes les chorégraphies dégénèrent en fondus simples ; le scroll narratif se désactive.
- Ciel stable = CSS pur ; le blur du cover est la seule couche coûteuse (allégée vs 60 px actuels).
- Budget bundle : l'ajout de GSAP doit rester inférieur au retrait satori/resvg — vérifié au bundle visualizer en place.
- Web-vitals conservés.

## 10. Tests

Stack existante (Vitest + RTL + MSW) :

- `useMoment` : bornes, bascules, timer unique ;
- groupement du fil-journée (fonction pure) ;
- partage Web Share (support + fallback) ;
- chemins critiques player préservés (lecture, like, erreurs flux).

## 11. Hors périmètre

- Backend : routes/service push retirés dans une PR séparée ; aucun autre changement.
- App mobile Expo : la refonte ne la couvre pas (le système de moments dans `packages/core` pourra être partagé plus tard).
- Multi-langue, pages éditoriales, thème manuel clair/sombre (le moment EST le thème).

## 12. Orchestration

Implémentation conduite en mode lead orchestrateur : plan découpé (skill writing-plans), exécution par agents spécialisés (design système, composants, review), validation de Victor aux jalons visuels (ciel, typographie, fil-journée).
