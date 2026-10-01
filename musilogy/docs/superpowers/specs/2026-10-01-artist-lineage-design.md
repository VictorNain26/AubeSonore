# Filiation d'un artiste — inspirations, descendance, contemporains

Conception du 2026-10-01. Elle remplace la spec de la frise du 2026-09-13 et
la spec links-first du 2026-09-29 (PR #17), et revient à l'intention de
départ, consignée dans `docs/research/2026-09-06-music-lineage-sources.md` :
à partir d'un artiste, voir **qui l'a inspiré**, **qui il a inspiré**, et
**qui jouait à la même époque, dans la même scène**.

Ses tables restent valables ; **sa séquence et son périmètre sont remplacés**
par `2026-10-02-frieze-lineage-design.md`, qui ramène la frise comme vue
principale.

Les chiffres sont **descriptifs**, mesurés le 2026-10-01 sur le dump
`20260909-001002` et sur les sources citées ; le contrat exécutable reste
`tests/test_baseline.py`.

## Principes

- **Chaque lien porte sa provenance**, affichée avec lui : fait MusicBrainz,
  déclaration Wikidata (référencée ou non), passage Wikipédia cité, ou
  calcul de musilogy. Le site n'affirme rien qu'une source n'affirme.
- **Découverte, pas popularité** : aucun ordre, filtre ou seuil fondé sur la
  notoriété — votes, écoutes, co-écoute, nombre d'albums ou de liens.
- **« Aucune source connue » est une réponse.** Un artiste sans inspiration
  connue l'affiche ; rien n'est deviné pour combler le vide.

## Ordre de livraison

**musilogy d'abord, AubeSonore ensuite.** Les trois axes sont des tables de
la couche 0, testées et couvertes par la ligne de base avant qu'un front les
lise. Une commande de lecture, `musilogy artist <mbid>`, affiche les trois
listes d'un artiste avec leur provenance : c'est ainsi qu'on juge le résultat
sur des artistes connus avant d'intégrer.

L'affichage vient ensuite sur la page artiste d'AubeSonore
(`/artist/:id/:slug`, PR AubeSonore #191), dont la table `artist` porte déjà
le `mbid`. Le Worker et la base D1 de la spec du 2026-09-29 sont abandonnés :
la note de recherche concluait déjà que Postgres suffit, et AubeSonore en a
un.

## Axe 1 et 2 — inspirations et descendance

Une seule table orientée, lue dans les deux sens :

```sql
lineage(artist_mbid, model_mbid, source, ref_status, evidence)
-- model_mbid est un modèle d'artist_mbid, au sens exact de `source`
```

Chaque ligne garde le terme de sa source — « élève de », « hommage à »,
« nommé d'après », « influencé par » — et le front l'affiche tel quel : un
professeur n'est pas présenté comme une influence déclarée.

Les inspirations d'un artiste sont les lignes où il est `artist_mbid` ; sa
descendance, celles où il est `model_mbid`.

### Sources retenues

| source | règle | lignes |
|---|---|---|
| `mb_teacher` | `links.type = 'teacher'` : `dst` est l'élève de `src` | 29 242 |
| `mb_tribute` | `links.type = 'tribute'` : `src` rend hommage à `dst` | 2 780 |
| `mb_named_after` | `links.type = 'named after artist'` : `src` porte le nom de `dst` | 666 |
| `wikidata_p737` | « influenced by » (P737), sujet et objet portant un MBID (P434) | 8 624 |

Le sens des liens MusicBrainz est vérifié par l'âge : pour `teacher`, la
source est la plus âgée dans 21 918 cas contre 235 ; pour `tribute` et
`named after artist`, la cible est la plus âgée (20 contre 1, 55 contre 2).
Les groupes hommage dominent la descendance des artistes célèbres (dizaines
pour The Beatles) : le front les regroupe sous leur propre libellé plutôt que
de les mêler aux héritiers.

**Wikidata P737** (CC0, page Wikidata:Copyright). Requête exécutée le
2026-10-01 sur `query.wikidata.org` :

```sparql
SELECT (COUNT(DISTINCT ?st) AS ?stmts) (COUNT(DISTINCT ?s) AS ?subj) (COUNT(DISTINCT ?o) AS ?obj)
WHERE { ?s p:P737 ?st . ?st ps:P737 ?o . ?s wdt:P434 [] . ?o wdt:P434 [] . }
```

8 624 déclarations, 2 491 artistes influencés, 3 513 modèles. Sur les
10 226 déclarations dont le sujet porte un MBID, 3 706 ont au moins une
référence (36 %) et 1 964 une référence forte — « affirmé dans » (P248) ou
URL (P854), 19 %. `ref_status` le dit : `referenced` (P248 ou P854),
`other_ref` (toute autre référence, dont « importé de Wikipédia », P143),
`unreferenced`. La couverture est mince — quelques milliers
d'artistes sur 2,3 M — et le front l'assume.

**Reproductibilité.** Wikidata change en continu. Le `fetch` enregistre le
résultat de la requête d'extraction en JSON, avec son empreinte dans
`manifest.json`, comme les dumps MusicBrainz ; un rejeu repart de ce fichier,
pas du service.

### Sources écartées

| source | raison |
|---|---|
| Crawl AllMusic (`flaviovdf/allmusic-disruption`) | aucune licence, dernier commit 2019-07-17 : impubliable |
| WASABI KG (Zenodo 4312641) | CC-BY-NC-4.0 ; présence d'arêtes d'influence non vérifiée |
| Similarité audio (MERT, CLAP, MuQ, CLaMP 3) | exige l'audio, que le projet n'a pas ; sans commit depuis six mois ; poids souvent NC ; une similarité n'a pas de sens et n'est pas une influence ; le modèle d'influence par l'audio de Shalit et al. 2013 (proceedings.mlr.press/v28/shalit13.pdf) n'atteint qu'une corrélation de Spearman moyenne de 0,15 avec le classement d'influence d'AllMusic |
| ListenBrainz similar-artists | CC0 et maintenu, mais calculé sur la co-écoute ; le filtrage collaboratif sur-recommande les artistes populaires — « few popular items are over-recommended », Abdollahpouri, Burke et Mansoury 2020 (arxiv.org/abs/2003.11634) |
| Jev (TypeSafe AI) | voir plus bas |

## Axe 3 — contemporains

Calculés par musilogy, source `derived_scene`. Population : les 285 284
artistes qui ont une année de début et au moins un genre (12,5 % de
`artists`).

Chaque critère repose sur une définition ou une référence, pas sur un seuil
choisi :

- **contemporain** : des années d'activité qui se recouvrent — la définition
  du mot ;
- **même scène** : même lieu d'origine. Bennett et Peterson (*Music Scenes:
  Local, Translocal, and Virtual*, Vanderbilt University Press, 2004)
  distinguent scènes locales, translocales et virtuelles ; la notice de
  Project MUSE (muse.jhu.edu/book/2821) le confirme, mais la définition
  géographique de la scène locale n'a pas été lue dans le texte même, faute
  d'accès. `begin_area` (souvent la ville) manque pour 158 869 des 285 284
  artistes : on le prend quand il est connu, sinon le pays ;
- **genre commun** : au moins un genre partagé.

Aucun seuil supplémentaire : la liste n'est pas coupée, elle est
**ordonnée**, puis paginée. Ordre total et reproductible :

1. similarité de Jaccard des genres, décroissante — interprétable, car on
   peut montrer les genres partagés (Gabbolini et Bridge, ISMIR 2021,
   archives.ismir.net/ismir2021/paper/000026.pdf : « if items are described
   by sets of tags, then Jaccard similarity over tags also exhibits
   intrinsic intepretability ») ;
2. `mbid`.

Mesures sur un échantillon de 2 000 artistes, années qui se recouvrent et un
genre commun :

| lieu | médiane | p90 | p99 | sans contemporain |
|---|---|---|---|---|
| aucun | 9 045 | 39 768 | 90 708 | — |
| pays | 318 | 4 280 | 14 790 | 319 |
| `begin_area` | 0 | 28 | 250 | 1 335 |

Le front affiche les genres partagés à côté de chaque contemporain : c'est
la raison du lien, lisible. La forme de publication — liste complète ou
calcul à la demande — se mesure à l'implémentation, en taille et en temps
de requête.

## Phase 2 — influences extraites de Wikipédia

Pour dépasser les quelques milliers d'artistes de Wikidata, la seule source
publiable est la prose de Wikipédia (CC BY-SA), dont les sections
« influences » citent leurs références.

- **Accès** : Wikimedia Enterprise, offre gratuite (snapshots mensuels,
  50 000 requêtes On-demand par mois, enterprise.wikimedia.com/pricing/) ;
  Structured Contents est en bêta, « not covered by SLA ». Le jeu Parquet
  `wikimedia/structured-wikipedia` sur Hugging Face (cc-by-sa-4.0) est une
  alternative à évaluer. Les dumps HTML de dumps.wikimedia.org ne sont plus
  répliqués depuis le 2025-03-24.
- **MBID → article** : P434 donne l'élément Wikidata, son lien de site donne
  l'article. Couverture non mesurée.
- **Extraction** : Claude avec Citations, qui renvoie le passage exact.
  Citations « cannot be used together with structured outputs » (400) —
  platform.claude.com/docs/en/build-with-claude/citations — donc deux
  passes : extraction citée, puis structuration du texte obtenu.
- **Provenance** : `wikipedia_extracted`, avec l'URL, l'identifiant de
  révision et le passage cité.
- **Périmètre** : les artistes joués par AubeSonore (`radio_play`), un
  ensemble fini, avant toute extension. Leur nombre se mesure une fois la
  PR #191 en production.

**Jev** (TypeSafe AI, annoncé le 2026-09-15) prend un état fourni et renvoie
une décision typée avec une probabilité — « unstructured state in, typed
probabilistic decisions out » (typesafe.ai/blog/introducing-system-one-models-and-jev).
Il n'apporte pas de connaissance : il pourrait au mieux vérifier qu'un
passage affirme une influence, rôle que la passe citée remplit déjà. Accès
anticipé sur liste d'attente, API fermée, sans papier ni adoption mesurable :
il échoue aux critères de maintenance. À réévaluer s'il sort de l'accès
anticipé et que le coût de la vérification devient un problème.

## Prérequis repris de la spec du 2026-09-29

Extraire `disambiguation` (340 639 artistes partagent leur nom, 14,9 %) et
calculer `name_key` : la page artiste doit départager les homonymes dans
chaque liste d'inspirations, de descendants et de contemporains.

## Licence

`artists` et `genres` dépendent des genres MusicBrainz (CC-BY-NC-SA 3.0),
donc les contemporains aussi. Wikidata est CC0 ; Wikipédia CC BY-SA. La page
qui affiche ces listes porte l'attribution et l'usage reste non commercial.

## Séquence

1. **Couche 0** : `disambiguation`, `name_key`, table `lineage` (sources
   MusicBrainz), contemporains, commande `musilogy artist` ; rejouer la
   ligne de base — aucun compte existant ne doit bouger.
2. **Wikidata** : snapshot P737 dans `fetch`, empreinte, source
   `wikidata_p737` dans `lineage`.
3. **Validation** : lecture des trois listes sur un jeu d'artistes connus
   fixé à l'avance, écarts consignés.
4. **AubeSonore** : merge de la PR #191, import des tables musilogy dans
   Postgres, trois sections sur la page artiste avec leur provenance.
5. **Phase 2** : extraction Wikipédia sur les artistes joués.

Hors périmètre : la carte des genres, la recherche par alias. La frise,
exclue ici, revient avec la spec du 2026-10-02.
