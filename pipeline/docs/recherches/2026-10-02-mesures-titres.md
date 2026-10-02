# Mesures de chaque titre à l'antenne, pour l'enchaînement — 2026-10-02

Question : quelles mesures donner au planificateur (`2026-10-02-cycle-de-vie.md` §6) pour
remplir la grille horaire (énergie, tempo, dansabilité) et ordonner chaque heure en fil qui
dérive ? Contrainte : outils existants et officiels, mesures sur le fichier d'antenne.

## Sources

| Réf. | Source (consultée le 2026-10-02) |
|---|---|
| [MODELS] | https://essentia.upf.edu/models.html, sections « Arousal/valence DEAM », « Danceability », « Tempo estimation » |
| [LISTING] | listings https://essentia.upf.edu/models/classification-heads/{danceability,deam}/, `.../feature-extractors/musicnn/`, `.../tempo/tempocnn/` |
| [JSON] | les `.json` officiels de chaque modèle retenu (classes, nœuds, jeux de données, métriques) |
| [INST] | docstrings d'Essentia installé dans `.venv` (`TensorflowPredictMusiCNN`, `TempoCNN`) |
| [TEMPO] | H. Schreiber, M. Müller, « A Single-Step Approach to Musical Tempo Estimation Using a Convolutional Neural Network », ISMIR 2018, §4 (https://zenodo.org/record/1492353/files/141_Paper.pdf) |
| [EFFNET] | `2026-09-23-essentia-effnet.md` §3.3 (catalogue des têtes sur Discogs-EffNet) |

## 1. Énergie : arousal DEAM, sur MSD-MusiCNN

- **Aucune tête arousal/valence n'existe sur Discogs-EffNet** [EFFNET §3.3] : les dossiers
  `deam/`, `emomusic/` et `muse/` ne contiennent que des variantes `msd-musicnn` et
  `audioset-vggish` [LISTING].
- **Retenu : `deam-msd-musicnn-2`**, régression valence et arousal sur l'échelle [1, 9] [MODELS].
  Le `.json` déclare les classes `["valence", "arousal"]`, la sortie `model/Identity`, le jeu
  DEAM (1 802 titres), et pour l'arousal une corrélation de Pearson de 0,773 [JSON]. L'arousal
  est la dimension d'activation du modèle valence-arousal : c'est l'« énergie » de la grille.
  La valence vient avec, au même coût.
- Écarté : bâtir une « énergie » à partir des humeurs EffNet (party, aggressive, relaxed). Ce
  serait une formule maison, alors qu'une mesure entraînée pour ça existe.

## 2. Dansabilité : sur le même réseau

`danceability-msd-musicnn-1` existe [LISTING] : classes `["danceable", "not_danceable"]`, sortie
`model/Softmax`, 306 titres, précision normalisée de 0,95 en validation croisée [JSON]. On garde
ainsi **un seul réseau d'embedding** (MSD-MusiCNN, 3,2 Mo, 200 dimensions en sortie
`model/dense/BiasAdd` [JSON]) pour les deux têtes, au lieu d'EffNet pour l'une et de MusiCNN pour
l'autre. L'indice de la classe positive se lit dans le `.json`, jamais en dur [EFFNET §3.3].

## 3. Tempo : TempoCNN

- `deeptemp-k16-3` [MODELS] : audio à 11 025 Hz, un tempo local toutes les ~6 s, un tempo
  global par vote majoritaire, que la doc recommande pour un tempo constant [INST].
- Mesuré : sur un titre à 85 bpm, les tempos locaux du début valaient 85, 168, 84… Le vote sur
  les ~5 valeurs d'un début ou d'une fin peut donc tomber sur l'octave. Les valeurs à un
  facteur 2 ou 3 du tempo du titre, à 4 % près, y sont ramenées : c'est exactement la tolérance
  d'« Accuracy2 », la mesure d'usage pour l'évaluation des tempos [TEMPO §4]. Après correction :
  85, 84, 85.
- RhythmExtractor2013 n'est pas retenu : TempoCNN est l'estimateur publié par MTG dans le même
  catalogue, et il donne directement les tempos locaux du début et de la fin.

## 4. Début, fin, titre entier

Une transition se joue entre la fin d'un titre et le début du suivant. Chaque mesure est donc
donnée sur le titre entier, sur ses 30 premières et sur ses 30 dernières secondes. Les
prédictions par patch sont réparties régulièrement sur la durée : le nombre de patches d'un
bord se déduit de leur nombre total. Agrégation par moyenne des prédictions par patch,
l'usage officiel [EFFNET §3.2].

## 5. Mesures (3 vrais fichiers de `antenne/`, machine partagée, charge ~6)

| Réglage | Temps par titre | Moyennes (dansabilité, arousal) sur 2 titres |
|---|---|---|
| patches MusiCNN au pas par défaut (93 trames, recouvrement) | 35 à 50 s | 0,97 / 5,29 ; 0,75 / 4,84 |
| patches sans recouvrement (187 trames, ~3 s) | 17 à 24 s | 0,97 / 5,31 ; 0,74 / 4,82 |

Mêmes moyennes, pour moitié moins de calcul : on garde le pas de 187. Code final : 16,6 et
17,7 s par titre (un fil TensorFlow, `nice`), plus ~60 s de chargement des modèles au premier
titre. Rattrapage des 341 titres à l'antenne : ~1 h 40. Passe hebdomadaire (~140 entrées) :
~40 min.

## 6. Licences et épinglage

- MusiCNN et ses têtes : modèles MTG, CC BY-NC-SA 4.0 [MODELS] ; même régime que Discogs-EffNet
  (`2026-09-23-essentia-effnet.md` §7). TempoCNN : AGPL v3 (fichier `LICENSE` du dossier
  `tempo/tempocnn/`), comme la bibliothèque Essentia.
- Sommes SHA-256 des fichiers téléchargés le 2026-10-02 depuis https://essentia.upf.edu/models/,
  vérifiées à chaque démarrage (`radio/signals/features.py`) :

| Fichier | SHA-256 |
|---|---|
| `msd-musicnn-1.pb` | `cdea0722…4f3e` |
| `danceability-msd-musicnn-1.pb` / `.json` | `874a4b86…b95e` / `9ec56f2b…2b48` |
| `deam-msd-musicnn-2.pb` / `.json` | `beb5eeb0…b371` / `079df8d5…3c58` |
| `deeptemp-k16-3.pb` | `21c32833…e3b3` |
