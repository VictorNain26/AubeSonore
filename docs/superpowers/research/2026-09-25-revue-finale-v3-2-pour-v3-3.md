# Revue finale v3-2 — ce que le plan v3-3 (modèle) doit prendre en compte

Source : revue finale de la branche `refonte/gout-v3`, plage 7ee0ed1..c9252cb, faite le 2026-09-25.
Les points ci-dessous ne sont pas des défauts de v3-2. Ce sont des risques de fuite ou de biais que
l'entraînement et l'évaluation du modèle (spec §5.4, §7) doivent neutraliser ou mesurer.

## 1. Rang du titre : artefact d'échantillonnage (risque de fuite le plus fort)

Les candidats et les négatifs viennent tous du top 10 de leur artiste. Les titres de la bibliothèque
sont ceux qui ont été rapprochés : faces B, copies de compilation. La distribution du rang Deezer
diffère donc selon l'origine à cause de l'échantillonnage, pas du goût, et HGB apprendra « rang élevé ⇒ pas
bibliothèque ».

→ Faire l'ablation du rang du titre séparément des signaux d'artiste (fans, auditeurs). Envisager de le
retirer, ou de le rendre relatif aux autres titres du même artiste.

## 2. Valeurs absentes corrélées à l'origine

Les candidats sont connus de Last.fm par construction, puisqu'ils viennent de `getSimilar`. Les négatifs
sont des artistes des classements. Les NaN (auditeurs, match, culture) tombent donc presque tous sur la
bibliothèque, et HGB, qui gère les NaN nativement, apprendra « NaN ⇒ positif ». Cela gonfle la validation
croisée côté bibliothèque, ainsi que le garde-fou §7.3 (≥ 80 % de la bibliothèque acceptée, artiste retiré).

→ Rapporter les taux d'absence PAR ORIGINE. Vérifier le garde-fou avec une ablation des indicateurs
d'absence.

## 3. Proximité saturée pour les candidats

Un candidat n'existe que parce que Deezer ET Last.fm le relient à une graine de la bibliothèque. Pour eux,
« sources » vaut donc presque toujours 2. La proximité sépare surtout la bibliothèque et les candidats des
négatifs faibles.

→ Juger son apport uniquement sur les votes (§5.4.6), comme le prévoit déjà la spec.

## 4. Vocabulaire de culture

- Il exclut les négatifs par construction, si bien que les négatifs ont souvent un vecteur nul : une
  séparation en partie artificielle.
- Il est recalculé à chaque `load_signals`, et les candidats s'accumulent.

→ Figer le vocabulaire avec le modèle entraîné et noter les titres avec ce vocabulaire. Il faut ajouter à
`load_signals` un paramètre `vocabulary` optionnel. Sans lui, les colonnes de culture se décalent
silencieusement entre l'entraînement et la notation.

## 5. Validation croisée groupée par artiste

Un artiste Plex peut être rapproché de plusieurs pages Deezer (pages scindées). Le même artiste réel se
retrouve alors dans les plis d'entraînement et de test.

→ Grouper par nom normalisé, ou par un identifiant fusionné, et non par `artist_ids`.

La même scission gonfle le poids de graine : les deux ids reçoivent toutes les écoutes du nom Plex
(`radio/library/artists.py`). C'est à corriger si la découverte s'en ressent.

## 6. Règle d'étiquettes

- Prendre les étiquettes de `tracks.origin` seulement.
- Exclure des négatifs faibles tout artiste présent dans `library_artists`. `negatives-sync` saute
  désormais ces artistes, mais la bibliothèque évolue.
- Un titre `candidate` dont l'artiste est entre-temps entré dans la bibliothèque devient « non
  étiqueté ». L'exclure aussi de la sélection des votes (v3-4).
- Le dédoublonnage se fait par origine : un candidat peut doubler un négatif (même artiste, version
  remasterisée). La règle d'étiquettes doit trancher ce cas (priorité au négatif, ou exclusion).

## 7. Auto-liens résiduels dans la proximité

Les entrées de collaboration Last.fm (« X & artiste de la bibliothèque ») comptent dans le match d'un
artiste de la bibliothèque. Ce sont bien d'autres entrées de la bibliothèque, mais elles sont plus
fréquentes pour la bibliothèque.

→ Regarder, pendant l'ablation, la distribution de la proximité (artiste retiré) des artistes de la
bibliothèque.

## Différés de v3-2 (pour mémoire)

- Un rang Deezer absent devient 0 au lieu de NaN (`radio/sources/deezer.py`). Deezer semble toujours
  le fournir.
- La branche `except` au niveau de la graine dans `discover_pass` (erreur définitive de `neighbours()`)
  n'est pas testée. C'est le premier test à ajouter.
