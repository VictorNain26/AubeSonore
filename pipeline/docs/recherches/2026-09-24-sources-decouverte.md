# Sources pour l'étape « découverte » webradio — recherche sourcée

Date : 2026-09-24
Méthode : lecture doc officielle + sondage réel via `curl` (quelques requêtes, quotas respectés). Artistes de test : IDLES (MBID `be465d4f-c28d-4ba1-94ab-ebaada7db8af`, trouvé via MusicBrainz) et Sylvan Esso (MBID `c4593b34-2a94-4e44-ae10-4a0f4c0b4da8`).

Contraintes respectées : aucune lecture/référence à `/media/musique`, aucune écriture hors de ce fichier, clé Last.fm jamais affichée (lue depuis `.env`, injectée en variable shell, résultats grep/sed pour la masquer).

---

## 1. ListenBrainz « similar artists »

### 1.a Endpoint labs (`labs.api.listenbrainz.org`)

- Doc consultée : pas de documentation officielle trouvée pour ce endpoint précis (absent de `listenbrainz.readthedocs.io` — voir 1.b). C'est un service « labs » expérimental, documenté seulement par son comportement (erreurs 400 explicites).
- Requête sondée :
  `GET https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=be465d4f-c28d-4ba1-94ab-ebaada7db8af&algorithm=<algo>`
- L'endpoint **existe toujours** et répond **sans authentification**.
- Le paramètre `algorithm` est une énumération stricte ; une valeur invalide renvoie 400 avec la liste exacte des valeurs permises :
  - `session_based_days_1825_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30`
  - `session_based_days_7500_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30`
  - `session_based_days_9000_session_300_contribution_5_threshold_15_limit_50_skip_30`
  - `session_based_days_75_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30`
  - `session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30`
  - `session_based_days_1800_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30`
  - Aucune indication explicite d'un algorithme « recommandé/par défaut » dans la réponse d'erreur ; les valeurs les plus citées dans l'écosystème ListenBrainz (troi, BookBrainz labs) utilisent la fenêtre `days_7500` avec `filter_True`. J'ai testé `session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30`, qui fonctionne et donne des résultats cohérents.
- Extrait de réponse (IDLES, tronqué) :
  ```json
  [{"artist_mbid":"fdac609a-63d0-49b9-823a-daec52a0db97","name":"Jehnny Beth","comment":"","type":"Person","gender":"Female","score":830,"reference_mbid":"be465d4f-c28d-4ba1-94ab-ebaada7db8af"},
   {"artist_mbid":"b10806de-2198-4313-af6a-13df4acb912f","name":"Jamie Cullum","comment":"pianist, jazz‐pop artist","score":824,...},
   {"artist_mbid":"e01755e3-58ab-4a5b-a9e9-a0a3bd3dff4c","name":"Parquet Courts","score":816,...},
   {"artist_mbid":"3294b9ce-0bef-4080-8ae8-95bad1abd71c","name":"shame","score":691,...}, ...]
  ```
  Champ `score` : entier non borné (830, 824, 816…), pas un ratio 0-1. Pas de pagination visible, `limit` fait partie du nom de l'algorithme (ex. `limit_100`).
- **Conclusion : utilisable.** Endpoint fonctionnel, sans jeton, réponse propre avec MBID + score. Point faible : pas de doc officielle stable, le nom d'algorithme est un paramètre « magique » non documenté publiquement — à figer en dur dans le code et surveiller si l'énumération change (l'erreur 400 sert de garde-fou naturel).

### 1.b Équivalent sur `api.listenbrainz.org`

- Doc consultée : `https://listenbrainz.readthedocs.io/en/latest/users/api/index.html` (sommaire des pages `core.html`, `misc.html`, `recommendation.html`, `social.html`).
- Pas de endpoint « similar-artists » officiel. Deux endpoints proches existent :
  - `GET /1/user/(mb_username)/similar-users` (core.html) — similarité entre **utilisateurs**, pas entre artistes. Hors sujet.
  - `GET /1/explore/lb-radio` (misc.html) — génère une **playlist** (JSPF) à partir d'un prompt du type `artist:(<mbid>)`, modes `easy`/`medium`/`hard`. Ce n'est pas une liste d'artistes similaires mais un mélange de pistes ; utilisable indirectement mais pas adapté au besoin (on veut la liste d'artistes, pas une playlist déjà mixée).
- Requête sondée :
  `GET https://api.listenbrainz.org/1/explore/lb-radio?prompt=artist:(be465d4f-c28d-4ba1-94ab-ebaada7db8af)&mode=easy`
- Réponse : `401 {"code":401,"error":"Due to bad actors and AI scrapers causing undue traffic on our sites, you need to provide an Auth token for this endpoint. Sorry for this mess."}`
- **Conclusion : `api.listenbrainz.org` nécessite désormais un jeton d'authentification** (changement récent, mentionné explicitement dans le message d'erreur — anti-scraping). Le endpoint `/1/explore/lb-radio` n'est de toute façon pas le bon outil (playlist, pas liste d'artistes).
- **Verdict global ListenBrainz : utiliser le endpoint labs (1.a), sans jeton — c'est la seule voie « similar artists » directe et gratuite.**

---

## 2. MusicBrainz — résolution nom → MBID

- Doc consultée : `https://musicbrainz.org/doc/MusicBrainz_API` (recherche `/ws/2/artist?query=`), règles de rate-limit et User-Agent bien connues du projet (1 req/s, `User-Agent` obligatoire sous peine de blocage IP).
- Requêtes sondées (délai de 1,2 s entre les deux, `User-Agent` custom avec contact) :
  - `GET https://musicbrainz.org/ws/2/artist/?query=artist:Idles&fmt=json&limit=5`
  - `GET https://musicbrainz.org/ws/2/artist/?query=artist:%22Sylvan%20Esso%22&fmt=json&limit=3`
- Résultats :
  - IDLES → `score:100`, MBID `be465d4f-c28d-4ba1-94ab-ebaada7db8af`, pays GB, tags `post-punk`/`art rock`. 4 homonymes proches (`Vital Idles`, `Bluegrass Idles`, `The Idles` NZ/CA) avec score 75-77 — la recherche par nom seul est ambiguë, le score MusicBrainz (100 vs 75) permet de trancher automatiquement.
  - Sylvan Esso → un seul résultat, `score:100`, MBID `c4593b34-2a94-4e44-ae10-4a0f4c0b4da8`.
- **Conclusion : utilisable.** Fonctionne bien, score de confiance exploitable pour désambiguïser en automatique (seuil du genre « score ≥ 90 sinon rejet/vérif manuelle »). Respecter impérativement le 1 req/s et un `User-Agent` identifiant l'app + contact, sous peine de ban IP (politique MusicBrainz documentée).

---

## 3. Last.fm `artist.getSimilar`

- Doc consultée : `https://www.last.fm/api/show/artist.getSimilar`.
- Paramètres : `artist` (nom, requis sauf si `mbid` fourni), `mbid` (optionnel), `autocorrect` (0/1, corrige les fautes de frappe), `limit` (optionnel), `api_key` (requis), `format=json`.
- Champ `match` : valeur de similarité entre 0 (pas similaire) et 1 (très similaire) — c'est un flottant, pas un pourcentage entier.
- Requête sondée (clé lue depuis `.env`, jamais affichée) :
  `GET https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=Idles&mbid=be465d4f-c28d-4ba1-94ab-ebaada7db8af&autocorrect=1&api_key=***&format=json`
- Extrait de réponse (tronqué, clé masquée en amont) :
  ```json
  {"similarartists":{"artist":[
    {"name":"Soft Play","match":"1", ...},                      // pas de champ mbid ici
    {"name":"Viagra Boys","mbid":"9df0c0ec-619e-447d-a155-23e19d9c84ce","match":"0.992713", ...},
    {"name":"HEAVY LUNGS","match":"0.963834", ...},              // pas de mbid non plus
    {"name":"Fontaines D.C.","mbid":"fd87acc7-e0a0-4a45-bc2a-d2ab5c10be68","match":"0.796448", ...}
  ]}}
  ```
  → **le champ `mbid` est présent seulement quand Last.fm a fait la correspondance vers MusicBrainz** ; il manque pour certains artistes (ex. « Soft Play », ex-nom de scène « Slaves », probablement un souci de resynchronisation du nom côté Last.fm ; « HEAVY LUNGS » aussi sans mbid). Il faut prévoir un fallback (recherche MusicBrainz par nom) pour les entrées sans `mbid`.
- Limites d'usage publiées : la doc/ToS Last.fm (`https://www.last.fm/api/tos`) ne donne **aucun chiffre précis** (pas de req/s ni de quota journalier publié) ; elle indique seulement que Last.fm applique des limites « à sa discrétion » pour prévenir les abus, et un plafond de stockage de données de 100 Mo. En pratique, la limite communément admise dans l'écosystème (non garantie officiellement) est de l'ordre de 5 req/s par clé — à traiter avec un throttling prudent côté pipeline (ex. 1 req/s) faute de chiffre officiel ferme.
- **Conclusion : utilisable**, avec 2 réserves : (a) `mbid` absent sur une partie non négligeable des résultats (2/4 dans cet échantillon), prévoir un enrichissement MusicBrainz de repli ; (b) pas de quota chiffré officiel, throttler par prudence.

---

## 4. Deezer

### 4.a `/search/artist?q=`

- Requêtes sondées : `q=Idles` et `q=Sylvan Esso`.
- IDLES : le 1er résultat (`id:74149572`, `name:"Idles"`, `nb_fan:17`) **n'est pas le bon artiste** (mini-profil quasi vide) ; le vrai groupe (`id:482539`, `name:"IDLES"`, `nb_album:40`, `nb_fan:83695`) arrive en 2e position. → **`/search/artist` ne trie pas fiablement par pertinence/popularité**, il faut choisir le résultat avec le plus grand `nb_fan` plutôt que le premier de la liste, ou croiser avec le MBID via un autre moyen (Deezer n'expose pas de MBID nativement).
- Sylvan Esso : 1er résultat correct directement (`id:4888025`, `nb_fan:22490`).

### 4.b `/artist/{id}/related`

- Requête sondée : `GET https://api.deezer.com/artist/482539/related` (IDLES, bon id).
- **Endpoint toujours actif** (pas déprécié). Réponse : `{"data":[...], "total":20}` — exactement 20 artistes retournés, champ `total:20` confirmé, pas de pagination `next` proposée pour ce endpoint dans cet échantillon.
- Champ `nb_fan` bien présent sur chaque artiste (ex. Viagra Boys `nb_fan:40939`, shame `nb_fan:18251`), utilisable comme signal de popularité complémentaire au score de similarité (Deezer ne donne pas de score de similarité explicite, juste une liste ordonnée).
- **Conclusion : utilisable**, avec le nb_fan comme seul signal quantitatif annexe (pas de `match`/`score` comme Last.fm ou ListenBrainz).

### 4.c `/artist/{id}/top?limit=`

- Requête sondée : `GET https://api.deezer.com/artist/482539/top?limit=5`.
- Fonctionne, retourne les pistes avec un champ `preview` = URL MP3 de l'extrait 30 s (confirmé, format `https://cdnt-preview.dzcdn.net/api/.../<hash>.mp3?hdnea=...`, avec expiration signée dans l'URL — donc **à consommer à la volée, ne pas stocker l'URL telle quelle** au-delà de sa durée de validité, l'`exp=` dans le token `hdnea` l'atteste).
- Attention : le 1er morceau retourné pour IDLES est une feature (« The God of Lying (feat. IDLES) » par Gorillaz) et pas un titre où IDLES est artiste principal — cohérent avec le comportement connu de `top` (inclut les featurings), à filtrer si on veut uniquement les morceaux « headliner ».

### 4.d Quota Deezer

- Doc officielle consultée : `https://developers.deezer.com/api`, `https://developers.deezer.com/guidelines`, `https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers`.
- Le portail développeur est une SPA JS, illisible par simple fetch HTML (redirection 302, contenu vide côté serveur) — impossible de citer un chiffre officiel exact issu de ces pages directement.
- La FAQ officielle confirme l'existence d'un **« query quota »** (« no limitation on data in the API, but there is a query quota »), sans donner le chiffre sur cette page.
- Le chiffre largement cité dans l'écosystème (SDK tiers, articles) est **50 requêtes / 5 secondes par IP** — cohérent et non contredit par la doc officielle consultée, mais **non vérifié directement sur une page officielle accessible en lecture simple** (limite outillage, pas contradiction constatée). À traiter comme une valeur de prudence raisonnable, pas comme un chiffre garanti contractuellement.
- **Conclusion : utilisable**, aucun endpoint sondé n'est déprécié (`related`, `top`, `search/artist` tous actifs et fonctionnels sans clé/auth).

---

## 5. Last.fm `artist.getTopTags`

- Doc : format documenté sur `last.fm/api` (même famille que `getSimilar`), paramètres `artist`/`mbid`/`autocorrect`/`api_key`/`format`.
- Requête sondée :
  `GET https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=Sylvan%20Esso&mbid=c4593b34-2a94-4e44-ae10-4a0f4c0b4da8&autocorrect=1&api_key=***&format=json`
- Réponse complète (aucun secret dedans) :
  ```json
  {"toptags":{"tag":[
    {"count":100,"name":"electronic"},
    {"count":91,"name":"electropop"},
    {"count":41,"name":"synthpop"},
    {"count":32,"name":"indie"},
    {"count":16,"name":"indietronica"},
    {"count":16,"name":"female vocalists"},
    {"count":14,"name":"pop"},
    {"count":3,"name":"indie pop"},
    {"count":3,"name":"american"},
    {"count":1,"name":"minimal pop"}
  ],"@attr":{"artist":"Sylvan Esso"}}}
  ```
- `count` : bien un entier 0-100 (confirmé, max observé = 100 pour le tag dominant, décroissant ensuite), c'est un poids relatif normalisé par Last.fm, pas un nombre brut de votes.
- **Conclusion : utilisable.** Aucune limite/quota différente de `getSimilar` (même API, mêmes réserves du point 3 sur l'absence de chiffre officiel précis).

---

## Récapitulatif

| Source | Endpoint | État | Verdict |
|---|---|---|---|
| ListenBrainz labs | `labs.api.listenbrainz.org/similar-artists/json` | actif, sans jeton | **Utilisable** — algorithme à figer en dur (liste fermée) |
| ListenBrainz officiel | `/1/explore/lb-radio` | actif mais **jeton désormais obligatoire** (401 anti-scraping) | Non retenu (jeton requis + granularité playlist, pas artiste) |
| ListenBrainz officiel | `/1/user/.../similar-users` | existe | Hors sujet (similarité utilisateurs) |
| MusicBrainz | `/ws/2/artist?query=` | actif | **Utilisable** — respecter 1 req/s + User-Agent |
| Last.fm | `artist.getSimilar` | actif | **Utilisable** — `mbid` absent sur ~50 % des résultats testés, prévoir fallback |
| Last.fm | `artist.getTopTags` | actif | **Utilisable** |
| Deezer | `/search/artist?q=` | actif | Utilisable mais **1er résultat pas toujours le bon** → trier par `nb_fan` |
| Deezer | `/artist/{id}/related` | actif, non déprécié | **Utilisable** — 20 résultats, `nb_fan` dispo, pas de score de similarité |
| Deezer | `/artist/{id}/top?limit=` | actif | **Utilisable** — `preview` = extrait 30 s signé/expirant, inclut les featurings |

Rien de mort parmi les 9 endpoints sondés. Le seul changement notable vs. attentes : `api.listenbrainz.org` exige maintenant un jeton d'auth (mesure anti-scraping annoncée dans le message d'erreur lui-même), ce qui écarte `/1/explore/lb-radio` comme option « sans jeton » — seul le service labs reste ouvert pour la similarité d'artistes.
