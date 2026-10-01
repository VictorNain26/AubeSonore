# Frise et filiation — conception

Conception du 2026-10-02. Elle garde les tables de la spec du 2026-10-01
(`2026-10-01-artist-lineage-design.md` : inspirations, descendance,
contemporains) et en change l'entrée : **la frise redevient la vue
principale, et la filiation se dessine dessus**. Elle remplace la séquence et
le périmètre de la spec du 2026-10-01, qui excluait la frise.

Les chiffres sont **descriptifs**, mesurés le 2026-10-01 sur le dump
`20260909-001002` et sur les sources citées ; le contrat exécutable reste
`tests/test_baseline.py`.

## Intention

Naviguer sur une frise pour découvrir : voir d'abord les artistes marquants
d'une période, puis, en zoomant, les moins connus ; survoler un artiste pour
voir ses liens, cliquer pour se recentrer sur un autre. Le temps donne son
sens à la filiation : les inspirations sont avant, la descendance après, les
contemporains dans la même colonne.

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
   donne les trois listes de la spec du 2026-10-01 avec leur provenance.

## Données : ce qu'on a, ce qui manque

Mesuré sur le dump de référence (groupes, sauf mention) :

| besoin | état | complément |
|---|---|---|
| placer un groupe (date + genre) | 175 403 sur 659 642 | — |
| groupes datés sans genre | 197 423, absents de la frise | tags MusicBrainz : 2,8 % en ont ; **lien Discogs : 37,6 %** |
| popularité | ListenBrainz couvre 85 à 100 % des groupes de la frise par décennie, 1950–2020 | Wikidata écarté : fiche pour 5 à 68 %, médiane 1 à 3 sitelinks |
| structure des genres | relations `subgenre`, `influenced by`, `fusion of` dans MusicBrainz | absentes des dumps JSON et de `ws/2` (`inc=genre-rels` ne renvoie rien) : dump PostgreSQL |
| filiation | sources de la spec du 2026-10-01 ; Wikidata ne relie qu'une minorité d'artistes récents | phase Wikipédia |
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
- La valeur bouge chaque jour : `fetch` en prend un **relevé daté**, avec
  empreinte, comme un dump. Table `popularity(mbid, listen_count,
  user_count, snapshot)`. Les limites de débit se lisent dans les en-têtes à
  l'implémentation.

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

## Front

- Dans `site/` d'AubeSonore, sur la charte v5
  (`site/apps/frontend/src/design/tokens.css`), en anglais comme le reste du
  site. Le site lit les tables de musilogy **importées dans sa base** ; il
  n'appelle jamais musilogy à l'exécution.
- Rendu : deck.gl (dépôt `visgl/deck.gl`, v9.4.0 du 2026-09-05, non archivé).
  `OrthographicView` accepte `zoomX`/`zoomY` et un contrôleur
  `zoomAxis: 'X'` : zoom sur le temps seul
  (`docs/api-reference/core/orthographic-view.md`, `docs/upgrade-guide.md`
  § v9.3).
- duckdb-wasm est écarté : dernière release le 2025-12-16, au-delà de six
  mois.

## Licence

Inchangée : le jeu reste CC-BY-NC-SA 3.0 par les genres MusicBrainz.
ListenBrainz, Discogs et le cœur MusicBrainz sont CC0 et n'ajoutent aucune
contrainte. L'affichage dans AubeSonore suppose un usage non commercial.

## Séquence

1. **Couche 0, tables de filiation** (spec du 2026-10-01) : `lineage`,
   contemporains, commande `musilogy artist`. `disambiguation` et `name_key`
   sont livrés (musilogy #19).
2. **Popularité** : relevé ListenBrainz dans `fetch`, table `popularity`.
3. **Prototype de frise** dans `site/`, sur les tables existantes : la PR
   AubeSonore #191 (page artiste) est d'abord portée sous `site/apps/`. Les
   seuils de zoom se mesurent ici.
4. **Relations URL et Discogs** : extraction des liens externes, genres
   Discogs, gain mesuré en groupes ajoutés à la frise.
5. **Graphe des genres** depuis le dump PostgreSQL.
6. **Wikidata P737**, puis **Wikipédia** (phases de la spec du 2026-10-01).
