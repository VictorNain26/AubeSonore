# musilogy

Couche 0 : transforme deux dumps JSON MusicBrainz en cinq tables reproductibles et testées, publiées en Parquet et en JSON gzippé. La couche 1, l'interface, n'existe pas encore : elle sera construite sur des briques standard qui lisent ces formats, sans format binaire maison.

## Principe directeur

**La sortie n'affirme jamais plus que ce que la source porte.** Une absence reste une absence : elle n'est ni imputée en silence, ni prolongée, ni arbitrée. Quand une valeur est dérivée, elle est publiée avec la colonne qui dit d'où elle vient, pour que le consommateur distingue une donnée déclarée d'une donnée inférée. Quand une mesure est impossible, la colonne vaut NULL — jamais zéro, qui affirmerait une mesure qui n'a pas eu lieu.

**Population et projection sont deux choses distinctes.** `artists`, `albums`, `genres` et `members` portent la population complète ; `density` est une projection délibérément plus étroite, destinée à la frise. Un filtre d'affichage vit dans la projection, jamais dans la population — sinon la donnée écartée devient irrécupérable en aval.

C'est le changement le plus lourd par rapport à la première version de ce dépôt, qui appliquait le filtre de la frise à la population et n'en publiait que 63 487 groupes sur 682 447, soit 30 % de la masse d'albums réelle.

## Les cinq tables

Mesurées sur le dump de référence `20260909-001002` :

| Table | Contenu | Lignes |
|---|---|---|
| `artists` | un artiste — groupe, orchestre, chœur ou personne : ses preuves de dates, sa ligne de vie dérivée, ses genres votés | 2 281 691 |
| `albums` | un point : une sortie d'album créditée à un seul artiste | 1 290 584 |
| `genres` | le vocabulaire porté par `artists`, avec sa fiabilité mesurée | 1 729 |
| `members` | un lien : un musicien dans un groupe, avec ses années | 601 759 |
| `density` | groupes présents par genre et par année | 58 767 cellules |

Colonnes réelles (voir `src/musilogy/sql/`) :

- **`artists`** : `mbid`, `name`, `type`, `y0_declared`, `y_end_declared`, `y_birth`, `ended`, `country`, `begin_area`, `genres_declared` et `genres_from_albums` (listes de `{mbid, name, votes}`, triées), `genres`, `genre_source`, `y_first_album`, `y_last_album`, `y0`, `y0_source`, `y_end`, `y_end_source`, `y_presence_end`.
- **`albums`** : `artist_mbid`, `rg_mbid`, `title`, `y`, `soundtrack`.
- **`genres`** : `genre_mbid`, `name`, `n_artists`, `density_eligible`, `n_candidate_credits`, `multi_artist_drop_pct`.
- **`members`** : `band_mbid`, `person_mbid`, `y_begin`, `y_end`.
- **`density`** : `genre_mbid`, `year`, `present`.

`person_mbid` désigne une personne de `artists` quand elle est de type `Person` ; ce n'est pas exigé, un membre pouvant être d'un type que la couche 0 n'extrait pas. Une table intermédiaire, `presence(mbid, y0, y_presence_end)`, est calculée mais non publiée.

## Les règles

Chaque règle vit dans son fichier SQL numéroté (`src/musilogy/sql/`) ; **la numérotation est un ordre topologique de dépendance**, pas un rang dans une liste, et avance par pas de dix pour qu'une règle s'insère sans renumérotation — `55_` en est un exemple vivant.

- **`10_bands` — Population et lecture des dates.** Tout artiste extrait — groupe, orchestre, chœur ou personne — entre dans `artists` : aucun filtre de date ou de genre. Les personnages, les « autres » et les artistes sans type ne sont pas extraits : ces derniers, 674 240 sur le dump de référence, ne portent presque aucun lien (2,6 %), contre un tiers des personnes. **Le `begin` d'une personne est une naissance, pas un début d'activité** : il est publié dans `y_birth` et ne devient jamais `y0_declared` ; une naissance illisible (8 962) ou future (2) est perdue et comptée comme toute autre date. Son `end`, un décès, clôt bien l'activité et se lit comme toute autre fin. La lecture des dates est déterministe : l'année tient sur les quatre premiers caractères, sinon elle est **absente**, pas devinée. Une date hors de `[1850, année du dump]` — aux deux bords — et une fin antérieure au début sont neutralisées, et **chaque neutralisation alimente un compteur** dans `manifest.json`. Tous les genres sont conservés, triés explicitement par votes décroissants puis par nom.

- **`20_albums` — Albums.** Un release-group compte comme album s'il est de type primaire `Album` (filtré dès l'extraction), crédité à un **seul artiste distinct** présent dans `artists`, daté dans `[1850, année du dump]`, et dont les types secondaires sont vides ou inclus dans `{Soundtrack, Demo}`.

  Les démos sont acceptées parce qu'elles sont une preuve *contemporaine* d'activité précoce : 61,7 % des artistes ayant démo et album studio ont sorti la démo d'abord, 3 ans plus tôt en médiane parmi eux. Les albums live sont exclus pour la raison inverse : **MusicBrainz les date de leur publication, pas du concert** — 914 artistes ont un live daté plus de 20 ans après leur dernier studio, avec des titres qui portent eux-mêmes la vraie date (« Live in Paris (1966) », publié en 2024). Compilations, DJ-mix et remix sont exclus au même titre.

- **`25_band_genres` — Genres d'un groupe.** La règle des dates, appliquée aux genres : **les genres déclarés l'emportent, ceux des albums prennent le relais.** Un groupe qui ne déclare aucun genre reçoit la somme des votes des genres de ses propres albums, ceux que `20_albums` a retenus. Un groupe qui en déclare ne mélange jamais ceux de ses albums : ce sont des votes sur des objets différents, et une union laisserait un album l'emporter sur le groupe. `genre_source` nomme la branche (`declared`, `albums`, ou NULL) ; les deux listes brutes restent publiées à côté de `genres`. Sur le dump de référence, 43,5 % des artistes porteurs d'un genre le tiennent de leurs albums.

- **`30_bands_lifespan` — Ligne de vie et provenance.** Aux deux bords, **la preuve déclarée l'emporte, l'album prend le relais** : `y0` vaut l'année déclarée, sinon celle du premier album ; `y_end` la fin déclarée, sinon celle du dernier album. `y0_source` et `y_end_source` nomment la branche qui a produit la valeur. Les preuves brutes restent publiées à côté.

  **Une preuve issue d'un album n'est retenue à un bord que si elle ne contredit pas la preuve déclarée à l'autre bord.** Sept garde-fous, chacun compté :

  | garde-fou | cas | compte |
  |---|---|---|
  | `first_album_after_declared_end` | premier album postérieur à une fin déclarée — une réédition posthume n'est pas une preuve de formation ; pour une personne, la fin est son décès | 2 000 |
  | `last_album_before_declared_begin` | dernier album antérieur à un début déclaré — symétrique, il produisait une fin étiquetée `last_album` qui valait en réalité l'année de début | 271 |
  | `first_album_with_begin_below_min_year` | début déclaré sous 1850 donc neutralisé : la source affirme que le groupe précède l'album | 73 |
  | `album_with_end_below_min_year` | fin déclarée sous 1850 : tout album lui est postérieur, aucun bord ne s'en déduit — Bach, mort en 1750, enregistré à partir de 1961 | 235 |
  | `first_album_with_birth_below_min_year` | personne née avant 1850 : elle précède tout album de la fenêtre — Robert Ballard, né en 1575, commencerait en 2019 | 326 |
  | `first_album_before_birth` | premier album antérieur à la naissance : la source se contredit, le début ne s'en déduit pas | 32 |
  | `last_album_before_birth` | dernier album antérieur à la naissance : symétrique, la fin ne s'en déduit pas | 17 |

- **`40_presence` — Présence.** Seuls les artistes dont `y0` est connu. `y_presence_end` borne `y_end` à l'année du dump.

- **`50_genres` — Vocabulaire.** Les genres effectivement portés par `artists.genres`, y compris ceux qu'aucun groupe ne déclare et que seuls des albums portent.

- **`55_genre_reliability` — Fiabilité mesurée.** Pour chaque genre, combien de lignes de crédit ses groupes auraient pu porter (`n_candidate_credits`) — une sortie créditée à deux artistes qui portent tous deux le genre compte deux fois, ce qui distingue les 27 199 crédits mesurés pour `classical` de ses 25 465 release-groups distincts — et quelle part la règle du crédit unique en écarte (`multi_artist_drop_pct`). Un genre sans aucun candidat garde NULL, pas 0. La mesure lit `genres_declared`, pas `genres` : un groupe ne reçoit les genres de ses albums que par des sorties créditées à lui seul, donc tous leurs candidats sont mono-artistes et le taux baisserait par construction — `modern classical` passerait de 78,8 % à 38,7 % et sortirait de l'exclusion. Les personnes restent hors de la mesure : elle qualifie `density`, qui ne compte que des groupes, et les co-crédits d'une personne (compositeur et interprète, leader et accompagnateurs) ne disent rien de ce que la règle coûte à un groupe ; admises, elles feraient sortir 28 genres de plus, dont `free jazz` et `soukous`.

- **`60_density` — Densité.** Délibérément plus étroite que la population : type `Group`, `y0` connu, au moins un genre, **et un genre `density_eligible`** — la règle est matérialisée dans `55_genre_reliability`, ce fichier ne fait que l'appliquer. Un groupe compte dans chacun de ses genres ; les totaux par genre ne s'additionnent pas.

- **`80_members` — Membres.** Les relations `member of band`, lues du côté du groupe seulement — le dump porte chaque relation sur ses deux artistes —, dédoublonnées, avec leurs années lues par la même macro stricte que partout ailleurs.

- **`90_invariants` — Contrôles.** Des vues qui doivent toutes renvoyer zéro ligne ; le nom de la vue *est* le nom de l'invariant. Chacune **recalcule indépendamment** ce qu'elle vérifie : une revue a montré qu'un invariant réutilisant la formule de production restait muet sur 265 violations réelles. Les bornes contractuelles y sont codées en dur, aux deux extrémités, sans relire les variables de session de la production ; changer de dump impose donc une modification délibérée de ce fichier — c'est l'intention.

Quatre bornes sont des variables de session posées par `build()` : `dump_year`, `min_year`, `multi_artist_drop_limit` et `min_candidate_credits`.

Les corrections manuelles (`src/musilogy/corrections.csv`, colonnes `mbid, field, value, justification, source`) sont appliquées avant la lecture des dates ; chaque ligne cite une source vérifiable, et un garde-fou échoue au-delà de 50 lignes.

## Pourquoi le répertoire savant sort de la frise

La règle du crédit unique ampute les genres très inégalement, parce qu'un disque classique crédite **compositeur et interprète** : 94,3 % des albums de `classical` sont perdus, 86,3 % de `orchestral`, contre 0,6 % pour `alternative metal`. La densité du classique ne veut donc rien dire.

Coder une liste de genres « classiques » serait un jugement arbitraire à maintenir. L'arbre des genres de Wikidata ne peut pas trancher non plus (voir plus bas), et MusicBrainz encore moins : **il ne publie aucun dump de genres**, et ses genres font partie du système de tags voté par les utilisateurs — une folksonomie plate, sans hiérarchie ni catégorie parente, par conception.

La règle est donc mesurée, pas nommée : `density` écarte les genres dont **la moitié au moins des albums candidats sont perdus, sur un échantillon d'au moins 200**. Le minimum d'échantillon porte du sens : au seuil seul, 35 genres sortiraient, dont `soukous`, `congolese rumba`, `lovers rock`, `punta` et `huayno` — de la musique populaire dont le taux élevé n'est que du bruit d'échantillon.

Résultat, hors personnes : **13 genres écartés, 4 311 paires groupe-genre sur 511 490.** Sur les 192 809 groupes porteurs d'un genre, 189 993 sont intacts, 1 793 gardent leur place grâce à un autre genre, et **1 023 perdent tout genre publiable** — dont 715 `classical` et 343 `string quartet`. 136 de ces 1 023 n'avaient de toute façon aucun `y0` et n'étaient pas plaçables sur la frise : la perte réelle pour `density` est de **887**. Aucun artiste et aucun album n'est supprimé : `classical` reste dans `genres` avec ses 12 240 artistes dans `artists`, dont 9 581 personnes, et leurs albums dans `albums`.

Le coût mesuré de la règle est un faux positif, `mincecore` (73,1 % sur 216 candidats), un micro-genre de grindcore : sur ses 20 groupes, trois sortent de la frise. Aucune exception n'est codée pour lui — une liste d'exceptions serait l'arbitrage qu'on évite.

## Ce que reçoit la couche 1

`data/out/<dump>/` contient les cinq tables en Parquet (archive complète), le manifeste, et un export JSON colonnaire gzippé **scindé** :

- `web/artists_timeline.json.gz` — les artistes dont `y0` est connu, donc plaçables sur une frise (41,3 Mo) ;
- `web/artists_rest.json.gz` — les autres, chargeables à la demande (56,2 Mo) ;
- `web/genres.json.gz` — le vocabulaire, avec `density_eligible`, `n_candidate_credits` et `multi_artist_drop_pct` ;
- `web/density.json.gz` — l'agrégat par genre et par année.

`density` est publié plutôt que laissé à recalculer, et `density_eligible` voyage désormais avec le vocabulaire comme une colonne à part entière — la règle elle-même, pas seulement les deux mesures qui la motivent, elles aussi publiées à côté pour qui veut l'auditer plutôt que la croire sur parole. Un consommateur n'a donc plus de seuil à coder en dur : sans cette colonne, reconstruire la densité depuis les seuls artefacts web donne 59 778 cellules au lieu de 58 767 — les 1 011 cellules des treize genres que la couche 0 refuse délibérément de publier. Réimplémenter une règle, c'est là qu'elle se perd.

Chaque ligne porte son `mbid` — la clé de jointure vers `density`, `members` et MusicBrainz — ses `genres`, et les deux bords avec leurs preuves brutes des deux côtés.

**Attention à `y_presence_end` quand la fin est inconnue.** La colonne vaut alors `y0` : le groupe se réduit à une barre d'un an. Cela concerne **53 761 groupes sur les 175 403 de type `Group` datés et porteurs d'un genre, soit 30,6 %**, dont 9 850 qui ne sont pas terminés et n'ont aucune preuve de fin. Sur ces 175 403, **174 516 alimentent effectivement une cellule** de `density` ; les 887 autres ne portent que des genres exclus. Un groupe formé en 2026 est donc un point, pas une barre ouverte. Pour rendre cela honnêtement, la couche 1 doit lire `ended` et `y_end_source` plutôt que `y_presence_end` seul : c'est le rendu faux le plus probable d'une première intégration.

**Deux sujets restent ouverts pour la couche 1.** Le poids : 41,3 Mo gzip pour `artists_timeline` et 56,2 Mo pour `artists_rest` ; un chargement initial complet n'est pas réaliste sur mobile, et le format de lecture lui revient. Et l'absence de hiérarchie : les 1 729 genres sont **plats**, sans regroupement possible, faute de source fiable — parcourir cette liste à la main n'est pas une interface.

`manifest.json` porte les empreintes des archives **et celles des neuf fichiers livrés** — cinq Parquet, quatre `.json.gz` — (`output_sha256`), les comptes, les **paramètres** du run (`dump_year`, `min_year`, `multi_artist_drop_limit`, `min_candidate_credits`), les **entrées** (`rows_loaded` par table brute, le sidecar d'extraction), les anomalies de lecture de dates, les sept compteurs de neutralisation, les exclusions de densité, le commit et l'empreinte des corrections.

Ces empreintes de sortie sont opposables parce que la livraison est reproductible : à dump et code identiques, deux exécutions écrivent les mêmes octets. L'ordre des lignes est fixé par une clé totale sur chaque table et le gzip ne porte pas d'horodatage. Un consommateur distingue donc une livraison inchangée d'une nouvelle par sa seule empreinte, sans retélécharger.

## Chiffres de référence

Le **contrat exécutable** est `tests/test_baseline.py` : il confronte le pipeline entier au dump de référence et compare exactement les comptes, la somme des cellules de densité et la répartition des provenances. Les chiffres cités ici sont descriptifs ; en cas de divergence, c'est le test qui fait foi.

Deux situations, deux conduites, à ne pas confondre. **Sur le dump de référence, un écart signale une règle mal implémentée** — jamais un prétexte pour ajuster la ligne de base. **Sur un nouveau dump, tous les chiffres bougent légitimement**, et la ligne de base se régénère : les cinq comptes, les trois répartitions de provenance, les neuf compteurs d'anomalies, les sept de neutralisation et les exclusions de densité. Il faut alors aussi mettre à jour `REFERENCE_DUMP`, la valeur par défaut de `dump_year`, ajouter le `reference/<dump>.SHA256SUMS` correspondant, et modifier à la main les bornes codées en dur dans les vues de `90_invariants.sql` — cette dernière opération est délibérément manuelle, c'est ce qui empêche une mauvaise variable de satisfaire à la fois la règle et son contrôle. Les extractions vivant dans `data/work/<dump>/`, changer `REFERENCE_DUMP` suffit à repartir d'une extraction neuve, sans rien vider à la main ; le manifeste porte déjà les paramètres du run (section précédente).

Provenance des bords, sur le dump de référence :

| | `declared` | dérivé des albums | inconnu |
|---|---|---|---|
| début (`y0_source`) | 235 246 | 346 442 | 1 700 003 |
| fin (`y_end_source`) | 147 025 | 438 801 | 1 695 865 |
| genres (`genre_source`) | 199 611 | 153 624 | 1 928 456 |

Pour une personne, le début n'est jamais `declared` (sa déclaration est une naissance) et une fin `declared` est un décès.

## Limites assumées

- **Aucune hiérarchie de genres n'est publiée.** L'arbre Wikidata a été retiré après mesure : 323 genres sur les 1 348 du vocabulaire d'alors n'y avaient aucun parent, `free jazz` et `zeuhl` étaient rangés sous `classical`, et surtout `black metal`, `death metal`, `thrash metal` et `doom metal` **ne figuraient pas** parmi les descendants de `metal` — les 3ᵉ, 5ᵉ, 15ᵉ et 19ᵉ genres du vocabulaire. Un arbre qui marche pour le rock et casse sur le metal est pire qu'une absence d'arbre : il a l'air de fonctionner. La requête SPARQL reste dans l'historique git.

- **Une fin dérivée d'un album n'est pas une fin déclarée.** Elle est marquée `y_end_source = 'last_album'`. Parmi les groupes de type `Group` concernés ayant au moins deux albums, **3,38 % ont un dernier album isolé de plus de 15 ans** du précédent (1,04 % au-delà de 25) : des rééditions de fonds historiques qui étirent la ligne de vie. Les écarter demanderait un seuil arbitraire ; l'étiquette de provenance laisse la couche 1 trancher.

- **Le genre est un filtre de notoriété communautaire, et il est daté.** Part de **groupes** datés sans aucun genre, par époque de formation, même en prenant ceux des albums : 34,4 % pour 1967-1979, 43,1 % pour 1980-1999, 53,8 % pour 2000-2014, **75,5 % depuis 2023** (69,3 %, 72,6 %, 78,9 % et 82,7 % sur les seuls genres déclarés). La densité près du présent est doublement une borne basse : par la présence, et parce que les groupes récents sont moins tagués. **L'ordre de grandeur est considérable** : la densité totale culmine en 2014 à 150 046 puis tombe à 17 106 en 2026, soit **−89 % en douze ans**, presque entièrement par artefact. La dernière décennie ne se lit pas comme une tendance.

- **`density` ignore les orchestres, les chœurs et les personnes**, faute d'un modèle de ligne de vie comparable — orchestres et chœurs écartaient déjà 21,4 % des groupes du répertoire savant avant toute mesure. Tous restent dans `artists`, `albums` et `members`.

- **78,9 % des artistes n'ont aucun album** qui passe les règles, et 1 700 003 n'ont aucun début exploitable. La base est complète par choix : la couche 1 filtre, la couche 0 ne jette pas.

## Installation, tests, exécution

Python 3.12 géré par `uv`.

```bash
uv sync
```

Deux niveaux de test :

- `uv run pytest` — suite rapide, quelques secondes, sans dépendance au dump. Tourne sur 33 témoins réels versionnés dans `tests/fixtures/` (extraits authentiques du dump de référence, jamais de données inventées) et sur quelques enregistrements synthétiques pour les formes qu'aucun témoin ne porte.
- `uv run pytest -m slow` — ligne de base : confronte le pipeline entier aux ~3 millions d'enregistrements du dump de référence. Exige les extractions dans `data/work/<dump>/` (non versionnées, ~10 min à produire) ; sinon le test est ignoré.

La suite passe depuis n'importe quel répertoire : tous les chemins sont ancrés sur le paquet (`musilogy.paths`), jamais sur le répertoire courant.

```bash
uv run musilogy run                 # fetch → extract → transform → validate → publish
uv run musilogy make-fixtures       # régénère les témoins depuis les extractions
```

Aucune sortie du pipeline n'est versionnée ; seules les empreintes et les fixtures le sont.

Qualité : `uv run ruff check`, `uv run ruff format --check`, `uv run mypy`. La CI (`.github/workflows/ci.yml`) passe ces trois contrôles plus la suite rapide ; la suite lente exige le dump et reste manuelle.

## Structure du dépôt

```
src/musilogy/
  fetch.py               télécharge et vérifie une archive MusicBrainz (SHA-256)
  extract.py             projette les enregistrements bruts en flux, sans logique métier
  build.py               enchaîne les fichiers SQL, applique les corrections, vérifie les invariants
  publish.py             écrit Parquet, JSON colonnaire scindé et manifest.json
  cli.py                 les deux commandes
  paths.py               chemins ancrés sur le paquet
  corrections.csv        corrections manuelles, versionné
  reference/             empreintes officielles des archives
  sql/                   les règles, en ordre topologique
tests/
  conftest.py            fixtures partagées
  fixtures/              témoins réels versionnés
  test_*.py              une suite par règle, plus test_baseline.py (suite lente)
docs/superpowers/       spécifications et plans datés, historiques
```

## Licence et attribution

Les données de base MusicBrainz (artistes, dates, albums, relations) sont **CC0**. Les genres et tags sont des données supplémentaires sous **CC-BY-NC-SA 3.0**. Comme `artists` et `genres` en dépendent, **le jeu de données produit par ce pipeline est distribué sous CC-BY-NC-SA 3.0** : attribution à MusicBrainz obligatoire, usage non commercial uniquement, et partage à l'identique imposé à toute redistribution.

Les fixtures versionnées dans `tests/fixtures/` sont des extraits réels du dump MusicBrainz de référence, soumis à la même licence (voir `tests/fixtures/ATTRIBUTION.md`).
