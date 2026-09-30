# Discogs-EffNet (Essentia) : usage officiel, écarts et correctifs

Recherche du 2026-09-23, préparatoire au plan 2 (EffNet devient l'unique modèle d'embedding, CLAP est retiré).
Règle suivie : chaque affirmation renvoie à une source (URL officielle, `fichier:ligne` du code source, ou mesure
maison notée **[MES]**). Ce qui n'est écrit nulle part est marqué **non documenté**.

## 0. Sources et conditions

### Sources (toutes consultées le 2026-09-23)

| Réf. | Source |
|---|---|
| [MODELS] | https://essentia.upf.edu/models.html, section « Discogs-EffNet » et sections des têtes |
| [J-EMB] | https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs-effnet-bs64-1.json (et `-bs1-1.json`, `-bs512-1.json`, `-bsdynamic-1.json` dans le même dossier) |
| [J-HEAD] | les `.json` des têtes sous https://essentia.upf.edu/models/classification-heads/ (URL exactes au §3) |
| [LISTING] | listings de dossiers https://essentia.upf.edu/models/feature-extractors/discogs-effnet/, `.../classification-heads/`, `.../classification-heads/{deam,emomusic,muse}/` |
| [CHANGELOG] | https://essentia.upf.edu/models/CHANGELOG.md |
| [LICENSE] | https://essentia.upf.edu/models/LICENSE |
| [CC] | https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.en |
| [SRC] | code source MTG/essentia, branche master, commit `f6db1f6` (2026-09-21). Chemins relatifs au dépôt. |
| [INST] | paquet installé `essentia-tensorflow==2.1b6.dev1389` (`.venv`) : docstrings Python et chaînes du binaire `_essentia.cpython-312-x86_64-linux-gnu.so` |
| [DEMO] | MTG/essentia-replicate-demos, commit `7575461` (2025-02-17) : `effnet-discogs/predict.py`, `music-approachability-engagement/predict.py`, `music-arousal-valence/predict.py` |
| [TUTO] | https://essentia.upf.edu/tutorial_tensorflow_auto-tagging_classification_embeddings.html |
| [FAQ] | https://essentia.upf.edu/FAQ.html |
| [P22] | Alonso-Jiménez, Serra, Bogdanov, *Music Representation Learning Based on Editorial Metadata from Discogs*, ISMIR 2022, https://archives.ismir.net/ismir2022/paper/000099.pdf |
| [#n] | tickets GitHub MTG/essentia n° n : https://github.com/MTG/essentia/issues/n |
| [TF25] | TensorFlow v2.5.0 (version embarquée : `essentia_tensorflow.libs/libtensorflow-5b27f169.so.2.5.0`) : `tensorflow/core/common_runtime/process_util.cc`, `local_device.cc` au tag `v2.5.0` |

Le code source cité est celui de master. Pour les paramètres, l'installé concorde : la docstring de
`essentia.standard.TensorflowPredictEffnetDiscogs` dans le `.venv` donne les mêmes paramètres et défauts que
`tensorflowpredicteffnetdiscogs.h:126-135` [INST][SRC]. Le message d'avertissement étudié au §4 est présent tel quel
dans le binaire installé [INST].

Non consulté : les papiers 2023 d'Alonso-Jiménez (MAEST, pré-entraînement par playlists). Ils ne portent pas sur
l'inférence Discogs-EffNet dans Essentia.

### Conditions de mesure [MES]

- Machine : Intel Core i5-6300U, 2 cœurs / 4 threads, 2,4 GHz (`lscpu`).
- Toutes les mesures ont tourné sous `nice -n 19`, **pendant** l'entraînement `radio reference train`
  (≈ 315 % CPU, load average entre 5 et 7 sur 4 threads logiques). Les temps « mur » sont donc pessimistes et
  bruités. Le temps CPU (`time.process_time()`, tous threads confondus) résiste mieux à la concurrence :
  c'est lui qu'il faut lire.
- 3 fichiers, tirés de `data/radio.db` (table `embeddings`) : `/media/plex/Musique/E_DEATH/Czech Hunter (2025)/`
  `01 - Gabapentin (III).flac` (253,24 s), `03 - Penthouse.flac` (223,40 s), `06 - Margiela.flac` (224,00 s).
- Script et journaux bruts : `/tmp/claude-1000/-home-victormoi/18004597-ebc8-44ca-bff2-5d887c340194/scratchpad/`
  (`bench.py`, `bench_new.json`, `bench_reuse.json`, `bench_logs/`).

---

## 1. Chaîne d'inférence officielle de l'embedding

### 1.1 Recette officielle

[MODELS], modèle `discogs-effnet-bs64` :

```python
from essentia.standard import MonoLoader, TensorflowPredictEffnetDiscogs
audio = MonoLoader(filename="audio.wav", sampleRate=16000, resampleQuality=4)()
model = TensorflowPredictEffnetDiscogs(graphFilename="discogs-effnet-bs64-1.pb", output="PartitionedCall:1")
embeddings = model(audio)
```

- **Fréquence d'échantillonnage : 16 kHz.** C'est la recette ci-dessus, et le champ `"inference": {"sample_rate": 16000}`
  de [J-EMB]. La docstring le répète : « the input audio signal sampled at 16 kHz », et « The recommended pipeline
  is as follows: MonoLoader(sampleRate=16000) >> TensorflowPredictEffnetDiscogs »
  (`src/algorithms/machinelearning/tensorflowpredicteffnetdiscogs.cpp:152-154,165`).
- **`resampleQuality=4`** figure dans tous les extraits de [MODELS]. Le défaut de MonoLoader est `1`. Définition du
  paramètre : « 0 for best quality, 4 for fast linear approximation » (`src/algorithms/io/monoloader.h:59`).
  Mesure [MES] : `q=1` coûte 4,5 à 6,1 s CPU par titre, contre 0,76 à 0,93 s CPU pour `q=4`. Entre les deux, la
  similarité cosinus des embeddings moyens vaut 0,985 à 0,990. La valeur officielle (4) est donc aussi la moins chère.
- **Nœud de sortie de l'embedding : `PartitionedCall:1`**, forme `[64, 1280]`, op `Flatten`,
  `"output_purpose": "embeddings"`. **Nœud des activations : `PartitionedCall:0`**, forme `[64, 400]`, op `Sigmoid`,
  `"output_purpose": "predictions"` (400 styles Discogs) [J-EMB]. Attention au défaut de l'algorithme :
  `output = "PartitionedCall"`, sans suffixe (`tensorflowpredicteffnetdiscogs.h:130`). Il faut donc toujours
  passer `output="PartitionedCall:1"` pour obtenir l'embedding.
- **Entrée :** `serving_default_melspectrogram`, forme `[64, 128, 96]` [J-EMB]. C'est aussi le défaut de l'algorithme
  (`.h:129`). L'algorithme calcule lui-même le mél-spectrogramme : trames de 512 échantillons, pas de 256, 96 bandes,
  au format MusiCNN (`.h:51-55,113-117` ; `.cpp:45-63,104`). Le papier le confirme : « 2-second patches of
  mel-spectrograms with 96 bands extracted with the same parametrization as for MusiCNN » [P22 §4.2].

### 1.2 Paramètres et défauts réels (installé = source)

`src/algorithms/machinelearning/tensorflowpredicteffnetdiscogs.h:126-135`, identiques dans la docstring installée [INST] :

| Paramètre | Défaut | Sens (texte officiel résumé) |
|---|---|---|
| `graphFilename` | `""` | fichier `.pb` |
| `savedModel` | `""` | SavedModel, prioritaire sur `graphFilename` |
| `input` | `serving_default_melspectrogram` | nœud d'entrée |
| `output` | `PartitionedCall` | nœud de sortie ; `:1` pour l'embedding (voir plus haut) |
| `patchHopSize` | `62` | « 62 frames which corresponds to a prediction rate of 1.008 Hz ». `0` = pas de recouvrement |
| `patchSize` | `128` | « should match the model's expected input shape » : 128 trames ≈ 2,05 s |
| `batchSize` | `64` | « Set it to -1 or 0 to accumulate all the patches… This option is not supported by some EffnetDiscogs models that require a fixed batch size » (`.cpp:146-150`) |
| `lastPatchMode` | `discard` | les dernières trames qui ne remplissent pas un patch sont jetées (ou répétées avec `repeat`) |
| `lastBatchMode` (mode standard seulement) | `same` | « `same` zero-pads the input but returns only the predictions corresponding to patches with signal » |

**Effet de `lastBatchMode="same"` avec un graphe à batch fixe** (`.cpp:214-233`, `padSignal` `.cpp:248-290`) :
le signal reçoit des zéros en fin jusqu'à un multiple de `batchSize` patches. Tous les patches sont calculés,
puis ceux de remplissage sont retirés de la sortie. Le coût d'inférence suit donc
`ceil(n_patches / 64) × 64`, et non `n_patches`. Mesures [MES] :

| Titre | Patches rendus (hop 62) | Patches réellement calculés |
|---|---|---|
| 253,24 s | 254 | 256 (4 lots) |
| 223,40 s | 224 | 256 (4 lots) |
| 224,00 s | 224 | 256 (4 lots) |

### 1.3 bs64, bs1, bs512, ONNX dynamique

- **bs64** (`discogs-effnet-bs64-1.pb`, publié le 2022-02-17) : c'est le seul graphe présenté sur [MODELS], et celui
  qu'utilisent tous les extraits de code des têtes. [MODELS] explique pourquoi : « We provide models operating with a
  fixed batch size of 64 samples since it was not possible to port the version with dynamic batch size from ONNX to
  TensorFlow. Additionally, an ONNX version of the model with dynamic batch size is provided. »
- **bs1** (`discogs-effnet-bs1-1.pb`, entrée `[1, 128, 96]`, `release_date` 2024-01-29, TF 2.13.0) et **bs512**
  (`discogs-effnet-bs512-1.pb`, entrée `[512, 128, 96]`) existent dans [LISTING]. Ils ne figurent pas sur [MODELS].
  Leur ajout est noté dans [CHANGELOG] aux entrées 2024-01-29 et 2024-09-27. L'entrée 2024-09-27 contient une
  coquille : elle nomme « bs1 » le modèle « with fixed batch size equal to 512 ». Aucun exemple de code officiel
  n'existe pour ces deux graphes (**non documenté**). D'après le code, il faudrait régler `batchSize` sur la taille
  du graphe (`.cpp:102` construit la forme d'entrée `{batchSize, 1, patchSize, 96}`). **Non mesuré** : je ne les ai
  pas téléchargés, la consigne limitait les téléchargements aux `.json`.
- **ONNX dynamique** (`discogs-effnet-bsdynamic-1.onnx`, entrée `["n", 128, 96]`) [J-EMB bsdynamic]. Essentia n'a
  pas d'algorithme d'inférence ONNX : aucun `OnnxPredict` dans `src/algorithms/machinelearning/` de master [SRC],
  `'OnnxPredict' in dir(essentia.standard)` renvoie `False` dans l'installé [INST], et la PR MTG/essentia#1488
  « New feature: OnnxPredict algorithm » est toujours ouverte. `onnxruntime` n'est pas dans le `.venv` [MES].
  Utiliser ce graphe obligerait à recoder le mél-spectrogramme hors de `TensorflowPredictEffnetDiscogs`, ce qui sort
  de la chaîne officielle.
- **Pour un usage CPU, fichier par fichier :** la seule chaîne documentée de bout en bout est **bs64 + `.pb`**.
  Le modèle local est l'officiel : `models/discogs-effnet-bs64-1.pb` fait 18 366 619 octets, soit le
  `Content-Length` du fichier servi par essentia.upf.edu [MES].

---

## 2. Agrégation en un vecteur par titre ; dimension

- **Sortie de l'algorithme :** une matrice `[n_patches, 1280]`, une ligne par patch de 2 s, tous les 62 trames
  (≈ 0,99 s) par défaut (`.h:131`). Mesure [MES] : formes `(254, 1280)`, `(224, 1280)`, `(224, 1280)`.
- **Dimension : 1280.** Sources concordantes : [J-EMB] (`PartitionedCall:1`, `[64, 1280]`) ; [P22 §4.2] (« flattened
  output of the last convolutional block with 1280 units (embedding layer) ») ; la mesure ; la base (`embeddings.vector`
  de `model='effnet'` = 5 120 octets = 1 280 float32). Un défaut de métadonnées (1200 au lieu de 1280 dans les `.json`
  des têtes du 2022-08-25) a été corrigé le 2025-10-28 ([CHANGELOG], [#1490]). Les `.json` téléchargés aujourd'hui
  donnent 1280.
- **Agrégation documentée des *prédictions* (pas des embeddings) : moyenne sur l'axe temporel.**
  - [DEMO] `effnet-discogs/predict.py:95-97` : `embeddings = …(waveform)`, `activations = self.classification_model(embeddings)`,
    puis `activations_mean = np.mean(activations, axis=0)`. Même schéma dans
    `music-approachability-engagement/predict.py:165,177`.
  - [TUTO] : « we can compute the global accuracy as the mean of the activations along the temporal axis ».
  - [P22 §4.4] : « For validation, we averaged over the activations from the half-overlapped patches of the entire
    tracks. »
- **Agrégation des *embeddings* en un vecteur de titre : non documenté.** Aucune source officielle consultée ne dit
  comment réduire la matrice `[n, 1280]` à un vecteur. La moyenne suivie d'une normalisation L2 est **notre**
  convention. Elle est raisonnable, mais ce n'est pas une recommandation MTG. Les têtes officielles, elles, ne
  prennent pas l'embedding moyenné (voir §3.2).

---

## 3. Têtes de classification (TensorflowPredict2D)

### 3.1 Fonctionnement de TensorflowPredict2D

Défauts (`src/algorithms/machinelearning/tensorflowpredict2d.h:111-122`) : `input="model/Placeholder"`,
`output="model/Sigmoid"`, `patchSize=1`, `patchHopSize=1`, `batchSize=64`. En mode standard, `dimensions` prend
la largeur de l'entrée (`tensorflowpredict2d.cpp`, « Note 2 », ≈ l. 158-160). L'algorithme « expects an input
feature matrix with shape (timestamps, dimensions) and processes it sequentially along the time axis » : **une
prédiction par patch d'embedding**. Mesure [MES] : entrée `(254, 1280)` → sortie `(254, 400)` pour genre et
`(254, 2)` pour les têtes binaires.

### 3.2 Par patch, ou sur l'embedding moyenné ?

L'usage officiel passe **la matrice par patch** (`predictions = model(embeddings)` dans tous les extraits de [MODELS]),
puis **moyenne les prédictions** ([DEMO] l. 97, voir §2). Passer un embedding moyenné `(1, 1280)` fonctionne
techniquement (sortie `(1, 2)`), mais **ne donne pas le même résultat** [MES] :

| Titre | Tête | moyenne des prédictions par patch (officiel) | prédiction sur l'embedding moyen |
|---|---|---|---|
| Margiela | voice_instrumental `[instrumental, voice]` | [0,1228, **0,8772**] | [0,0099, **0,9901**] |
| Margiela | mood_aggressive `[aggressive, not_aggressive]` | [**0,8271**, 0,1729] | [**0,9039**, 0,0961] |
| Gabapentin | voice_instrumental | [0,609, 0,391] | [0,6703, 0,3297] |
| Margiela | genre_discogs400, 3 premiers indices | 129, 121, 84 | 129, 85, 83 |

Le calcul d'une tête coûte 0,012 à 0,061 s par titre [MES], c'est négligeable. Il n'y a donc aucune raison de
s'écarter de l'usage officiel.

### 3.3 Catalogue des têtes demandées (nœuds tirés des `.json` officiels)

Toutes les têtes ci-dessous déclarent `"embedding_model": {"algorithm": "TensorflowPredictEffnetDiscogs", "model_name": "discogs-effnet-bs64-1"}`
[J-HEAD]. Le lien `link` de ce bloc pointe vers l'ancien chemin `music-style-classification/…`, déplacé le 2023-05-04
selon [CHANGELOG]. C'est un défaut de métadonnées, sans effet sur l'usage.

Pour les têtes à entrée `model/Placeholder`, `input` peut être omis : c'est le défaut de TensorflowPredict2D.
Préfixe commun des URL : `https://essentia.upf.edu/models/classification-heads/`.

| Tête (fichier) | Entrée | Sortie à utiliser | Classes, dans l'ordre du `.json` | Local ? |
|---|---|---|---|---|
| `danceability/danceability-discogs-effnet-1` | `model/Placeholder` [1280] | `model/Softmax` [2] | `danceable`, `not_danceable` | non |
| `mood_party/mood_party-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `non_party`, `party` | non |
| `mood_happy/mood_happy-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `happy`, `non_happy` | non |
| `mood_relaxed/mood_relaxed-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `non_relaxed`, `relaxed` | non |
| `mood_sad/mood_sad-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `non_sad`, `sad` | non |
| `mood_aggressive/mood_aggressive-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `aggressive`, `not_aggressive` | `.pb` oui (taille = officielle), `.json` non |
| `approachability/approachability_regression-discogs-effnet-1` | `model/Placeholder` | `model/Identity` [1], op Linear | `approachability` | non |
| `approachability/approachability_2c-discogs-effnet-1` / `_3c-` | `model/Placeholder` | `model/Softmax` | 2c : `not approachable`, `approachable` ; 3c : `not approachable`, `moderately approachable`, `approachable` | non |
| `engagement/engagement_regression-discogs-effnet-1` | `model/Placeholder` | `model/Identity` [1] | `engagement` | non |
| `engagement/engagement_2c-discogs-effnet-1` / `_3c-` | `model/Placeholder` | `model/Softmax` | 2c : `not engaging`, `engaging` ; 3c : `not engaging`, `moderately engaging`, `engaging` | non |
| `voice_instrumental/voice_instrumental-discogs-effnet-1` | `model/Placeholder` | `model/Softmax` | `instrumental`, `voice` | `.pb` oui (taille = officielle), `.json` non |
| `genre_discogs400/genre_discogs400-discogs-effnet-1` | **`serving_default_model_Placeholder`** `[batch_size, 1280]` | **`PartitionedCall:0`** `[batch_size, 400]`, Sigmoid | 400 styles `Genre---Style` | `.pb` + `.json` oui (le `.json` local est identique à l'officiel) |

Les sorties `model/Softmax` et `model/Identity` correspondent aux extraits de [MODELS]. Pour genre, [MODELS] donne
explicitement `input="serving_default_model_Placeholder", output="PartitionedCall:0"`. Chaque tête binaire expose
aussi `model/dense/BiasAdd` [100] (« penultimate layer ») [J-HEAD].

**Piège vérifié dans les `.json` : l'indice de la classe « positive » change d'une tête à l'autre.** Il vaut 0 pour
danceability, happy, aggressive et 1 pour party, relaxed, sad, voice. Il faut lire l'indice dans `classes` du
`.json` et ne jamais le coder en dur.

Indicateurs publiés dans les `.json` : données d'entraînement « In-house MTG collection » de 230 à 446 titres pour
les humeurs et la danceability (précision normalisée en validation croisée à 5 plis de 0,87 à 0,98) ; environ 20 000
à 25 000 titres pour approachability et engagement (corrélation de Pearson 0,85 et 0,73 en régression) [J-HEAD].

**Arousal / valence sur discogs-effnet : n'existe pas officiellement.** Les sections « Arousal/valence DEAM »,
« emoMusic » et « MuSe » de [MODELS] ne listent que des variantes `msd-musicnn` et `audioset-vggish`. Les dossiers
`classification-heads/deam/`, `emomusic/` et `muse/` ne contiennent que des `*-audioset-vggish-*` et
`*-msd-musicnn-*` [LISTING]. La démo officielle `music-arousal-valence/predict.py:35-43` n'utilise que MusiCNN et
VGGish [DEMO]. Obtenir A/V imposerait donc un second modèle d'embedding (par exemple `msd-musicnn-1.pb`, déjà dans
`models/`), ce qui contredit la décision « EffNet seul ».

### 3.4 Styles Discogs : tête `genre_discogs400` ou sortie `PartitionedCall:0` ?

Le modèle d'embedding sort aussi directement les 400 styles (`PartitionedCall:0`) [J-EMB]. Mais
`TensorflowPredictEffnetDiscogs` n'accepte qu'un seul nœud de sortie (`output` est une chaîne,
`.cpp:113-126`). Lire les deux sorties demanderait deux passes du réseau complet. La voie documentée par [MODELS],
embedding puis tête `genre_discogs400`, ne coûte que 0,04 à 0,06 s par titre [MES].

---

## 4. L'avertissement « No network created, or last created network has been deleted... »

### 4.1 D'où il sort (code)

- `src/essentia/scheduler/network.cpp:969-975` :
  ```cpp
  void printNetworkBufferFillState() {
    if (!Network::lastCreated) {
      E_WARNING("No network created, or last created network has been deleted...");
    }
    Network::lastCreated->printBufferFillState();
  }
  ```
- `Network::lastCreated` est une variable **globale** du processus. Chaque construction d'un `Network` l'écrase, et
  le destructeur du dernier réseau créé la remet à 0 (`network.cpp:167-186`).
- La fonction est appelée, dans une compilation sans débogage, à **chaque** fois qu'un algorithme du réseau en cours
  rend `NO_OUTPUT` : tampon de sortie plein, l'algorithme est replanifié (`network.cpp:324-336`). Les autres appels
  sont sous `#if DEBUGGING_ENABLED` (l. 273-281). `printBufferFillState()` rend la main aussitôt si le débogage
  `EScheduler` n'est pas actif (l. 940). Le message est donc purement cosmétique.
- `MonoLoader` en mode standard crée son propre `Network` dans son constructeur (`src/algorithms/io/monoloader.cpp:95-102`)
  et le détruit dans son destructeur (`monoloader.h:103-104`). `configure()` ne le recrée pas (`monoloader.cpp:104-113`).
  `TensorflowPredictEffnetDiscogs` crée aussi ses réseaux à la construction (`tensorflowpredicteffnetdiscogs.cpp:65,184`).

### 4.2 Cause chez nous (documentée et prouvée)

`EffnetEmbedder._frames()` crée un `MonoLoader` neuf pour chaque fichier, puis le laisse détruire
(`radio/analyze/embedders.py`, méthode `_frames`). La destruction remet `lastCreated` à 0. L'inférence EffNet qui
suit tombe alors sur de nombreux `NO_OUTPUT`, et chacun écrit une ligne d'avertissement.

- **Explication du mainteneur** (palonso, [#1457], 2025-01-17) : « This warning is very common when creating and
  destroying algorithms after a previous algorithm has been created. […] you are creating and destroying a `MonoLoader`
  for each audio file. If you want to get rid of the warning you can reuse a `MonoLoader` object […]
  `monoloader.configure(filename=audio_fn)` ». Même solution dans [#1094] (xaviliz, 2025-07-22) : instancier une
  fois, puis `configure()`.
- **La démo officielle procède ainsi :** `self.loader = MonoLoader()` une seule fois, puis
  `self.loader.configure(sampleRate=…, resampleQuality=4, filename=…)` à chaque requête (`effnet-discogs/predict.py:42,87-92`).
- **Preuve [MES]**, mêmes fichiers, même modèle :

  | Chargement | Avertissements pendant l'inférence (3 fichiers) |
  |---|---|
  | `MonoLoader(...)()` neuf à chaque fichier (code actuel) | 8 232 / 8 230 / 8 249 |
  | un seul `MonoLoader`, `configure()` à chaque fichier | **0 / 0 / 0** |

  Audio et embeddings sortent identiques par les deux voies.
- **Volume en production :** `data/colour/train.log` pesait 1 650 039 541 octets à 21 h 04 et contenait
  21 434 020 lignes « No network created », pour environ 2 400 titres EffNet, soit ≈ 8 900 lignes par titre.
  Ce volume concorde avec la mesure.
- **Effet sur le temps de calcul : pas mesurable.** L'inférence consomme 14,1 / 14,7 / 14,5 s CPU avec
  l'avertissement et 15,5 / 14,8 / 15,0 s CPU sans lui, écart dans le bruit [MES]. L'avertissement n'explique donc
  pas les 6,5 s par titre. Son seul coût est le journal (1,5 Go).
- **Masquer au lieu de corriger** (`essentia.log.warningActive = False`, cité dans [#1094] et [#1086]) ferait taire
  **tous** les avertissements Essentia, y compris les vrais. Ce n'est pas nécessaire : la cause est connue et se
  corrige.

---

## 5. Performance

### 5.1 Ce que dit la documentation

- **Aucun chiffre de performance CPU officiel** pour Discogs-EffNet dans [MODELS], [J-EMB] ou la documentation des
  algorithmes (**non documenté**).
- [#1268] (« Bulk Inference », 100 000 MP3 avec effnet-discogs), réponse du mainteneur : « The neural-network
  inference is the most computationally expensive part ». Il recommande GPU ou parallélisme **par processus**, car
  « Essentia algorithms are not thread-safe ». La [FAQ] le dit aussi : « the algorithms are not thread-safe ».
- Pour réduire le coût, la démo officielle règle `patchHopSize=128  # remove overlap between patches for efficiency`
  (`effnet-discogs/predict.py:46` ; même réglage dans `music-approachability-engagement/predict.py:42`).
- [#1247] (ouvert) : en mode *streaming*, un graphe à batch 64 exige 64 patches avant de rendre quoi que ce soit.
  Le mode standard, le nôtre, contourne ce problème par le remplissage `lastBatchMode="same"` (§1.2).
- **Threads TensorFlow :** Essentia ouvre ses sessions avec des `TF_SessionOptions` par défaut, sans configuration
  (`src/algorithms/machinelearning/tensorflowpredict.h:83-84`), et n'expose aucun paramètre de threads
  (**non documenté** côté Essentia). Côté TensorFlow 2.5, le nombre de threads *intra-op* vient de
  `TF_NUM_INTRAOP_THREADS`, à défaut `port::MaxParallelism()` (`local_device.cc:76-89`) ; le nombre *inter-op* vient
  de `TF_NUM_INTEROP_THREADS`, à défaut `MaxParallelism()` (`process_util.cc:43-52,93-103`) [TF25]. Les deux chaînes
  figurent dans la `libtensorflow` embarquée [INST]. La mesure prouve qu'elles sont prises en compte : avec `=1`,
  le temps CPU égale le temps mur (§5.3).

### 5.2 Ce qui explique nos 6,5 s par titre (mesuré)

| Titre | MonoLoader q4, CPU | Inférence hop 62 : patches rendus → calculés | Inférence hop 62, CPU |
|---|---|---|---|
| Gabapentin (253 s) | 0,80 à 0,93 s | 254 → 256 | 14,1 à 15,5 s |
| Penthouse (223 s) | 0,76 à 0,84 s | 224 → 256 | 14,7 à 14,8 s |
| Margiela (224 s) | 0,52 à 0,77 s | 224 → 256 | 14,5 à 15,0 s |

Variantes, un seul MonoLoader réutilisé (mode `reuse`) :

| Titre | hop 128 : patches → calculés, CPU | cos(moy. hop 62, moy. hop 128) | 60 s centrales : patches, CPU, cos vs titre entier | 30 s centrales : patches, CPU, cos vs titre entier |
|---|---|---|---|---|
| Gabapentin | 123 → 128, 8,20 s | 0,99984 | 59, 4,51 s, 0,942 | 29, 4,46 s, 0,926 |
| Penthouse | 109 → 128, 8,49 s | 0,99979 | 59, 4,54 s, 0,980 | 29, 4,64 s, 0,960 |
| Margiela | 109 → 128, 8,30 s | 0,99975 | 59, 4,57 s, 0,934 | 29, 4,39 s, 0,932 |

Lecture :

1. **Le décodage est marginal** : 0,5 à 0,9 s CPU avec `resampleQuality=4`.
2. **Le coût se compte en lots de 64 patches, à ≈ 3,7 à 4,6 s CPU par lot** sur ce i5-6300U chargé
   (15,5 / 4 ; 8,2 / 2 ; 4,5 / 1). Avec le pas par défaut (62 trames ≈ 0,99 s), un patch de 2 s tombe environ
   chaque seconde : un titre de 4 min donne ≈ 225 à 255 patches, arrondis à 256, donc 4 lots, soit ≈ 15 s CPU.
   Répartis sur ≈ 3 threads, cela donne l'ordre de grandeur des 6,5 s mur observés en production.
3. **Comparaison avec CLAP** : l'implémentation actuelle de CLAP ne lit que 70 s et n'en garde que 30
   (`ClapEmbedder._embed_file`). EffNet traite **tout** le titre, en patches recouvrants de moitié. Les deux
   embedders ne font pas le même travail : l'écart de 0,8 s à 6,5 s vient de là, pas d'un défaut d'EffNet.
4. **`patchHopSize=128`** (réglage de la démo MTG) divise le coût par ≈ 1,8 (15 → 8,3 s CPU), et l'embedding moyen
   reste quasi identique (cos ≥ 0,9997 sur 3/3 titres).
5. **Limiter la durée** est un mauvais levier. Avec bs64, 30 s coûtent autant que 60 s (1 lot dans les deux cas).
   Surtout, l'embedding moyen change nettement (cos 0,93 à 0,98) : on ne décrit plus le même objet.
6. **`resampleQuality=1`** (défaut MonoLoader) ajouterait 4 à 5 s CPU par titre (§1.1).

### 5.3 Threads (1 titre, 254 patches, hop 62, sous concurrence) [MES]

| Réglage | Mur | CPU |
|---|---|---|
| défaut (4 intra, 4 inter) | 11,35 s | 15,21 s |
| `TF_NUM_INTRAOP_THREADS=1 TF_NUM_INTEROP_THREADS=1` | 12,40 s | **12,00 s** |
| `TF_NUM_INTRAOP_THREADS=2 TF_NUM_INTEROP_THREADS=1` | 10,23 s | 14,87 s |
| `TF_NUM_INTRAOP_THREADS=4 TF_NUM_INTEROP_THREADS=1` | 10,10 s | 15,79 s |

Sur ce CPU à 2 cœurs physiques, sous charge, le multithreading gagne au mieux ≈ 10 % de temps mur et coûte ≈ 25 %
de CPU en plus. **Non mesuré** : le comportement hors concurrence, car l'entraînement occupait la machine pendant
toutes les mesures.

---

## 6. Licence

- **Modèles MTG : CC BY-NC-SA 4.0.** [MODELS] : « All the models created by the MTG are licensed under CC BY-NC-SA 4.0
  and are also available under proprietary license upon request. »
- **Incohérence dans le fichier [LICENSE]** : il annonce en titre « Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 »,
  mais renvoie vers `http://creativecommons.org/licenses/by-nc-sa/4.0/legalcode` et décrit la liberté « Adapt ». Le
  texte juridique lié et la page [MODELS] disent tous deux BY-NC-SA. Pour lever le doute, il faudrait demander au MTG
  (contact indiqué dans [LICENSE] : https://www.upf.edu/web/mtg/contact).
- **Obligations** [CC] :
  - Attribution (§3(a)(1)). Elle s'applique « **If You Share** the Licensed Material (including in modified form) » :
    identifier les créateurs, garder l'avis de copyright, l'avis de licence, l'avis d'exclusion de garantie, fournir
    l'URI, signaler les modifications. « Share » désigne la mise à disposition du public (§1).
  - NonCommercial (§1) : « not primarily intended for or directed towards commercial advantage or monetary compensation ».
  - ShareAlike (§3(b)) : les *Adapted Material* partagés doivent l'être sous BY-NC-SA ou une licence compatible.
- **Non documenté, à trancher par Victor** : savoir si les vecteurs, les prédictions ou un classifieur « couleur »
  entraîné sur ces vecteurs constituent un « Adapted Material ». C'est une question juridique qu'aucune source
  consultée ne tranche. Même chose pour le caractère non commercial d'AubeSonore : il dépend de son modèle
  (publicité, dons…), inconnu ici.
- **Attribution à prévoir, prudente** (texte à reprendre de [LICENSE] et [J-EMB]) : « Discogs-EffNet et têtes de
  classification © Universitat Pompeu Fabra (Music Technology Group), CC BY-NC-SA 4.0, https://essentia.upf.edu/models/ ».
  Pour une publication de recherche, [MODELS] demande de citer Alonso-Jiménez et al. 2022 (champ `citation` de [J-EMB]).
- **La bibliothèque Essentia** est sous AGPL v3 (en-tête de chaque source, par exemple
  `tensorflowpredicteffnetdiscogs.cpp:1-18`), licence distincte de celle des modèles.

---

## 7. Écarts entre `EffnetEmbedder` et l'usage officiel

| # | Point | `radio/analyze/embedders.py` | Usage officiel | Verdict |
|---|---|---|---|---|
| 1 | Graphe | `discogs-effnet-bs64-1.pb` | idem [MODELS] ; fichier identique à l'officiel (§1.3) | conforme |
| 2 | Nœud de sortie | `output="PartitionedCall:1"` | idem [MODELS][J-EMB] | conforme |
| 3 | Chargement | `MonoLoader(filename, sampleRate=16000, resampleQuality=4)` | mêmes valeurs [MODELS] | conforme |
| 4 | Cycle de vie du MonoLoader | un neuf par fichier, puis détruit | un seul, `configure()` par fichier ([DEMO] l. 42/87 ; [#1457]) | **écart** : cause des 21 M lignes d'avertissement (§4) |
| 5 | `patchHopSize` | 62 (défaut) | 62 dans les extraits de [MODELS] ; 128 dans la démo « for efficiency » | conforme au défaut ; 128 possible et 1,8× moins cher (§5.2) |
| 6 | `batchSize` / `lastBatchMode` | défauts (64 / `same`) | défauts ; obligatoires pour le graphe bs64 | conforme ; coût arrondi au lot de 64 (§1.2) |
| 7 | Agrégation | `frames.mean(axis=0)` puis L2 | **non documenté** pour l'embedding ; moyenne documentée pour les *prédictions* (§2) | convention maison, à assumer comme telle |
| 8 | Têtes | aucune | TF2D sur la matrice par patch, puis moyenne des prédictions | à ajouter ; ne pas les appliquer sur l'embedding moyenné (§3.2) |
| 9 | Métadonnées | aucun `.json` lu | chaque modèle a un `.json` (classes, nœuds) [TUTO][J-HEAD] | **écart** : l'ordre des classes change d'une tête à l'autre (§3.3) |
| 10 | Threads | défaut TF (4 intra + 4 inter) | non documenté côté Essentia ; variables TF 2.5 disponibles | réglage à faire (§5.3) |
| 11 | Parallélisme | séquentiel, verrou au chargement seulement | algorithmes non thread-safe ([FAQ], [#1268]) | conforme (aucun appel concurrent) |
| 12 | Fichier très court (< 128 trames ≈ 2 s) | `frames.shape[0]==0` → `None` | l'algorithme ne rend aucun patch (`lastPatchMode="discard"`) | conforme |

---

## Recommandations pour le plan 2

1. **Chaîne d'embedding à adopter** (une seule instance de chaque algorithme par processus) :
   ```python
   loader = MonoLoader()                                     # créé une fois
   effnet = TensorflowPredictEffnetDiscogs(
       graphFilename="models/discogs-effnet-bs64-1.pb",
       output="PartitionedCall:1",
       patchHopSize=128,
   )
   # par fichier :
   loader.configure(filename=path, sampleRate=16000, resampleQuality=4)
   patches = effnet(loader())                                 # [n, 1280]
   ```
   - Graphe bs64 `.pb`, nœud `PartitionedCall:1`, 16 kHz, `resampleQuality=4` : chaîne officielle
     (§1.1, [MODELS], [J-EMB]). bs1, bs512 et ONNX sont écartés faute de chaîne documentée ou d'algorithme
     Essentia (§1.3).
   - `patchHopSize=128` : réglage de la démo MTG (§5.1). Mesuré à 1,8× moins cher pour un embedding moyen quasi
     identique (cos ≥ 0,9997, §5.2). Les 2 410 vecteurs `effnet` en cache ont été calculés en hop 62. Pour ne pas
     mélanger les deux réglages dans un même classifieur, changer la clé de cache (nom d'embedder versionné) et tout
     recalculer. Coût estimé à partir des mesures : ≈ 8,3 s CPU par titre, **non mesuré** hors concurrence.
2. **Vecteur de titre** : moyenne des patches, puis L2, à documenter dans le code comme **convention maison** et non
   comme recommandation MTG (§2).
3. **Têtes** : les appliquer à la **matrice par patch**, puis moyenner les prédictions (§3.2 ; [DEMO] l. 95-97 ;
   [P22 §4.4]). Lire l'indice de chaque classe dans le `.json` officiel, jamais en dur (§3.3). Fichiers à télécharger
   (`.pb` **et** `.json`), préfixe `https://essentia.upf.edu/models/classification-heads/` :
   - `danceability/danceability-discogs-effnet-1.{pb,json}`
   - `mood_party/mood_party-discogs-effnet-1.{pb,json}`
   - `mood_happy/mood_happy-discogs-effnet-1.{pb,json}`
   - `mood_relaxed/mood_relaxed-discogs-effnet-1.{pb,json}`
   - `mood_sad/mood_sad-discogs-effnet-1.{pb,json}`
   - `mood_aggressive/mood_aggressive-discogs-effnet-1.json` (`.pb` déjà présent et identique)
   - `voice_instrumental/voice_instrumental-discogs-effnet-1.json` (`.pb` déjà présent et identique)
   - `approachability/approachability_regression-discogs-effnet-1.{pb,json}` : sortie continue `model/Identity`
   - `engagement/engagement_regression-discogs-effnet-1.{pb,json}` : sortie continue `model/Identity`
   - `genre_discogs400` : déjà complet (`.pb` + `.json` identiques à l'officiel) ; `input="serving_default_model_Placeholder"`,
     `output="PartitionedCall:0"`
   - et `https://essentia.upf.edu/models/feature-extractors/discogs-effnet/discogs-effnet-bs64-1.json`
     (pour lire le schéma au lieu de le coder en dur).

   Arousal/valence : aucune tête discogs-effnet n'existe (§3.3). Les garder imposerait MusiCNN en second modèle.
   À écarter, ou à rediscuter explicitement avec Victor.
4. **Avertissement** : corriger la cause (MonoLoader unique + `configure()`, §4.2). Ne pas désactiver
   `essentia.log.warningActive`. Test d'acceptation : 0 ligne « No network created » sur 3 fichiers, comme mesuré.
5. **Performance, threads** : lancer l'analyse de fond avec `TF_NUM_INTRAOP_THREADS=1` et `TF_NUM_INTEROP_THREADS=1`,
   posés par l'unité systemd et non par le code, avant l'import de TensorFlow ([TF25] lit ces valeurs une seule fois,
   `static`). Mesuré : −21 % de CPU par titre pour +9 % de temps mur sous charge (§5.3), et un seul cœur occupé, ce
   qui laisse la place à Plex et à l'antenne. Pour paralléliser plus tard, passer par des **processus** et non des
   threads ([FAQ], [#1268]). Validation à prévoir : remesurer hors entraînement, machine au repos (**non mesuré**
   aujourd'hui).
6. **Ne pas limiter la durée analysée** pour gagner du temps : sans gain avec bs64 sous 64 patches, et l'embedding
   change (cos 0,93 à 0,98, §5.2). Le levier propre est `patchHopSize=128`.
7. **Licence** : ajouter l'attribution UPF/MTG CC BY-NC-SA 4.0 là où le projet expose quoi que ce soit issu des
   modèles, et faire trancher par Victor le caractère non commercial d'AubeSonore (§6).
