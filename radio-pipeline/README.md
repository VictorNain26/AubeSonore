# Radio Pipeline

Pipeline de découverte musicale automatique pour AubeSonore Radio.

## Workflow

```
HypeMachine (API) → yt-dlp (YouTube) → Essentia-TensorFlow (analyse) → AzuraCast (diffusion)
```

## Fonctionnalités

- **Découverte** : Récupération automatique des tracks populaires via HypeMachine
- **Détection doublons** : Vérification contre la bibliothèque AzuraCast (artist + title)
- **Téléchargement** : Download via yt-dlp avec métadonnées et cover art
- **Analyse audio** : Classification par mood avec modèles MTG pré-entraînés (~97% accuracy)
- **Dayparting** : Assignation aux playlists par créneau horaire (approche radio professionnelle)
- **Rotation** : Gestion automatique de la taille de bibliothèque (FIFO avec protection)

## Classification des Moods

Utilise les modèles pré-entraînés MTG (Music Technology Group) via Essentia-TensorFlow:
- `mood_aggressive` - Détection de l'agressivité (~97% accuracy)
- `mood_happy` - Détection de la joie
- `mood_relaxed` - Détection de la relaxation
- `mood_sad` - Détection de la tristesse

### Classification intelligente (Mood + BPM)

| Mood | Critères | Exemples |
|------|----------|----------|
| Intense | Aggressive élevé (>0.45) | Punk, rock, metal |
| Melancholic | Sad élevé + BPM lent (<125) | Ballades, folk triste |
| Energetic | Happy élevé + BPM rapide (≥125) ou BPM très rapide (≥130) | Dance, pop, electro |
| Chill | Relaxed élevé ou BPM lent (<100) | Lounge, ambient, downtempo |

## Dayparting (Programmation Radio)

Approche professionnelle : les tracks sont assignées à des playlists par créneau horaire selon leur mood.

### Playlists par Daypart

| Playlist | Horaire | Moods | Description |
|----------|---------|-------|-------------|
| Morning_Energy | 06:00 - 12:00 | Energetic, Intense | Démarrage dynamique |
| Afternoon_Mix | 12:00 - 18:00 | Tous les moods | Mix varié pour le travail |
| Evening_Relax | 18:00 - 00:00 | Chill, Melancholic | Détente du soir |
| Night_Discovery | 00:00 - 06:00 | Energetic, Intense | Vibes nocturnes |

### Routage Mood → Daypart

```
Energetic    → Morning_Energy, Afternoon_Mix, Night_Discovery
Intense      → Morning_Energy, Afternoon_Mix, Night_Discovery
Chill        → Afternoon_Mix, Evening_Relax
Melancholic  → Afternoon_Mix, Evening_Relax
```

Chaque track peut être assignée à plusieurs playlists selon son mood.

## Installation

```bash
git clone git@github.com:VictorNain26/radio-pipeline.git
cd radio-pipeline
./scripts/setup.sh
```

## Configuration

```bash
cp .env.example .env
nano .env
```

Variables requises:
- `AZURACAST_URL` - URL du serveur AzuraCast
- `AZURACAST_API_KEY` - Clé API AzuraCast
- `AZURACAST_STATION_ID` - ID de la station (défaut: 1)

## Utilisation

### Pipeline complet
```bash
./run.sh
```

### Créer les playlists AzuraCast (avec scheduling)
```bash
./scripts/setup_playlists.sh
```

## Structure

```
radio-pipeline/
├── run.sh                  # Pipeline principal
├── config.py               # Configuration moods, dayparts et filtres
├── scripts/
│   ├── setup.sh            # Installation dépendances
│   ├── setup_playlists.sh  # Création playlists AzuraCast (scheduled)
│   ├── setup_cron.sh       # Installation cron job (3h quotidien)
│   ├── download_models.sh  # Téléchargement modèles Essentia
│   ├── discover.py         # HypeMachine API
│   ├── download.py         # yt-dlp + métadonnées
│   ├── download.sh         # Wrapper download
│   ├── analyze.py          # Analyse Essentia-TensorFlow (BPM, mood)
│   ├── analyze.sh          # Wrapper analyse
│   ├── classify.py         # Upload AzuraCast + rotation + routage daypart
│   └── upload.sh           # Wrapper upload
├── models/                 # Modèles Essentia pré-entraînés
├── downloads/              # Fichiers téléchargés
├── music/                  # Fichiers analysés (prêts pour upload)
├── archive/                # Historique des tracks
├── .env.example
└── README.md
```

## Détection des doublons

La détection des doublons utilise **AzuraCast comme source de vérité**:

1. Au démarrage du téléchargement, la bibliothèque AzuraCast est récupérée
2. Chaque track est comparée par `artist + title` (normalisé)
3. Les tracks déjà présents sont ignorés

**Avantage:** Un track supprimé par rotation peut revenir s'il redevient populaire sur HypeMachine.

## Rotation de la bibliothèque

Le pipeline gère automatiquement la taille de la bibliothèque AzuraCast:

- **Maximum 450 tracks** - Les plus anciennes sont supprimées pour faire place aux nouvelles
- **Protection 7 jours** - Un track ne peut pas être supprimé avant 7 jours (temps de passer à l'antenne)
- **FIFO** - First In, First Out (les plus anciens partent en premier)

Configuration dans `config.py`:

```python
ROTATION = {
    "max_tracks": 450,    # Maximum tracks in AzuraCast library
    "min_age_days": 7,    # Never delete tracks younger than 7 days
}
```

## Automatisation (Cron)

### Installation automatique

```bash
./scripts/setup_cron.sh
```

### Installation manuelle

```bash
# Exécuter le pipeline tous les jours à 3h
0 3 * * * cd /path/to/radio-pipeline && ./run.sh >> /var/log/radio-pipeline.log 2>&1
```

## Configuration avancée

Éditer `config.py` pour:
- Activer/désactiver des moods ou dayparts
- Modifier les horaires des dayparts
- Configurer le routage mood → daypart
- Configurer des filtres audio (BPM min/max, durée max, etc.)

### Exemple: Désactiver un daypart

```python
DAYPARTS = {
    "Morning_Energy": {"enabled": True, ...},
    "Afternoon_Mix": {"enabled": True, ...},
    "Evening_Relax": {"enabled": False, ...},  # Désactivé
    "Night_Discovery": {"enabled": True, ...},
}
```

### Exemple: Modifier le routage

```python
MOOD_TO_DAYPARTS = {
    "Energetic": ["Morning_Energy", "Afternoon_Mix"],  # Retiré Night_Discovery
    "Chill": ["Evening_Relax"],  # Uniquement le soir
    ...
}
```
