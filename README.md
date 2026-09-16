# musilogy

Couche 0 : transforme deux dumps JSON MusicBrainz en cinq tables reproductibles et testées, et projette la frise chronologique en trois blobs binaires. La couche 1, la frise elle-même, n'en est qu'aux fondations : `web/` contient les décodeurs de ces blobs, testés contre la livraison versionnée, mais aucune interface — `web/index.html` a encore un `<body>` vide.

## Principe directeur

**La sortie n'affirme jamais plus que ce que la source porte.** Une absence reste une absence : elle n'est ni imputée en silence, ni prolongée, ni arbitrée. Quand une valeur est dérivée, elle est publiée avec la colonne qui dit d'où elle vient, pour que le consommateur distingue une donnée déclarée d'une donnée inférée. Quand une mesure est impossible, la colonne vaut NULL — jamais zéro, qui affirmerait une mesure qui n'a pas eu lieu.

**Population et projection sont deux choses distinctes.** `bands`, `albums`, `genres` et `members` portent la population complète ; `density` est une projection délibérément plus étroite, destinée à la frise. Un filtre d'affichage vit dans la projection, jamais dans la population — sinon la donnée écartée devient irrécupérable en aval.

C'est le changement le plus lourd par rapport à la première version de ce dépôt, qui appliquait le filtre de la frise à la population et n'en publiait que 63 487 groupes sur 682 447, soit 30 % de la masse d'albums réelle.

## Les cinq tables

Mesurées sur le dump de référence `20260909-001002` :

| Table | Contenu | Lignes |
|---|---|---|
| `bands` | un artiste : ses preuves de dates, sa ligne de vie dérivée, ses genres votés | 682 447 |
| `albums` | un point : une sortie d'album créditée à un seul artiste | 643 403 |
| `genres` | le vocabulaire porté par `bands`, avec sa fiabilité mesurée | 1 348 |
| `members` | un lien : un musicien dans un groupe, avec ses années | 601 759 |
| `density` | groupes présents par genre et par année | 52 201 cellules |

Colonnes réelles (voir `src/musilogy/sql/`) :

- **`bands`** : `mbid`, `name`, `type`, `y0_declared`, `y_end_declared`, `ended`, `country`, `begin_area`, `genres` (liste de `{mbid, name, votes}`, triée), `y_first_album`, `y_last_album`, `y0`, `y0_source`, `y_end`, `y_end_source`, `y_presence_end`.
- **`albums`** : `band_mbid`, `rg_mbid`, `title`, `y`, `soundtrack`.
- **`genres`** : `genre_mbid`, `name`, `n_bands`, `density_eligible`, `n_candidate_credits`, `multi_artist_drop_pct`.
- **`members`** : `band_mbid`, `person_mbid`, `y_begin`, `y_end`.
- **`density`** : `genre_mbid`, `year`, `present`.

`person_mbid` est une référence sortante : la couche 0 n'extrait que les groupes, orchestres et chœurs, donc l'individu désigné n'est pas dans `bands`. Une table intermédiaire, `presence(mbid, y0, y_presence_end)`, est calculée mais non publiée.

## Les règles

Chaque règle vit dans son fichier SQL numéroté (`src/musilogy/sql/`) ; **la numérotation est un ordre topologique de dépendance**, pas un rang dans une liste, et avance par pas de dix pour qu'une règle s'insère sans renumérotation — `55_` en est un exemple vivant.

- **`10_bands` — Population et lecture des dates.** Tout artiste extrait entre dans `bands` : aucun filtre de type, de date ou de genre. La lecture des dates est déterministe : l'année tient sur les quatre premiers caractères, sinon elle est **absente**, pas devinée. Une date hors de `[1850, année du dump]` — aux deux bords — et une fin antérieure au début sont neutralisées, et **chaque neutralisation alimente un compteur** dans `manifest.json`. Tous les genres sont conservés, triés explicitement par votes décroissants puis par nom.

- **`20_albums` — Albums.** Un release-group compte comme album s'il est de type primaire `Album` (filtré dès l'extraction), crédité à un **seul artiste distinct** présent dans `bands`, daté dans `[1850, année du dump]`, et dont les types secondaires sont vides ou inclus dans `{Soundtrack, Demo}`.

  Les démos sont acceptées parce qu'elles sont une preuve *contemporaine* d'activité précoce : 67,5 % des artistes ayant démo et album studio ont sorti la démo d'abord, 3 ans plus tôt en médiane parmi eux. Les albums live sont exclus pour la raison inverse : **MusicBrainz les date de leur publication, pas du concert** — 710 artistes ont un live daté plus de 20 ans après leur dernier studio, avec des titres qui portent eux-mêmes la vraie date (« Live in Paris (1966) », publié en 2024). Compilations, DJ-mix et remix sont exclus au même titre.

- **`30_bands_lifespan` — Ligne de vie et provenance.** Aux deux bords, **la preuve déclarée l'emporte, l'album prend le relais** : `y0` vaut l'année déclarée, sinon celle du premier album ; `y_end` la fin déclarée, sinon celle du dernier album. `y0_source` et `y_end_source` nomment la branche qui a produit la valeur. Les preuves brutes restent publiées à côté.

  **Une preuve issue d'un album n'est retenue à un bord que si elle ne contredit pas la preuve déclarée à l'autre bord.** Trois garde-fous symétriques, chacun compté :

  | garde-fou | cas | compte |
  |---|---|---|
  | `first_album_after_declared_end` | premier album postérieur à une fin déclarée — une réédition posthume n'est pas une preuve de formation | 81 |
  | `last_album_before_declared_begin` | dernier album antérieur à un début déclaré — symétrique, il produisait une fin étiquetée `last_album` qui valait en réalité l'année de début | 271 |
  | `first_album_with_begin_below_min_year` | début déclaré sous 1850 donc neutralisé : la source affirme que le groupe précède l'album | 73 |

- **`40_presence` — Présence.** Seuls les artistes dont `y0` est connu. `y_presence_end` borne `y_end` à l'année du dump.

- **`50_genres` — Vocabulaire.** Les genres effectivement portés par `bands`.

- **`55_genre_reliability` — Fiabilité mesurée.** Pour chaque genre, combien de lignes de crédit ses groupes auraient pu porter (`n_candidate_credits`) — une sortie créditée à deux artistes qui portent tous deux le genre compte deux fois, ce qui distingue les 27 199 crédits mesurés pour `classical` de ses 25 465 release-groups distincts — et quelle part la règle du crédit unique en écarte (`multi_artist_drop_pct`). Un genre sans aucun candidat garde NULL, pas 0.

- **`60_density` — Densité.** Délibérément plus étroite que la population : type `Group`, `y0` connu, au moins un genre, **et un genre `density_eligible`** — la règle est matérialisée dans `55_genre_reliability`, ce fichier ne fait que l'appliquer. Un groupe compte dans chacun de ses genres ; les totaux par genre ne s'additionnent pas.

- **`70_frieze` — Projection de la frise.** Une ligne par groupe dessinable, groupe pour groupe exactement la population de `density` : un groupe absent de `density` n'aurait aucune cellule où se placer. Paire par paire, elle est plus large, et délibérément : un groupe entre par un genre `density_eligible`, puis le blob porte tous les genres qu'il déclare ; les masquer revient au rendu. Chaque ligne reçoit un rang `i`, dans l'ordre `(y0, mbid)`, qui sert d'identité dans les blobs à la place du `mbid`. `y_end_is_declared` voyage à côté de `y1` (`y_presence_end`) pour que la frise ne dessine pas une fin que la source n'a jamais déclarée ; `n_albums`, plafonné à 255, est la clé de tri — un nombre que la source porte, là où un score de notoriété serait inventé.

- **`80_members` — Membres.** Les relations `member of band`, dédoublonnées, avec leurs années lues par la même macro stricte que partout ailleurs.

- **`85_lineage` — Filiation.** Deux groupes de la frise sont liés quand ils partagent au moins un musicien ; `shared` compte ces musiciens, plafonné à 255. **Ce n'est pas de l'influence** : MusicBrainz ne porte aucune relation d'influence, et la propriété P737 de Wikidata ne couvre que 624 groupes sur 682 447. L'arête va du groupe formé le plus tôt vers le plus tard ; à année de formation égale, la paire est écartée plutôt qu'orientée arbitrairement. Les deux extrémités appartiennent à `frieze` : une arête vers un groupe non dessinable n'aurait nulle part où arriver.

- **`90_invariants` — Contrôles.** Des vues qui doivent toutes renvoyer zéro ligne ; le nom de la vue *est* le nom de l'invariant. Chacune **recalcule indépendamment** ce qu'elle vérifie : une revue a montré qu'un invariant réutilisant la formule de production restait muet sur 265 violations réelles. Les bornes contractuelles y sont codées en dur, aux deux extrémités, sans relire les variables de session de la production ; changer de dump impose donc une modification délibérée de ce fichier — c'est l'intention.

Quatre bornes sont des variables de session posées par `build()` : `dump_year`, `min_year`, `multi_artist_drop_limit` et `min_candidate_credits`.

Les corrections manuelles (`src/musilogy/corrections.csv`, colonnes `mbid, field, value, justification, source`) sont appliquées avant la lecture des dates ; chaque ligne cite une source vérifiable, et un garde-fou échoue au-delà de 50 lignes.

## Pourquoi le répertoire savant sort de la frise

La règle du crédit unique ampute les genres très inégalement, parce qu'un disque classique crédite **compositeur et interprète** : 94,3 % des albums de `classical` sont perdus, 86,3 % de `orchestral`, contre 0,6 % pour `alternative metal`. La densité du classique ne veut donc rien dire.

Coder une liste de genres « classiques » serait un jugement arbitraire à maintenir. L'arbre des genres de Wikidata ne peut pas trancher non plus (voir plus bas), et MusicBrainz encore moins : **il ne publie aucun dump de genres**, et ses genres font partie du système de tags voté par les utilisateurs — une folksonomie plate, sans hiérarchie ni catégorie parente, par conception.

La règle est donc mesurée, pas nommée : `density` écarte les genres dont **la moitié au moins des albums candidats sont perdus, sur un échantillon d'au moins 200**. Le minimum d'échantillon porte du sens : au seuil seul, 35 genres sortiraient, dont `soukous`, `congolese rumba`, `lovers rock`, `punta` et `huayno` — de la musique populaire dont le taux élevé n'est que du bruit d'échantillon.

Résultat : **13 genres écartés, 1 554 paires groupe-genre sur 214 948.** Sur les 102 098 groupes porteurs d'un genre, 101 291 sont intacts, 211 gardent leur place grâce à un autre genre, et **596 perdent tout genre publiable** — dont 343 `string quartet` et 304 `classical`. 136 de ces 596 n'avaient de toute façon aucun `y0` et n'étaient pas plaçables sur la frise : la perte réelle pour `density` est de **460**. Aucun artiste et aucun album n'est supprimé : `classical` reste dans `genres` avec ses 846 groupes dans `bands` et leurs albums dans `albums`.

Le coût mesuré de la règle est un faux positif, `mincecore` (73,1 % sur 216 candidats), un micro-genre de grindcore : sur ses 16 groupes, un seul sort de la frise, et il n'a aucun album. Aucune exception n'est codée pour lui — une liste d'exceptions serait l'arbitrage qu'on évite.

## Ce que reçoit la couche 1

`data/out/<dump>/` contient les cinq tables en Parquet (archive complète), le manifeste, et un export JSON colonnaire gzippé **scindé** :

- `web/bands_timeline.json.gz` — les artistes dont `y0` est connu, donc plaçables sur une frise (15,6 Mo) ;
- `web/bands_rest.json.gz` — les autres, chargeables à la demande (9,4 Mo) ;
- `web/genres.json.gz` — le vocabulaire, avec `density_eligible`, `n_candidate_credits` et `multi_artist_drop_pct` ;
- `web/density.json.gz` — l'agrégat par genre et par année.

Et trois blobs binaires, la frise elle-même :

- `web/frieze.bin.gz` — un enregistrement par groupe dessinable, en tableaux typés derrière un en-tête `MFZ1` ;
- `web/lineage.bin.gz` — les arêtes orientées de filiation, `src`/`dst`/`shared` en tableaux séparés derrière `MLN1` ;
- `web/frieze_ids.bin` — les `mbid` bruts sur 16 octets dans l'ordre des lignes, derrière `MID1`, chargés au premier clic seulement.

Les trois s'indexent par le rang de ligne de `frieze`, pas par `mbid` : c'est ce qui rend la jointure implicite et le décodage immédiat. `docs/superpowers/specs/2026-09-13-layer1-frieze-design.md` décrit les trois formats octet par octet.

`density` est publié plutôt que laissé à recalculer, et `density_eligible` voyage désormais avec le vocabulaire comme une colonne à part entière — la règle elle-même, pas seulement les deux mesures qui la motivent, elles aussi publiées à côté pour qui veut l'auditer plutôt que la croire sur parole. Un consommateur n'a donc plus de seuil à coder en dur : sans cette colonne, reconstruire la densité depuis les seuls artefacts web donne 53 029 cellules au lieu de 52 201 — les 828 cellules des treize genres que la couche 0 refuse délibérément de publier. Réimplémenter une règle, c'est là qu'elle se perd.

Chaque ligne porte son `mbid` — la clé de jointure vers `density`, `members` et MusicBrainz — ses `genres`, et les deux bords avec leurs preuves brutes des deux côtés.

**Attention à `y_presence_end` quand la fin est inconnue.** La colonne vaut alors `y0` : le groupe se réduit à une barre d'un an. Cela concerne **22 496 groupes sur les 84 722 de type `Group` datés et porteurs d'un genre, soit 26,6 %**, dont 9 788 qui ne sont pas terminés et n'ont aucune preuve de fin. Sur ces 84 722, **84 262 alimentent effectivement une cellule** de `density` ; les 460 autres ne portent que des genres exclus. Un groupe formé en 2026 est donc un point, pas une barre ouverte. Pour rendre cela honnêtement, la couche 1 doit lire `ended` et `y_end_source` plutôt que `y_presence_end` seul : c'est le rendu faux le plus probable d'une première intégration.

**Deux sujets restent ouverts pour la couche 1.** Le poids : 15,6 Mo gzip pour la frise, non pas à cause des genres (1,7 Mo) mais des identifiants eux-mêmes, des UUID de 36 octets qui ne se compressent pas ; un chargement initial complet n'est pas réaliste sur mobile, et le découpage par genre ou par période lui revient. Et l'absence de hiérarchie : les 1 348 genres sont **plats**, sans regroupement possible, faute de source fiable — parcourir cette liste à la main n'est pas une interface.

`manifest.json` porte les empreintes des archives **et celles des douze fichiers livrés** — cinq Parquet, quatre `.json.gz`, trois blobs — (`output_sha256`), les comptes, les **paramètres** du run (`dump_year`, `min_year`, `multi_artist_drop_limit`, `min_candidate_credits`), les **entrées** (`rows_loaded` par table brute, le sidecar d'extraction), les anomalies de lecture de dates, les trois compteurs de neutralisation, les exclusions de densité, le commit et l'empreinte des corrections.

Ces empreintes de sortie sont opposables parce que la livraison est reproductible : à dump et code identiques, deux exécutions écrivent les mêmes octets. L'ordre des lignes est fixé par une clé totale sur chaque table et le gzip ne porte pas d'horodatage. Un consommateur distingue donc une livraison inchangée d'une nouvelle par sa seule empreinte, sans retélécharger.

## Chiffres de référence

Le **contrat exécutable** est `tests/test_baseline.py` : il confronte le pipeline entier au dump de référence et compare exactement les comptes, la somme des cellules de densité et la répartition des provenances. Les chiffres cités ici sont descriptifs ; en cas de divergence, c'est le test qui fait foi.

Deux situations, deux conduites, à ne pas confondre. **Sur le dump de référence, un écart signale une règle mal implémentée** — jamais un prétexte pour ajuster la ligne de base. **Sur un nouveau dump, tous les chiffres bougent légitimement**, et la ligne de base se régénère : les cinq comptes, les deux répartitions de provenance, les sept compteurs d'anomalies, les trois de neutralisation et les exclusions de densité. Il faut alors aussi mettre à jour `REFERENCE_DUMP`, la valeur par défaut de `dump_year`, ajouter le `reference/<dump>.SHA256SUMS` correspondant, et modifier à la main les bornes codées en dur dans les vues de `90_invariants.sql` — cette dernière opération est délibérément manuelle, c'est ce qui empêche une mauvaise variable de satisfaire à la fois la règle et son contrôle. Les extractions vivant dans `data/work/<dump>/`, changer `REFERENCE_DUMP` suffit à repartir d'une extraction neuve, sans rien vider à la main ; le manifeste porte déjà les paramètres du run (section précédente).

Provenance des bords, sur le dump de référence :

| | `declared` | dérivé des albums | inconnu |
|---|---|---|---|
| début (`y0_source`) | 235 246 | 145 620 | 301 581 |
| fin (`y_end_source`) | 48 842 | 251 514 | 382 091 |

## Limites assumées

- **Aucune hiérarchie de genres n'est publiée.** L'arbre Wikidata a été retiré après mesure : 323 genres sur 1 348 n'y avaient aucun parent, `free jazz` et `zeuhl` étaient rangés sous `classical`, et surtout `black metal`, `death metal`, `thrash metal` et `doom metal` **ne figuraient pas** parmi les descendants de `metal` — les 3ᵉ, 5ᵉ, 15ᵉ et 19ᵉ genres du vocabulaire. Un arbre qui marche pour le rock et casse sur le metal est pire qu'une absence d'arbre : il a l'air de fonctionner. La requête SPARQL reste dans l'historique git.

- **Une fin dérivée d'un album n'est pas une fin déclarée.** Elle est marquée `y_end_source = 'last_album'`. Parmi les groupes de type `Group` concernés ayant au moins deux albums, **3,38 % ont un dernier album isolé de plus de 15 ans** du précédent (1,04 % au-delà de 25) : des rééditions de fonds historiques qui étirent la ligne de vie. Les écarter demanderait un seuil arbitraire ; l'étiquette de provenance laisse la couche 1 trancher.

- **Le genre est un filtre de notoriété communautaire, et il est daté.** Part de **groupes** sans aucun genre, par époque de formation : 69,3 % pour 1967-1979, 72,6 % pour 1980-1999, 78,9 % pour 2000-2014, **82,7 % depuis 2023**. La densité près du présent est doublement une borne basse : par la présence, et parce que les groupes récents sont moins tagués. **L'ordre de grandeur est considérable** : la densité totale culmine en 2016 à 67 567 puis tombe à 11 276 en 2026, soit **−83 % en dix ans**, presque entièrement par artefact. La dernière décennie ne se lit pas comme une tendance.

- **`density` ignore les orchestres et chœurs**, faute d'un modèle de ligne de vie comparable — ce qui écartait déjà 37,9 % du répertoire savant avant toute mesure. Ils restent dans `bands`, `albums` et `members`.

- **59,3 % des artistes n'ont aucun album** qui passe les règles, et 301 581 n'ont aucun début exploitable. La base est complète par choix : la couche 1 filtre, la couche 0 ne jette pas.

## Installation, tests, exécution

Python 3.12 géré par `uv`.

```bash
uv sync
```

Deux niveaux de test :

- `uv run pytest` — suite rapide, quelques secondes, sans dépendance au dump. Tourne sur 28 témoins réels versionnés dans `tests/fixtures/` (extraits authentiques du dump de référence, jamais de données inventées) et sur quelques enregistrements synthétiques pour les formes qu'aucun témoin ne porte.
- `uv run pytest -m slow` — ligne de base : confronte le pipeline entier aux ~3 millions d'enregistrements du dump de référence. Exige les extractions dans `data/work/<dump>/` (non versionnées, ~10 min à produire) ; sinon le test est ignoré.

La suite passe depuis n'importe quel répertoire : tous les chemins sont ancrés sur le paquet (`musilogy.paths`), jamais sur le répertoire courant.

```bash
uv run musilogy run                 # fetch → extract → transform → validate → publish
uv run musilogy make-fixtures       # régénère les témoins depuis les extractions
uv run musilogy make-web-fixtures   # régénère les blobs témoins lus par les tests de web/
uv run musilogy sync-web            # copie la livraison courante dans web/public/data/
```

`web/public/data/` est la seule sortie versionnée : `tests/test_delivery.py` vérifie chaque fichier contre les empreintes du manifeste livré avec lui.

Qualité : `uv run ruff check`, `uv run ruff format --check`, `uv run mypy`. Côté `web/` (Node et pnpm, versions fixées par `web/.nvmrc` et `packageManager`) :

```bash
cd web
pnpm install
pnpm run check   # biome ci
pnpm run types   # tsc --noEmit
pnpm run test    # vitest
pnpm run build   # vite build
```

La CI (`.github/workflows/ci.yml`) passe les trois contrôles Python plus la suite rapide, et ces quatre commandes dans `web/` ; la suite lente exige le dump et reste manuelle.

## Structure du dépôt

```
src/musilogy/
  fetch.py               télécharge et vérifie une archive MusicBrainz (SHA-256)
  extract.py             projette les enregistrements bruts en flux, sans logique métier
  build.py               enchaîne les fichiers SQL, applique les corrections, vérifie les invariants
  publish.py             écrit Parquet, JSON colonnaire scindé et manifest.json
  cli.py                 les quatre commandes
  paths.py               chemins ancrés sur le paquet
  corrections.csv        corrections manuelles, versionné
  reference/             empreintes officielles des archives
  sql/                   les règles, en ordre topologique
tests/
  conftest.py            fixtures partagées
  fixtures/              témoins réels versionnés
  test_*.py              une suite par règle, plus test_baseline.py (suite lente)
web/
  src/blob/              décodeurs des trois blobs et du gzip, sans interface
  tests/                 tests vitest, sur des blobs témoins et sur la livraison
  public/data/           livraison versionnée : blobs, genres, densité, manifeste
  index.html             page vide, en attente de la couche 1
docs/superpowers/specs/  spécification de la frise, dont les formats binaires
```

## Licence et attribution

Les données de base MusicBrainz (artistes, dates, albums, relations) sont **CC0**. Les genres et tags sont des données supplémentaires sous **CC-BY-NC-SA 3.0**. Comme `bands` et `genres` en dépendent, **le jeu de données produit par ce pipeline est distribué sous CC-BY-NC-SA 3.0** : attribution à MusicBrainz obligatoire, usage non commercial uniquement, et partage à l'identique imposé à toute redistribution.

Les fixtures versionnées dans `tests/fixtures/` sont des extraits réels du dump MusicBrainz de référence, soumis à la même licence (voir `tests/fixtures/ATTRIBUTION.md`).
