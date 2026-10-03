# Frise et filiation — conception

Conception du 2026-10-02, complétée le 2026-10-03. C'est la seule spec en
vigueur : elle absorbe la spec de filiation du 2026-10-01 (tables, sources,
contemporains), qui remplaçait elle-même la spec de la frise du 2026-09-13 et
la spec links-first du 2026-09-29 ; leur texte reste dans l'historique git.
Ce qui change par rapport au 2026-10-01 : **la frise redevient la vue
principale, la filiation se dessine dessus**, et la popularité ordonne
l'affichage au lieu d'en être bannie.

Les chiffres sont **descriptifs**, mesurés le 2026-10-01 sur le dump
`20260909-001002` et sur les sources citées ; le contrat exécutable reste
`tests/test_baseline.py`.

## Intention

Naviguer sur une frise pour découvrir : voir d'abord les artistes marquants
d'une période, puis, en zoomant, les moins connus ; survoler un artiste pour
voir ses liens, cliquer pour se recentrer sur un autre. Le temps donne son
sens à la filiation : les inspirations sont avant, la descendance après, les
contemporains dans la même colonne.

L'intention de départ est consignée dans
`docs/research/2026-09-06-music-lineage-sources.md` : à partir d'un artiste,
voir **qui l'a inspiré**, **qui il a inspiré**, et **qui jouait à la même
époque, dans la même scène**.

## Principes

- **Chaque lien porte sa provenance**, affichée avec lui : fait MusicBrainz,
  déclaration Wikidata (référencée ou non), passage Wikipédia cité, ou
  calcul de musilogy. Le site n'affirme rien qu'une source n'affirme.
- **« Aucune source connue » est une réponse.** Un artiste sans inspiration
  connue l'affiche ; rien n'est deviné pour combler le vide.
- **Prioriser sans exclure** : la popularité décide de ce qu'on voit en
  premier, jamais de ce qui existe (section suivante).

## Visibilité : prioriser sans exclure

La règle du 2026-09-28 (« aucune visibilité fondée sur la popularité ») est
remplacée. La frise suit le modèle publié de Furnas, *Generalized Fisheye
Views*, CHI '86, p. 16-23 :

> DOIfisheye (x|.=y) = API(x) – D(x,y) — « API(x) is the global A Priori
> Importance of x and D(x,y) is the Distance between x and the current point
> y. That is, the interest increases with a priori importance and decreases
> with distance. »

et le parcours de Shneiderman (*The Eyes Have It*, 1996) : « Overview first,
zoom and filter, then details-on-demand ».

Appliqué ici :

- `API` est la popularité ListenBrainz (section Sources) ; `D` est l'écart
  entre un artiste et la fenêtre regardée (période × genre) ;
- **la popularité ordonne l'apparition et l'étiquetage, elle n'exclut
  jamais** : au zoom le plus fin, chaque artiste de la population est
  présent ;
- une fois la fenêtre réduite à un genre et une période, l'ordre redevient
  neutre (`y0`, puis `mbid`).

La règle tient parce que le volume à montrer est faible dès qu'on filtre.
Groupes présents par genre et par année (`density`, 58 767 cellules) :
médiane 5, p90 109, p99 1 266. Seuls les genres parapluies dépassent : 17 234
groupes au pic de `rock`, environ 5 400 pour `electronic`, 5 200 pour `metal`.
C'est là, et seulement là, que l'ordre par popularité décide de ce qu'on voit
en premier.

Les seuils de passage d'un niveau de zoom à l'autre ne sont pas fixés ici :
ils se mesurent sur le prototype, en nombre d'éléments lisibles à l'écran.

## Trois niveaux

1. **Vue d'ensemble** : les genres comme courants dans le temps (`density`),
   avec les étiquettes des artistes au plus fort degré d'intérêt.
2. **Genre × période** : chaque artiste est une ligne de vie de `y0` à
   `y_end` (ou `y_presence_end`), tous présents.
3. **Artiste** : au survol, ses liens (`links`) et sa filiation (`lineage`)
   se dessinent sur la frise ; au clic, la frise se recentre ; un panneau
   donne les trois listes — inspirations, descendance, contemporains — avec
   leur provenance.

## Filiation : inspirations et descendance

Une seule table orientée, lue dans les deux sens :

```sql
lineage(artist_mbid, model_mbid, source)
-- model_mbid est un modèle d'artist_mbid, au sens exact de `source`
```

Les colonnes `ref_status` et `evidence` arriveront avec Wikidata, la première
source qui les remplit. Chaque ligne garde le terme de sa source — « élève
de », « hommage à », « nommé d'après », « influencé par » — et le front
l'affiche tel quel : un professeur n'est pas présenté comme une influence
déclarée. Les inspirations d'un artiste sont les lignes où il est
`artist_mbid` ; sa descendance, celles où il est `model_mbid`.

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
URL (P854), 19 %. `ref_status` le dira : `referenced` (P248 ou P854),
`other_ref` (toute autre référence, dont « importé de Wikipédia », P143),
`unreferenced`. La couverture est mince — quelques milliers d'artistes sur
2,3 M — et le front l'assume. Wikidata change en continu : `fetch` en prend
un relevé daté avec empreinte, comme un dump, et un rejeu repart de ce
fichier, pas du service.

### Sources écartées

| source | raison |
|---|---|
| Crawl AllMusic (`flaviovdf/allmusic-disruption`) | aucune licence, dernier commit 2019-07-17 : impubliable |
| WASABI KG (Zenodo 4312641) | CC-BY-NC-4.0 ; présence d'arêtes d'influence non vérifiée |
| Similarité audio (MERT, CLAP, MuQ, CLaMP 3) | exige l'audio, que le projet n'a pas ; sans commit depuis six mois ; poids souvent NC ; une similarité n'est pas une influence ; le modèle d'influence par l'audio de Shalit et al. 2013 (proceedings.mlr.press/v28/shalit13.pdf) n'atteint qu'une corrélation de Spearman moyenne de 0,15 avec le classement d'influence d'AllMusic |
| ListenBrainz similar-artists | CC0 et maintenu, mais calculé sur la co-écoute ; le filtrage collaboratif sur-recommande les artistes populaires — « few popular items are over-recommended », Abdollahpouri, Burke et Mansoury 2020 (arxiv.org/abs/2003.11634) |
| Jev (TypeSafe AI, annoncé le 2026-09-15) | n'apporte pas de connaissance, au mieux une vérification que la passe citée de Wikipédia remplit déjà ; accès anticipé, API fermée, sans papier ni adoption mesurable (typesafe.ai/blog/introducing-system-one-models-and-jev) |

## Contemporains

Calculés par musilogy, à la demande. Chaque critère repose sur une
définition ou une référence, pas sur un seuil choisi :

- **contemporain** : des années de présence qui se recouvrent (`y0` à
  `y_presence_end`) — la définition du mot ;
- **même scène** : même lieu d'origine. Bennett et Peterson (*Music Scenes:
  Local, Translocal, and Virtual*, Vanderbilt University Press, 2004)
  distinguent scènes locales, translocales et virtuelles ; la notice de
  Project MUSE (muse.jhu.edu/book/2821) le confirme, mais la définition
  géographique de la scène locale n'a pas été lue dans le texte même, faute
  d'accès. On prend le `begin_area_mbid` quand il est connu — l'identité du
  lieu, pas son nom, que London partage avec l'Ontario —, sinon le pays ;
- **genre commun** : au moins un genre partagé.

Aucun seuil supplémentaire : la liste n'est pas coupée, elle est
**ordonnée**, puis paginée. Ordre total et reproductible : similarité de
Jaccard des genres, décroissante — interprétable, car on peut montrer les
genres partagés (Gabbolini et Bridge, ISMIR 2021,
archives.ismir.net/ismir2021/paper/000026.pdf : « if items are described by
sets of tags, then Jaccard similarity over tags also exhibits intrinsic
intepretability ») —, puis `mbid`. Le front affiche les genres partagés à
côté de chaque contemporain : c'est la raison du lien.

Mesures sur un échantillon de 2 000 artistes, années qui se recouvrent et un
genre commun :

| lieu | médiane | p90 | p99 | sans contemporain |
|---|---|---|---|---|
| aucun | 9 045 | 39 768 | 90 708 | — |
| pays | 318 | 4 280 | 14 790 | 319 |
| `begin_area` | 0 | 28 | 250 | 1 335 |

Publiée complète, la liste ferait environ 188 millions de lignes : elle se
calcule à la demande, une centaine de millisecondes par artiste sous DuckDB.

## Données : ce qu'on a, ce qui manque

Mesuré sur le dump de référence (groupes, sauf mention) :

| besoin | état | complément |
|---|---|---|
| placer un groupe (date + genre) | 175 403 sur 659 642 | — |
| groupes datés sans genre | 197 423, absents de la frise | tags MusicBrainz : 2,8 % en ont ; **lien Discogs : 37,6 %** |
| popularité | ListenBrainz couvre 85 à 100 % des groupes de la frise par décennie, 1950–2020 | Wikidata écarté : fiche pour 5 à 68 %, médiane 1 à 3 sitelinks |
| structure des genres | relations `subgenre`, `influenced by`, `fusion of` dans MusicBrainz | absentes des dumps JSON et de `ws/2` (`inc=genre-rels` ne renvoie rien) : dump PostgreSQL |
| filiation | sources MusicBrainz ; Wikidata ne relie qu'une minorité d'artistes récents | phase Wikipédia |
| écouter | Bandcamp 29 %, streaming gratuit 31 %, YouTube 17 % des groupes de la frise ; vidéos YouTube dans Discogs | recherche Deezer d'AubeSonore |
| personnes | 6,8 % placées : leur `begin` est une naissance | `y_first_album` |

Échantillons : ListenBrainz et Wikidata, 40 groupes par décennie et par
présence de genre (640), tirés par `hash(mbid)`. Liens externes : scan complet
de `artist.tar.xz`.

## Sources ajoutées

### ListenBrainz — popularité

- `POST /1/popularity/artist` renvoie `total_listen_count` et
  `total_user_count` par MBID
  (listenbrainz.readthedocs.io/en/latest/users/api/popularity.html) ; au plus
  `MAX_ITEMS_PER_GET = 1000` MBID par requête
  (`listenbrainz/webserver/views/api_tools.py`).
- Licence : les données d'écoute sont publiées sous CC0
  (listenbrainz.readthedocs.io/en/latest/users/listenbrainz-dumps.html).
- La valeur bouge chaque jour : `snapshot-popularity` en prend un **relevé
  daté**, avec empreinte, comme un dump. Table `popularity(mbid,
  listen_count, user_count, snapshot)`.

### Discogs — genres manquants

- Dumps mensuels sous « CC0 No Rights Reserved » (data.discogs.com), dernier
  au 2026-10-01. `discogs_<date>_masters.xml.gz` porte, par master : les
  identifiants d'artistes, `genres`, `styles`, `year`, et des vidéos YouTube.
- Raccord : la relation URL `discogs` de MusicBrainz (77,6 % des groupes de
  la frise). L'extraction doit donc garder les relations URL utiles
  (`discogs`, `wikidata`, `bandcamp`, `free streaming`, `streaming`,
  `youtube`) au lieu de les écarter.
- Un genre venu de Discogs est publié avec `genre_source = 'discogs'`. La
  correspondance style Discogs → genre MusicBrainz se fait par nom ; sa
  couverture se mesure avant d'être adoptée, et un style sans équivalent
  reste non apparié plutôt que deviné.

### MusicBrainz — graphe des genres

- `genre` et `l_genre_genre` sont dans la liste `CORE_TABLE_LIST` de
  `lib/MusicBrainz/Server/Constants.pm`, donc dans `mbdump.tar.bz2`, sous CC0
  (et non dans `mbdump-derived`, qui porte les tags).
- `mbdump.tar.bz2` pèse 7 Go (fullexport du 2026-09-30) : on n'en lit que les
  tables de genres et de liens, en flux, et la date du fullexport retenu est
  publiée dans `manifest.json`.

### Wikipédia — influences extraites

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
  ensemble fini, avant toute extension.

## Intégration dans le site

Le site lit les tables de musilogy **importées dans sa base** ; il n'appelle
jamais musilogy à l'exécution.

### Import

- `musilogy load` lit les Parquet publiés de `data/out/<dump>/` et les écrit
  dans la base Postgres du site par l'extension `postgres` de DuckDB
  (`ATTACH '<dsn>' AS site (TYPE postgres)`,
  duckdb.org/docs/current/core_extensions/postgres/overview.html). Aucune
  dépendance nouvelle côté Python : DuckDB est déjà le moteur de musilogy.
- Tables chargées : celles que la frise lit — `artists`, `genres`,
  `density`, `links`, `lineage`, `popularity` — plus `manifest` (dump,
  relevé, commit), que la page cite comme source. `albums` reste en Parquet
  tant qu'aucun écran ne le lit.
- **Bascule atomique** : le chargement remplit `musilogy_next`, vérifie ses
  comptes contre le manifeste, puis une seule transaction Postgres remplace
  `musilogy` par lui. Le site ne lit jamais un import partiel, et un import
  raté laisse le précédent en place. Mesuré : environ 3 min, 1,1 Go.
- Les listes de genres deviennent du `jsonb` (Postgres n'a pas de structure
  anonyme), avec leurs `mbid` dans un `text[]` pour les requêtes.
- Le schéma `musilogy` n'appartient pas à Drizzle : `drizzle.config.js` ne
  décrit que `src/db/schema.ts`, qui reste dans `public`.
- La base n'est joignable que dans le réseau Docker du site ; son port est
  publié sur `127.0.0.1:5433` pour l'import, en `verify-full` contre la CA
  du site (le certificat couvre `localhost`) — `pg_hba.conf` impose TLS.
- `/dev/shm` du conteneur passe à 128 Mo (`shm_size`, exemple Compose de
  hub.docker.com/_/postgres) : les 64 Mo par défaut de Docker font échouer la
  construction parallèle des index (« could not resize shared memory
  segment »).
- **Sauvegarde** : `backup-db.sh` exclut le schéma (`pg_dump
  --exclude-schema=musilogy`, postgresql.org/docs/16/app-pgdump.html) : il
  se recharge depuis `data/out/`. Ce qui ne se recharge pas, c'est
  `data/raw/`, seule copie du dump de référence.

### Les règles restent dans musilogy

Les contemporains deviennent une fonction Postgres,
`musilogy.contemporaries(mbid, page_size, page_offset)`, écrite dans
`src/musilogy/pg/` et installée par `musilogy load` ; ses tests tournent
contre un vrai Postgres (service de la CI). La macro DuckDB et la commande
`musilogy artist`, qui servaient à juger les listes avant qu'un front les
lise, sont retirées : une règle, une implémentation. Avant leur retrait, les
deux implémentations ont rendu les mêmes 167 104 lignes sur 300 artistes
tirés par `hash(mbid)`.

Elle classe dans `scenes`, projection étroite des 285 284 artistes qui ont
une année et un genre, et ne lit les noms et genres partagés que pour la
page demandée : 5 à 30 ms pour un artiste courant, 180 ms pour le pire cas
mesuré (un artiste américain sans lieu de début, 22 152 contemporains),
contre 1,7 s en lisant `artists`.

### API et front

- Backend : trois routes en lecture, validées à la frontière, qui n'appellent
  que les fonctions de `src/musilogy/pg/90_*.sql` — vue d'ensemble
  (`frieze_genres`, `frieze_density`, `frieze_activity`), fenêtre genre × période
  (`frieze_window`, paginée, les plus écoutés d'abord), artiste
  (`artist_card`, `artist_links`, `artist_lineage`, une page de
  `contemporaries`). Les étiquettes de la vue d'ensemble sont la première
  page d'une fenêtre, demandée pour les genres affichés : les embarquer toutes
  dans la vue d'ensemble, trois par couple genre × décennie (7 624 couples
  mesurés le 2026-10-03), ferait environ 1,7 Mo de JSON chargés avant le
  premier affichage, pour des genres qu'on n'ouvrira pour la plupart jamais.
  Ces fonctions sont
  le contrat entre musilogy et le site ; le CI du site n'a pas de Postgres,
  le leur si.
- Front : dans `site/`, sur la charte v5
  (`site/apps/frontend/src/design/tokens.css`), en français et en anglais
  comme le reste du site. Rendu : deck.gl (dépôt `visgl/deck.gl`, v9.4.0 du
  2026-09-05, non archivé, vérifié le 2026-10-03). `OrthographicView`
  accepte `zoomX`/`zoomY` et un contrôleur `zoomAxis: 'X'` : zoom sur le
  temps seul (`docs/api-reference/core/orthographic-view.md`,
  `docs/upgrade-guide.md` § v9.3). duckdb-wasm est écarté : dernière release
  le 2025-12-16, au-delà de six mois.
- **Prototype non listé** : une route hors navigation, en `noindex`, jusqu'à
  ce que les seuils de zoom soient mesurés.
- La page porte l'attribution de MusicBrainz et de ListenBrainz.

## Licence

`artists` et `genres` dépendent des genres MusicBrainz (CC-BY-NC-SA 3.0),
donc les contemporains et la frise aussi. ListenBrainz, Discogs, Wikidata et
le cœur MusicBrainz sont CC0 ; Wikipédia CC BY-SA. L'affichage dans
AubeSonore porte l'attribution et suppose un usage non commercial.

## Séquence

1. **Couche 0, tables de filiation** : `lineage`, contemporains,
   `disambiguation` et `name_key`. Fait (PR #228).
2. **Popularité** : relevé ListenBrainz, table `popularity`. Fait (PR #246).
3. **Prototype de frise** : `musilogy load` et la fonction des
   contemporains, puis l'API du site, puis la frise. Les seuils de zoom se
   mesurent ici, et les trois listes se jugent sur des artistes connus avant
   que la route soit liée.
4. **Relations URL et Discogs** : extraction des liens externes, genres
   Discogs, gain mesuré en groupes ajoutés à la frise.
5. **Graphe des genres** depuis le dump PostgreSQL.
6. **Wikidata P737**, puis **Wikipédia**.

Hors périmètre : la recherche par alias.
