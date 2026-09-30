# Styles à exclure (hard/métal, hard techno, soupe commerciale) avec les têtes Essentia

Recherche du 2026-09-24. Elle prolonge `2026-09-23-essentia-effnet.md` (appelée ci-dessous **[R0]**), qu'elle ne
refait pas. Règle suivie : chaque affirmation renvoie à une source (URL officielle, papier avec section, ou
`fichier:ligne`) ou à une mesure maison notée **[MES]**. Ce qui n'est écrit nulle part est marqué **non documenté**.

Rappel de la demande de Victor : toute la bibliothèque Plex est « AubeSonore » ; ce qu'il ne veut pas, c'est « la
soupe commerciale, le hard/métal et ses équivalents, la hard techno et ses équivalents ».

## 0. Sources et conditions

### Sources (consultées le 2026-09-24)

| Réf. | Source |
|---|---|
| [MODELS] | https://essentia.upf.edu/models.html (sections « Genre Discogs400 », « MTG-Jamendo genre », « Approachability », « Engagement », « Mood Aggressive », « Mood Party ») |
| [J-400] | `models/genre_discogs400-discogs-effnet-1.json` ; identique octet pour octet (`cmp`) à https://essentia.upf.edu/models/classification-heads/genre_discogs400/genre_discogs400-discogs-effnet-1.json |
| [J-HEAD] | `.json` officiels des autres têtes, sous https://essentia.upf.edu/models/classification-heads/ : `approachability/approachability_{2c,3c,regression}-discogs-effnet-1.json`, `engagement/engagement_{2c,3c,regression}-discogs-effnet-1.json`, `mood_aggressive/…`, `mood_party/…`, `danceability/…`, `mtg_jamendo_genre/…`, `mtg_jamendo_moodtheme/…`, `mtg_jamendo_top50tags/…`, `mtt/…`, `genre_electronic/…`, `genre_tzanetakis/…`, `genre_dortmund/…`, `genre_rosamerica/…` (tous `-discogs-effnet-1.json`) |
| [LISTING] | listings des dossiers `classification-heads/` et de ses sous-dossiers |
| [CHANGELOG] | https://essentia.upf.edu/models/CHANGELOG.md |
| [DEMO-AE] | MTG/essentia-replicate-demos, commit `7575461` (2025-02-17), dossier `music-approachability-engagement/` : `README.md`, `models.py`, `cog.yaml`, `predict.py` ; page https://replicate.com/mtg/music-approachability-engagement |
| [#1329] | https://github.com/MTG/essentia/issues/1329, réponses du mainteneur palonso (commentaires cités par leur ancre) |
| [P22] | Alonso-Jiménez, Serra, Bogdanov, *Music Representation Learning Based on Editorial Metadata from Discogs*, ISMIR 2022, https://archives.ismir.net/ismir2022/paper/000099.pdf |
| [JAM] | README du MTG-Jamendo Dataset, https://github.com/MTG/mtg-jamendo-dataset |
| [TORCH] | définition de `MultiLabelSoftMarginLoss`, `torch/nn/modules/loss.py` (branche `main` de pytorch/pytorch) |

Non consultés, faute d'accès : le papier Laurier et al. 2009 (*Music mood annotator design and integration*, cité
dans les `.json` de `mood_aggressive` et `mood_party`) : le lien MTG renvoie une page HTML, ResearchGate répond 403,
Springer exige une authentification. **Aucune publication** décrivant les têtes approachability / engagement n'a été
trouvée (voir §2.1).

### Conditions de mesure [MES]

- Machine : i5-6300U (cf. [R0 §0]). Cette fois **sans** entraînement concurrent : load average ≈ 1,0 au lancement
  (`uptime`, 09 h 34).
- Commande : `TF_NUM_INTRAOP_THREADS=1 TF_NUM_INTEROP_THREADS=1 nice -n 19 uv run python measure.py`, depuis
  `/home/victormoi/radio/pipeline-refonte`.
- Chaîne : l'API du projet, `radio.analyze.embedders.EffnetEmbedder` (`_load()` puis `_frames()`,
  `radio/analyze/embedders.py:132-154`) : graphe bs64, `PartitionedCall:1`, 16 kHz, `resampleQuality=4`,
  **`patchHopSize=128`** (réglage actuel du projet, `embedders.py:124`), un seul `MonoLoader`. Puis chaque tête
  `TensorflowPredict2D` sur la **matrice par patch**, et moyenne temporelle par classe (usage officiel, [R0 §3.2]).
  Genre : `input="serving_default_model_Placeholder"`, `output="PartitionedCall:0"` [MODELS].
- Échantillon : 40 titres, **un par artiste**, tirés au hasard (graine 20260924) parmi les 2 755 lignes
  `model='effnet-bs64-hop128'` de `data/radio.db`, table `embeddings`, dont `item` commence par
  `/media/plex/Musique/` (701 artistes). Base ouverte en lecture seule (`mode=ro`). Aucun fichier hors de ce dossier.
- Têtes absentes de `models/` (approachability, engagement régression, mood_party, mtg_jamendo_genre,
  mtg_jamendo_moodtheme) : `.pb` et `.json` officiels téléchargés dans le scratchpad, taille égale au
  `Content-Length` du serveur. Rien n'a été écrit dans `models/` ni dans le code.
- Fichiers : `/tmp/claude-1000/-home-victormoi/18004597-ebc8-44ca-bff2-5d887c340194/scratchpad/neg/`
  (`sample.txt`, `sets.json`, `measure.py`, `analyze.py`, `results.json`, `measure.log`, `measure.err`).
- Durée : 283 s mur pour 40 titres ; 271 s CPU d'embedding au total (médiane 6,1 s, max 12,4 s par titre) ; têtes :
  0,07 à 0,13 s CPU par titre pour les sept têtes réunies. 0 ligne « No network created » dans `measure.err`.

---

## 1. Taxonomie Discogs400 : les classes des trois catégories

### 1.1 Ce qu'est la sortie

- 400 styles, nommés `Genre---Style` dans `classes` de [J-400] ; la liste de [MODELS] (section « Genre Discogs400 »)
  est la même, groupée par genre. Le `.json` local et l'officiel sont identiques [J-400].
- Il n'existe **pas** de classe « mainstream », « commercial » ou « populaire » dans Discogs400 : ce sont des
  styles éditoriaux Discogs. [P22 §4.2] précise que ces styles « usually go beyond purely stylistic descriptions and
  encode cultural, temporal, or geographical information ». La catégorie « soupe commerciale » ne peut donc être
  approchée que par des **styles qui lui sont associés**, pas mesurée directement.
- Styles absents de Discogs400 alors qu'on pourrait les attendre : **Industrial Techno**, **Frenchcore**, **Uptempo**,
  **Hardcore punk** (sous ce nom : c'est `Rock---Hardcore`), **French House** (il n'y a ni « French House » ni
  « Filter House ») [J-400].

### 1.2 Hard / métal et équivalents

Noms copiés tels quels depuis [J-400]. « Sûres » = le nom désigne sans ambiguïté la famille exclue ; « ambiguës » =
la classe recouvre aussi des choses que la bibliothèque contient ou pourrait contenir.

**Sûres (31)** — `Rock---Atmospheric Black Metal`, `Rock---Black Metal`, `Rock---Death Metal`, `Rock---Deathcore`,
`Rock---Depressive Black Metal`, `Rock---Doom Metal`, `Rock---Folk Metal`, `Rock---Funeral Doom Metal`,
`Rock---Funk Metal`, `Rock---Goregrind`, `Rock---Gothic Metal`, `Rock---Grindcore`, `Rock---Hard Rock`,
`Rock---Hardcore`, `Rock---Heavy Metal`, `Rock---Melodic Death Metal`, `Rock---Melodic Hardcore`, `Rock---Metalcore`,
`Rock---Noisecore`, `Rock---Nu Metal`, `Rock---Pornogrind`, `Rock---Post-Metal`, `Rock---Power Metal`,
`Rock---Power Violence`, `Rock---Progressive Metal`, `Rock---Sludge Metal`, `Rock---Speed Metal`,
`Rock---Technical Death Metal`, `Rock---Thrash`, `Rock---Viking Metal`, `Rock---Crust`.

Remarque sur `Rock---Hard Rock` : classé « sûr » parce que Victor écrit « le hard » ; mais il couvre aussi du rock
des années 70 que la bibliothèque (60s, rock) peut contenir. Mesuré : c'est la classe métal la plus haute sur 7 titres aimés sur 40, mais toujours ≤ 0,014 (§3) [MES].

**Ambiguës (11)** — `Rock---Stoner Rock`, `Rock---Post-Hardcore`, `Rock---Punk`, `Rock---Oi`, `Rock---Grunge`,
`Rock---Noise`, `Rock---Industrial`, `Rock---Emo`, `Rock---Pop Punk`, `Hip Hop---Hardcore Hip-Hop`,
`Hip Hop---Horrorcore`. Raisons : le post-punk et l'indie qu'aime Victor voisinent avec `Punk`, `Noise`,
`Industrial`, `Post-Hardcore` ; « Hardcore Hip-Hop » est un style de rap, pas de métal.

### 1.3 Hard techno et équivalents

**Sûres (11)** — `Electronic---Hard Techno`, `Electronic---Schranz`, `Electronic---Gabber`, `Electronic---Hardstyle`,
`Electronic---Hardcore`, `Electronic---Happy Hardcore`, `Electronic---Speedcore`, `Electronic---Jumpstyle`,
`Electronic---Makina`, `Electronic---Hard Trance`, `Electronic---Hard House`.

**Ambiguës (8)** — `Electronic---Techno` (la techno au sens large, que la bibliothèque électro peut contenir),
`Electronic---Industrial`, `Electronic---EBM` (voisins directs de la new wave / coldwave), `Electronic---Breakcore`,
`Electronic---Rhythmic Noise`, `Electronic---Power Electronics`, `Electronic---Noise`, `Electronic---Donk`.

Attention aux homonymes : `Electronic---Hardcore` (hardcore techno) ≠ `Rock---Hardcore` (hardcore punk) ;
`Electronic---Industrial` ≠ `Rock---Industrial` ; `Electronic---Noise` ≠ `Rock---Noise` [J-400]. Toujours
manipuler le nom complet `Genre---Style`.

### 1.4 Pop commerciale / mainstream

Rappel : aucune classe ne signifie « commercial » (§1.1). Liste de styles associés à la variété dansante ou
radiophonique de masse.

**Sûres (14)** — `Electronic---Dance-pop`, `Pop---Europop`, `Electronic---Eurodance`, `Electronic---Euro House`,
`Electronic---Hands Up`, `Electronic---Italodance`, `Electronic---Eurobeat`, `Electronic---Disco Polo`,
`Pop---Schlager`, `Pop---Bubblegum`, `Hip Hop---Pop Rap`, `Electronic---Tropical House`, `Latin---Reggaeton`,
`Pop---K-pop`.

**Ambiguës (18)** — `Pop---J-pop`, `Rock---Pop Rock`, `Rock---Arena Rock`, `Rock---AOR`, `Rock---Soft Rock`,
`Pop---Ballad`, `Pop---Vocal`, `Funk / Soul---Contemporary R&B`, `Hip Hop---RnB/Swing`, `Hip Hop---Trap`,
`Electronic---Electro House`, `Electronic---Progressive House`, `Reggae---Reggae-Pop`, `Electronic---Hi NRG`,
`Electronic---Euro-Disco`, `Electronic---Italo-Disco`, `Jazz---Smooth Jazz`, `Jazz---Easy Listening`.

### 1.5 Classes à ne jamais compter comme négatives (goûts déclarés de Victor)

Classes qui portent directement des goûts cités : `Electronic---Synth-pop`, `Rock---New Wave` et
`Electronic---New Wave`, `Rock---Post-Punk`, `Rock---Coldwave`, `Electronic---Darkwave`, `Rock---Dream Pop`,
`Rock---Shoegaze`, `Rock---Indie Rock`, `Pop---Indie Pop`, `Pop---Chanson`, `Rock---Yé-Yé`, `Funk / Soul---Soul`,
`Classical---Impressionist`, `Electronic---House`, `Electronic---Disco`, `Electronic---Nu-Disco`,
`Electronic---Electro` [J-400]. Les voisines `Italo-Disco`, `Euro-Disco`, `Hi NRG` (synthpop des années 80) et
`Electro House` (French touch des années 2000) sont pour cette raison rangées en « ambiguës » et non en « sûres ».

Le fichier des listes utilisées pour la mesure est
`/tmp/claude-1000/-home-victormoi/18004597-ebc8-44ca-bff2-5d887c340194/scratchpad/neg/sets.json` ; chaque nom y a été
vérifié contre `classes` de [J-400] (0 absent, 0 doublon) [MES].

---

## 2. Têtes « approachability », « engagement » et autres têtes officielles

### 2.1 Approachability et engagement

**Définitions officielles** [MODELS], mot pour mot :

- *Approachability* : « Music approachability predicts whether the music is likely to be accessible to the general
  public (e.g., belonging to common mainstream music genres vs. niche and experimental genres). »
- *Engagement* : « Music engagement predicts whether the music evokes active attention of the listener
  (high-engagement "lean forward" active listening vs. low-engagement "lean back" background listening). »

**Sorties et classes** [J-HEAD] :

| Tête | Sortie | Classes (ordre du `.json`) | Données (champ `dataset`) | Métrique publiée |
|---|---|---|---|---|
| `approachability_2c` | `model/Softmax` | `not approachable`, `approachable` | « in-house dataset », 21 042 | test normalized accuracy 0,93 |
| `approachability_3c` | `model/Softmax` | `not approachable`, `moderately approachable`, `approachable` | « in-house dataset », 24 598 | « NA » |
| `approachability_regression` | `model/Identity` (Linear) | `approachability` | « in-house dataset », 24 598 | Pearson 0,85 |
| `engagement_2c` | `model/Softmax` | `not engaging`, `engaging` | « in-house dataset », 20 215 | test normalized accuracy 0,74 |
| `engagement_3c` | `model/Softmax` | `not engaging`, `moderately engaging`, `engaging` | « in-house dataset », 22 211 | test normalized accuracy 0,65 |
| `engagement_regression` | `model/Identity` (Linear) | `engagement` | « in-house dataset », 22 211 | Pearson 0,73 |

Toutes publiées le 2022-06-16 [J-HEAD] ; ajoutées au dépôt à l'entrée « Add `classification-head` models:
approachability and engagement detectors… » de [CHANGELOG].

**Ce qui est documenté en plus** :

- [DEMO-AE] `README.md` : « two classes: low, and high […] three classes: low, mid, and high […] regression:
  continuous values of approachability and engagement from 0 (low) to 1 (high) » ; « These classifiers were trained
  on in-house MTG datasets » ; « Our models consist of single-hidden-layer MLPs trained on the considered
  embeddings ».
- [#1329] (palonso, 2023-05-22, ancre `issuecomment-1557425939`) : « The regression model outputs continuous values
  from 0 to 1 from low to high and performed the best in our internal evaluation. The same applies to the
  engagement model. »
- La démo agrège la régression par moyenne et écart-type sur les patches (`predict.py:164-168`) [DEMO-AE].

**Non documenté** : le jeu de données (origine des titres, genres représentés), le protocole d'annotation (qui a jugé,
selon quelle consigne), la définition opérationnelle des niveaux, le découpage test, et toute publication. Aucun
`citation` dans les six `.json` [J-HEAD] ; aucune référence dans les sections de [MODELS] (les seuls liens sont les
poids, les `.json` et la démo Replicate) ; aucun papier dans `doc/sphinxdoc/research_papers.md` de MTG/essentia.
Un site tiers (aimodels.fyi) décrit une évaluation sur « ~1 000 titres MTG-Jamendo » : **source non officielle, non
retenue**.

**Peut-on s'en servir comme indicateur « mainstream / commercial » ?** Ce que disent les auteurs, sans extrapoler :

- La définition d'*approachability* parle bien de « common mainstream music genres vs. niche and experimental
  genres » [MODELS]. C'est un axe **accessible ↔ niche/expérimental**, défini par l'exemple (« e.g. »). Elle ne dit
  rien de « commercial » au sens de Victor (produit formaté pour les radios de masse).
- *Engagement* décrit un mode d'écoute (active ↔ fond), pas une popularité [MODELS].
- Conséquence logique (non une affirmation des auteurs) : un titre indie pop mélodique et une variété de radio
  commerciale seraient tous deux « approachable » selon cette définition. La mesure du §3.4 le vérifie sur nos titres.

### 2.2 Autres têtes officielles utiles aux trois catégories (sur embeddings discogs-effnet)

| Tête | Classes utiles | Type / sortie | Données, métriques [J-HEAD] | Remarques |
|---|---|---|---|---|
| `mood_aggressive` | `aggressive` (indice 0), `not_aggressive` | multi-class, `model/Softmax` | « In-house MTG collection », 280 titres + extraits (133/147), 5-fold normalized acc. 0,98 ; cite Laurier 2009 | `.pb` déjà dans `models/` (taille = officielle) |
| `mood_party` | `party` (indice **1**), `non_party` | multi-class, `model/Softmax` | 349 titres + extraits (198/151), acc. 0,93 ; cite Laurier 2009 | « party » n'est pas « commercial » |
| `danceability` | `danceable`, `not_danceable` | `model/Softmax` | 306 titres, acc. 0,97 | aucune classe hard / commercial |
| `mtg_jamendo_genre` | `metal`, `hard`, `hardrock`, `techno`, `eurodance`, `pop`, `edm`, `club`, `dance`, `electropop` (mais aussi `synthpop`, `newwave` aimés) | **multi-label**, `model/Sigmoid` | MTG-Jamendo genre, 55 215 titres, test ROC-AUC 0,88, PR-AUC 0,20 | 87 classes ; pas de hard techno ni de gabber |
| `mtg_jamendo_moodtheme` | `commercial`, `advertising`, `corporate`, `heavy`, `energetic`, `party` | multi-label, `model/Sigmoid` | 18 486 titres, ROC-AUC 0,76, PR-AUC 0,14 | voir ci-dessous |
| `mtg_jamendo_top50tags` | `metal`, `techno`, `pop`, `dance` | multi-label, `model/Sigmoid` | champ `dataset` : « MTG Jamendo Dataset (mood and theme subset) », 18 486 titres, ROC-AUC 0,83, PR-AUC 0,30 | le nom et la taille recopient ceux de moodtheme alors que [P22 Table 2] donne 54 380 titres pour Top50 : **défaut de métadonnées probable** |
| `mtt` (MagnaTagATune) | `metal`, `techno`, `pop`, `loud` | multi-label, `model/Sigmoid` | 25 863 extraits de 30 s, ROC-AUC 0,90, PR-AUC 0,37 | |
| `genre_tzanetakis` (GTZAN) | `met`, `pop`, `dis` | multi-class, `model/Softmax` | 1 000 extraits, acc. 0,92 | 10 genres seulement, toute la bibliothèque tombe dans l'un d'eux |
| `genre_electronic` | `techno` (avec `ambient`, `dnb`, `house`, `trance`) | multi-class, `model/Softmax` | 250 extraits, acc. « NA » | pas de classe hard |
| `genre_dortmund`, `genre_rosamerica` | `pop` ; pas de métal | multi-class | 1 820 / 400 titres | peu utiles ici |

Points documentés sur ces têtes :

- **Jamendo : étiquettes des déposants.** [JAM] : « tags provided by content uploaders », sur de la musique
  Creative Commons de Jamendo. Le sens de `commercial`, `advertising`, `corporate` n'y est **pas documenté** ;
  l'exemple du README associe `commercial` et `corporate` à un titre `easylistening/downtempo/chillout`, ce qui
  évoque la musique d'illustration plutôt que la variété de masse (lecture, non affirmation des auteurs).
- **Jamendo mood/theme est bruité, selon le mainteneur** ([#1329], palonso, 2023-06-21, ancre
  `issuecomment-1600648428`) : « The mtg_jamendo_moodtheme subset is known to be especially noisy, so the predictions
  should be taken with a pinch of salt. »
- **Pas de tête discogs-effnet pour la hard techno en tant que telle** hors Discogs400 : aucune autre tête listée
  [LISTING] n'a de classe hard techno, gabber, hardstyle ou schranz (vérifié sur les `classes` des `.json` ci-dessus).
- `genre_discogs519` et les autres têtes `genre_discogs400-discogs-maest-*` existent [LISTING], mais prennent des
  embeddings **MAEST**, pas EffNet [MODELS] : hors de la chaîne actuelle.

---

## 3. Mesure sur nos données

Conditions au §0. Les 40 titres sont des titres **aimés** : tout score élevé sur une catégorie exclue est un faux
positif potentiel. Il n'y a **aucun exemple négatif** dans l'échantillon (consigne : bibliothèque seulement) ; on ne
mesure donc que le côté « faux positifs », jamais la capacité à détecter un vrai titre de métal ou de hard techno.

Agrégations calculées par titre, sur les probabilités par classe **déjà moyennées dans le temps** (sauf la dernière) :
`somme` = Σ p_i du groupe ; `max` = max p_i ; `ou` = 1 − Π(1 − p_i) ; `max/patch` = max du groupe dans chaque patch,
puis moyenne sur les patches.

### 3.1 Distribution sur 40 titres aimés [MES]

| Groupe (nb de classes) | Agrégat | min | p25 | médiane | p75 | p90 | max |
|---|---|---|---|---|---|---|---|
| métal sûr (31) | somme | 0,000 | 0,010 | 0,020 | 0,049 | 0,136 | **0,444** |
| | max | 0,000 | 0,002 | 0,004 | 0,012 | 0,021 | 0,124 |
| | ou | 0,000 | 0,010 | 0,020 | 0,048 | 0,127 | 0,366 |
| | max/patch | 0,000 | 0,002 | 0,006 | 0,015 | 0,036 | 0,141 |
| hard techno sûre (11) | somme | 0,000 | 0,002 | 0,008 | 0,014 | 0,041 | 0,158 |
| | max | 0,000 | 0,001 | 0,002 | 0,005 | 0,010 | 0,066 |
| | ou | 0,000 | 0,002 | 0,008 | 0,014 | 0,040 | 0,149 |
| | max/patch | 0,000 | 0,001 | 0,003 | 0,006 | 0,013 | 0,071 |
| commercial sûr (14) | somme | 0,002 | 0,012 | 0,035 | 0,093 | 0,172 | **0,439** |
| | max | 0,000 | 0,003 | 0,010 | 0,022 | 0,059 | 0,124 |
| | ou | 0,002 | 0,012 | 0,034 | 0,090 | 0,160 | 0,364 |
| | max/patch | 0,001 | 0,004 | 0,015 | 0,036 | 0,070 | 0,171 |
| métal ambigu (11) | somme | 0,001 | 0,009 | 0,027 | 0,084 | 0,149 | 1,095 |
| | max | 0,000 | 0,003 | 0,008 | 0,036 | 0,060 | **0,545** |
| hard techno ambiguë (8) | somme | 0,001 | 0,006 | 0,040 | 0,089 | 0,206 | 0,562 |
| | max | 0,000 | 0,003 | 0,019 | 0,052 | 0,144 | 0,319 |
| commercial ambigu (18) | somme | 0,013 | 0,060 | 0,110 | 0,182 | 0,264 | 0,458 |
| | max | 0,003 | 0,019 | 0,038 | 0,059 | 0,108 | 0,253 |

Nombre de titres aimés (sur 40) au-dessus d'un seuil [MES] :

| Groupe | somme ≥ 0,1 | somme ≥ 0,2 | somme ≥ 0,3 | max ≥ 0,1 | max ≥ 0,2 | max ≥ 0,5 |
|---|---|---|---|---|---|---|
| métal sûr | 6 | 4 | 1 | 1 | 0 | 0 |
| hard techno sûre | 2 | 0 | 0 | 0 | 0 | 0 |
| commercial sûr | 8 | 4 | 2 | 2 | 0 | 0 |
| métal ambigu | 9 | 2 | 2 | 3 | 1 | 1 |
| hard techno ambiguë | 8 | 5 | 3 | 6 | 2 | 0 |
| commercial ambigu | 22 | 10 | 4 | 5 | 2 | 0 |

### 3.2 Les titres qui ressortent [MES]

| Titre (artiste / album) | Groupe exclu le plus haut | Classe dominante du groupe | 3 classes les plus fortes (toutes classes) |
|---|---|---|---|
| The Spits / The Spits (V) | métal sûr, somme 0,444 ; métal ambigu max 0,545 | `Rock---Hardcore` 0,124 ; `Rock---Punk` 0,545 | `Rock---Punk` 0,55, `Rock---Oi` 0,24, `Rock---Hardcore` 0,12 |
| The Dø / Shake Shook Shaken | commercial sûr, somme 0,439 | `Electronic---Euro House` 0,107 | `Hip Hop---Ragga HipHop` 0,11, `Reggae---Reggae-Pop` 0,11, `Electronic---Euro House` 0,11 |
| Khadyak / Rise & Walk | commercial sûr, somme 0,426 | `Latin---Reggaeton` 0,124 | `Electronic---House` 0,25, `Latin---Reggaeton` 0,12, `Electronic---Deep House` 0,12 |
| GROS COEUR / Gros Disque | métal sûr, somme 0,275 | `Rock---Hardcore` 0,045 | `Rock---Punk` 0,12, `Rock---Alternative Rock` 0,10, `Rock---Indie Rock` 0,10 |
| Kieran Hebden / 41 Longfield Street… | métal sûr, somme 0,274 | `Rock---Post-Metal` 0,059 | `Electronic---Ambient` 0,25, `Electronic---Experimental` 0,21, `Electronic---Drone` 0,11 |
| Sneaks / Happy Birthday | commercial sûr, somme 0,264 | `Latin---Reggaeton` 0,094 | `Hip Hop---Trap` 0,25, `Electronic---Electro` 0,11, `Electronic---Experimental` 0,10 |
| Superorganism / World Wide Pop | commercial sûr 0,218 ; hard techno sûre 0,158 (le max de l'échantillon) | `Pop---K-pop` 0,094 ; `Electronic---Hardstyle` 0,066 | `Hip Hop---Grime` 0,10, `Hip Hop---Trap` 0,10, `Electronic---Dubstep` 0,10 |
| alt-J / An Awesome Wave | métal sûr, somme 0,214 | `Rock---Hardcore` 0,021 | `Rock---Alternative Rock` 0,13, `Rock---Indie Rock` 0,11 |
| Synaptic Voyager / High Rise EP | hard techno ambiguë, max 0,319 | `Electronic---Techno` | `Electronic---Techno` 0,32, `Electronic---Electro` 0,28, `Electronic---Deep House` 0,27 |
| Marcos Orellano (AR) / Deep Laugh EP | hard techno ambiguë, max 0,306 | `Electronic---Techno` | `Electronic---House` 0,36, `Electronic---Techno` 0,31 |

Tableau complet (40 lignes, top 5 de chaque titre) : `results.json` et sortie de `analyze.py` dans le scratchpad.

Lecture des mesures :

1. **Les niveaux absolus sont bas pour toutes les classes.** Aucune classe exclue « sûre » ne dépasse 0,124 sur un
   titre aimé ; la classe la plus forte d'un titre, toutes classes confondues, ne dépasse 0,5 que sur 2 titres
   sur 40 (The Spits `Rock---Punk` 0,55 ; Daft Punk `Electronic---House` 0,51). C'est cohérent avec une somme des 400 sigmoïdes d'environ 2,2 (§4.1).
2. **Les faux positifs par somme viennent de l'accumulation**, pas d'une classe forte : The Dø atteint 0,439 en
   commercial avec une classe maximale de 0,107, alt-J 0,214 en métal avec une classe maximale de 0,021. La somme d'un groupe de 14 à 31 classes gonfle mécaniquement.
3. **Les voisins attendus se confirment.** Punk/garage (The Spits, GROS COEUR) montent en `Rock---Hardcore` et
   `Rock---Oi` ; les titres house/électro (Khadyak, The Dø) en `Euro House` et `Reggaeton` ; le rap en
   `Hip Hop---Horrorcore` (Rejjie Snow, max 0,127). La techno aimée monte en `Electronic---Techno` (0,31-0,32),
   que ce document range en « ambiguë » pour cette raison.
4. **La hard techno « sûre » est la catégorie la plus propre** : max de classe 0,066 et somme ≤ 0,158 sur les 40.
5. Deux titres ont peu de patches (Big Soul : 12 ; Kieran Hebden : 21) : leur moyenne repose sur moins de données.

### 3.3 Mood aggressive et mood party sur les mêmes titres [MES]

| Tête | min | p25 | médiane | p75 | p90 | max | titres > 0,5 |
|---|---|---|---|---|---|---|---|
| `mood_aggressive` : P(`aggressive`) | 0,002 | 0,020 | 0,120 | 0,297 | 0,432 | 0,991 | **3/40** |
| `mood_party` : P(`party`) | 0,003 | 0,047 | 0,401 | 0,814 | 0,930 | 0,979 | **18/40** |

Titres aimés avec `aggressive` > 0,5 : The Spits 0,991, Felix da Housecat (remix) 0,870, GROS COEUR 0,580.
« party » dépasse 0,5 sur 18 titres aimés sur 40 : ce n'est pas un signal d'exclusion.

### 3.4 Approachability, engagement, Jamendo [MES]

| Tête | min | p25 | médiane | p75 | p90 | max |
|---|---|---|---|---|---|---|
| `approachability_regression` (moyenne des patches) | 0,149 | 0,360 | 0,495 | 0,608 | 0,801 | 0,887 |
| `engagement_regression` | 0,256 | 0,520 | 0,706 | 0,876 | 0,943 | 0,990 |
| `mtg_jamendo_moodtheme` : `commercial` | 0,002 | 0,008 | 0,011 | 0,018 | 0,022 | 0,028 |
| `mtg_jamendo_moodtheme` : `advertising` | 0,005 | 0,016 | 0,026 | 0,035 | 0,041 | 0,112 |
| `mtg_jamendo_genre` : `metal` | 0,001 | 0,002 | 0,004 | 0,009 | 0,024 | 0,227 |
| `mtg_jamendo_genre` : `techno` | 0,001 | 0,003 | 0,014 | 0,053 | 0,108 | 0,177 |
| `mtg_jamendo_genre` : `eurodance` | 0,000 | 0,001 | 0,002 | 0,007 | 0,019 | 0,053 |
| `mtg_jamendo_genre` : `pop` | 0,009 | 0,079 | 0,150 | 0,273 | 0,420 | 0,522 |

- **Approachability couvre toute l'échelle sur des titres aimés.** Les plus « approachable » : Jane Birkin 0,887,
  The Romeo Sextape 0,876, Jake Bugg 0,807, The Dø 0,807. Les moins : Synaptic Voyager 0,150, Marcos Orellano 0,180,
  Robert Robert 0,195 (techno/house instrumentales), james K 0,210 (ambient). La tête sépare donc chanson/indie
  mélodique d'électronique instrumentale, ce qui colle à sa définition (« mainstream genres vs. niche and
  experimental »), mais ne sépare pas « aimé » de « commercial ».
- Corrélation de rang (Spearman) entre approachability et la somme « commercial sûr » : **0,08** sur 40 titres,
  c'est-à-dire aucune relation mesurable ici.
- `commercial` de Jamendo ne dépasse jamais 0,028 : il ne s'allume pas sur nos titres, et son sens n'est pas
  documenté (§2.2).

---

## 4. Calibration des sorties de genre_discogs400 et combinaison

### 4.1 Ce qui est documenté

- **Sigmoïde multi-label, pas softmax.** [J-400] : sortie `PartitionedCall:0`, `"op": "Sigmoid"`. [MODELS] section
  Discogs-EffNet : « Model trained with a multi-label classification objective targeting 400 Discogs styles. »
  [P22 §4.2] : réseau de base entraîné « with the multi-label soft-margin loss », c'est-à-dire, d'après sa
  définition [TORCH], une entropie croisée binaire indépendante par classe sur la sigmoïde (« multi-label
  one-versus-all loss »). [P22 §4.4] : têtes aval avec « sigmoid or softmax activation for the multi-label or
  multi-class tasks ».
- Conséquence directe : les 400 valeurs sont **indépendantes** ; elles ne somment pas à 1. Mesuré sur nos 40 titres :
  somme des 400 sigmoïdes moyennées = 1,82 à 2,85 (médiane 2,23) [MES].
- **Le mainteneur les présente comme des probabilités et recommande des seuils par classe** ([#1329], palonso,
  2023-06-21, `issuecomment-1600648428`) : « Since the output of our model are probabilities, you can define your
  custom threshold for specifc classes (e.g., only consider experimental predictions when the probability > 0.7). »
  Même réponse : `experimental` et `vaporwave` sont sur-détectés car « may be overrepresented in the training set ».
- **Agrégation temporelle** : moyenne des activations par classe sur les patches ([#1329], palonso, 2023-05-10,
  `issuecomment-1542795686` : « A common way to process the predictions is to average the temporal dimension (first
  axis), which gives you a vector of overall probabilities for each class ») ; c'est aussi [R0 §2] et [P22 §4.4].
- **Métriques publiées** [J-400] : ROC-AUC 0,95417, PR-AUC 0,20629, sur « Discogs-4M (unreleased) », « 4M full tracks
  (3.3M used) ». Le `.json` ne dit pas si ce sont des moyennes macro ou micro (**non documenté**). Les métriques par
  classe ne sont **pas publiées**.

### 4.2 Ce qui n'est pas documenté

- **La calibration** : aucune source officielle ne dit que les sigmoïdes sont calibrées (fiabilité, diagramme de
  fiabilité, ECE, température). « probabilities » dans [#1329] est un mot du mainteneur, pas une mesure publiée.
  Le fait que des classes soient sur-détectées (même commentaire) montre au contraire que le niveau absolu varie
  d'une classe à l'autre.
- **La façon de combiner plusieurs classes** en une catégorie (somme, max, « ou » probabiliste) : **non documenté**.
- **Les seuils** : aucun seuil par défaut n'est publié ; l'exemple 0,7 de [#1329] est illustratif.

### 4.3 Combiner correctement : ce qui découle des faits ci-dessus

Faits mathématiques (pas des recommandations MTG) :

1. **Ordre des opérations.** L'usage documenté moyenne chaque classe dans le temps (§4.1), puis on combine. Combiner
   patch par patch avant de moyenner donne un autre nombre (mesuré en variante `patch_max_mean`, §3).
2. **Somme** des sigmoïdes d'un groupe : ce n'est **pas** une probabilité (peut dépasser 1, surtout sur un grand groupe
   de classes corrélées comme les 31 styles métal qui s'étiquettent ensemble sur une même sortie Discogs). C'est un
   score, pratique pour trier, qui grossit mécaniquement avec la taille du groupe.
3. **Max** du groupe : reste dans [0, 1], insensible au nombre de classes, cohérent avec les seuils par classe
   recommandés dans [#1329].
4. **« Ou » probabiliste** `1 − Π(1 − p_i)` : n'est une probabilité que si les classes sont indépendantes
   conditionnellement au titre, hypothèse **non documentée** et peu plausible pour des styles qui co-occurrent.
5. Aucune de ces trois agrégations n'est calibrée tant que les classes ne le sont pas (§4.2). Une calibration
   propre exigerait des exemples étiquetés (positifs **et** négatifs) de notre domaine.

---

## 5. Ce que ça permet pour la couleur

### 5.1 Faits établis

1. **Hard/métal et hard techno ont des classes Discogs400 explicites** (31 + 11 « sûres », §1.2-1.3). La
   **soupe commerciale n'en a pas** : on ne peut l'approcher que par des styles associés (14 « sûrs », §1.4), et
   plusieurs voisins portent des goûts déclarés de Victor (§1.5).
2. **Les sorties sont des sigmoïdes indépendantes, non calibrées de façon documentée**, sans seuil publié et sans
   métrique par classe (§4). Le mainteneur conseille des seuils **par classe** et signale des sur-détections (§4.1).
3. **Sur 40 titres aimés, aucune classe exclue « sûre » ne dépasse 0,124** en moyenne temporelle (§3.1). Mais une
   **somme** de groupe atteint 0,44 (métal : The Spits, garage punk ; commercial : The Dø, Khadyak) par simple
   accumulation de petites valeurs.
4. **Les faux positifs attendus existent et sont identifiés** : punk/garage → `Rock---Hardcore`, `Rock---Oi`,
   `Rock---Punk` ; house/électro pop → `Euro House`, `Reggaeton` ; techno aimée → `Electronic---Techno` ; rap →
   `Horrorcore` (§3.2).
5. **Hard techno « sûre » : le groupe le plus propre** sur nos titres (max de classe 0,066, somme ≤ 0,158).
6. **Approachability n'est pas un détecteur de « commercial » pour cette bibliothèque** : définition officielle
   « mainstream genres vs. niche and experimental » (§2.1), jeu de données et protocole non documentés, et sur nos
   titres aimés elle couvre 0,15 à 0,89 avec un Spearman de 0,08 contre le score « commercial sûr » (§3.4).
   Engagement décrit un mode d'écoute, pas la popularité.
7. **`mood_aggressive`** dépasse 0,5 sur 3 titres aimés sur 40 (The Spits 0,99), **`mood_party`** sur 18/40 ;
   `commercial` de Jamendo ne s'allume jamais (max 0,028) et le sous-ensemble est déclaré « especially noisy » par le
   mainteneur (§2.2, §3.3).
8. **Coût** : les têtes coûtent 0,07 à 0,13 s CPU par titre pour sept têtes ; l'essentiel reste l'embedding par
   patch (médiane 6,1 s CPU en hop 128) (§0). Or le cache actuel ne garde que le **vecteur moyen** : appliquer les têtes
   « comme il faut » (par patch, [R0 §3.2]) exige de repasser par l'audio, ou de stocker les prédictions au moment de
   l'embedding.
9. **Ce que la mesure ne dit pas** : rien sur le taux de détection de vrais titres de métal, de hard techno ou de
   variété commerciale, faute d'exemples négatifs (§3). Aucun seuil ne peut être fixé proprement sans eux (§4.3,
   point 5).

### 5.2 Options (non tranchées)

- **A. Filtre par classe Discogs400 avec seuil par classe**, sur les listes « sûres » uniquement, agrégé par **max**
  (reste dans [0, 1], conforme au conseil de seuil par classe de [#1329]). Sur nos 40 titres aimés, un seuil à 0,2
  n'exclurait rien (max « sûr » observé 0,124). Inconnu : ce que le même seuil attrape parmi de vrais négatifs.
- **B. Score de groupe par somme ou « ou » probabiliste.** Plus sensible aux styles diffus, mais produit les faux
  positifs observés (The Spits, The Dø, Khadyak à ≈ 0,43-0,44 ; alt-J à 0,21 sans classe au-dessus de 0,021). Le
  seuil dépendrait de la taille de chaque liste.
- **C. Listes « sûres » seules ou « sûres + ambiguës ».** Les ambiguës font monter les faux positifs (ex.
  `Rock---Punk` 0,545 et `Electronic---Techno` 0,32 sur des titres aimés) ; `Rock---Hardcore`, rangée en « sûre »,
  est elle aussi la plus haute sur le punk/garage aimé (0,124 sur The Spits), alors que `Rock---Hard Rock` reste
  ≤ 0,014. Le tri sûres/ambiguës de ce document est un
  choix à valider par Victor, pas une vérité de la taxonomie.
- **D. `mood_aggressive` comme signal d'appoint** pour le hard/métal : documenté (acc. 0,98 sur 280 titres), mais il
  s'allume aussi sur du garage punk et un remix électro aimés.
- **E. Garder les 400 probabilités comme variables d'entrée** d'un classifieur « couleur » entraîné sur la
  bibliothèque (positifs) et sur des négatifs choisis, plutôt que des listes écrites à la main. Cela suppose de
  constituer ces négatifs (non disponibles aujourd'hui) ; la question de licence des sorties dérivées reste ouverte
  ([R0 §6]).
- **F. Ne pas utiliser approachability / engagement / Jamendo `commercial`** comme proxy de la soupe commerciale :
  aucune de ces têtes n'est documentée pour ce sens, et la mesure ne montre pas de lien (§3.4). Approachability
  reste utilisable pour ce qu'elle dit mesurer (accessible ↔ niche), par exemple pour la programmation par créneau,
  ce qui est une autre question.
- **G. Constituer un jeu de validation négatif minimal** (quelques dizaines de titres par catégorie exclue, hors
  bibliothèque) avant tout seuil : c'est la seule façon de mesurer le compromis détection / faux positifs que ce
  document ne peut pas mesurer. Cela sort de la consigne actuelle (bibliothèque uniquement).
