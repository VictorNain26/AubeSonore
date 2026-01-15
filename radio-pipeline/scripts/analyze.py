#!/usr/bin/env python3
"""
Audio analysis script using Essentia-TensorFlow.
- Mood classification with pre-trained MTG models
- BPM extraction
Reads existing metadata from ID3 tags (set by download.py from HypeMachine).
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Literal, TypedDict

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PIPELINE_DIR = SCRIPT_DIR.parent
MODELS_DIR = PIPELINE_DIR / "models"

# Type definitions
MoodType = Literal["Energetic", "Intense", "Chill", "Melancholic"]


class AudioFeatures(TypedDict):
    """Audio analysis features."""
    bpm: int
    duration: int
    mood: MoodType
    mood_aggressive: float
    mood_happy: float
    mood_relaxed: float
    mood_sad: float


class MoodScores(TypedDict):
    """Raw mood classifier scores."""
    aggressive: float
    happy: float
    relaxed: float
    sad: float


def check_dependencies() -> bool:
    """Check if required dependencies are installed."""
    try:
        import essentia  # noqa: F401
        import essentia.standard  # noqa: F401
        from mutagen.id3 import ID3  # noqa: F401
        return True
    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        logger.error("Install with: pip install essentia-tensorflow mutagen")
        return False


def check_models() -> bool:
    """Check if Essentia models are downloaded."""
    required_models = [
        "msd-musicnn-1.pb",
        "mood_aggressive-msd-musicnn-1.pb",
        "mood_happy-msd-musicnn-1.pb",
        "mood_relaxed-msd-musicnn-1.pb",
        "mood_sad-msd-musicnn-1.pb",
    ]
    missing = [m for m in required_models if not (MODELS_DIR / m).exists()]
    if missing:
        logger.error(f"Missing models: {', '.join(missing)}")
        logger.error("Run: ./scripts/download_models.sh")
        return False
    return True


def read_existing_tags(filepath: str) -> tuple[str | None, str | None]:
    """
    Read artist and title from existing ID3 tags.

    Args:
        filepath: Path to audio file.

    Returns:
        Tuple of (artist, title) or (None, None) on error.
    """
    try:
        from mutagen.id3 import ID3
        tags = ID3(filepath)
        artist = str(tags.get('TPE1', ['Unknown'])[0])
        title = str(tags.get('TIT2', ['Unknown'])[0])
        return artist, title
    except Exception:
        return None, None


def parse_filename(filepath: str) -> tuple[str, str]:
    """
    Fallback: extract artist and title from filename.

    Args:
        filepath: Path to audio file.

    Returns:
        Tuple of (artist, title).
    """
    name = Path(filepath).stem

    if " - " in name:
        parts = name.split(" - ", 1)
        return parts[0].strip(), parts[1].strip()
    return "Unknown", name.strip()


def get_mood_scores(embeddings, models: dict) -> MoodScores:
    """
    Get mood scores from embeddings using pre-trained classifiers.

    Args:
        embeddings: MusiCNN embeddings.
        models: Dictionary of loaded TensorFlow models.

    Returns:
        Dictionary of mood scores (0-1).
    """
    import numpy as np

    scores: MoodScores = {
        "aggressive": 0.0,
        "happy": 0.0,
        "relaxed": 0.0,
        "sad": 0.0,
    }

    for mood_name, model in models.items():
        predictions = model(embeddings)
        # Average predictions across all frames, take positive class
        score = float(np.mean(predictions[:, 0]))
        scores[mood_name] = score  # type: ignore[literal-required]

    return scores


def classify_mood(scores: MoodScores, bpm: int) -> MoodType:
    """
    Classify mood based on classifier scores AND BPM.

    Uses intelligent combination of Essentia mood classifiers and tempo:
    - Aggressive + any BPM → Intense (punk, rock, metal)
    - Sad + slow BPM → Melancholic (ballads, sad songs)
    - Happy + fast BPM → Energetic (dance, pop, upbeat)
    - Relaxed OR slow BPM → Chill (lounge, ambient)

    Args:
        scores: Dictionary of mood scores (0-1).
        bpm: Tempo in beats per minute.

    Returns:
        Final mood classification.
    """
    # Thresholds
    AGGRESSIVE_THRESHOLD = 0.45
    SAD_THRESHOLD = 0.5
    RELAXED_THRESHOLD = 0.5
    HAPPY_THRESHOLD = 0.5

    # BPM boundaries (based on music theory research)
    BPM_SLOW = 100      # Below = slow/calm
    BPM_MODERATE = 115  # Transition zone
    BPM_FAST = 125      # Above = fast/energetic

    # 1. Aggressive tracks → Intense (regardless of tempo)
    if scores["aggressive"] > AGGRESSIVE_THRESHOLD:
        return "Intense"

    # 2. Sad + not relaxed + slow/moderate tempo → Melancholic
    if scores["sad"] > SAD_THRESHOLD and scores["relaxed"] < RELAXED_THRESHOLD:
        if bpm < BPM_FAST:
            return "Melancholic"

    # 3. Fast tempo + happy → Energetic
    if bpm >= BPM_FAST and scores["happy"] > HAPPY_THRESHOLD:
        return "Energetic"

    # 4. Very fast tempo (dance music) → Energetic
    if bpm >= 130:
        return "Energetic"

    # 5. Relaxed OR slow tempo → Chill
    if scores["relaxed"] > RELAXED_THRESHOLD or bpm < BPM_SLOW:
        return "Chill"

    # 6. Moderate tempo: decide based on happy vs sad
    if scores["happy"] > scores["sad"]:
        return "Energetic" if bpm >= BPM_MODERATE else "Chill"
    else:
        return "Melancholic" if bpm < BPM_MODERATE else "Intense"


def analyze_audio(filepath: str) -> AudioFeatures | None:
    """
    Analyze audio using Essentia-TensorFlow models.

    Args:
        filepath: Path to audio file.

    Returns:
        Dictionary of audio features or None on error.
    """
    from essentia.standard import (
        MonoLoader,
        RhythmExtractor2013,
        TensorflowPredict2D,
        TensorflowPredictMusiCNN,
    )

    try:
        # Load audio at 16kHz for mood models
        audio = MonoLoader(filename=filepath, sampleRate=16000, resampleQuality=4)()
        duration = int(len(audio) / 16000)

        # Load audio at 44.1kHz for BPM detection
        audio_44k = MonoLoader(filename=filepath, sampleRate=44100)()

        # Extract BPM
        rhythm_extractor = RhythmExtractor2013(method="multifeature")
        bpm, *_ = rhythm_extractor(audio_44k)
        bpm = int(round(bpm))

        # Load embedding model
        embedding_model = TensorflowPredictMusiCNN(
            graphFilename=str(MODELS_DIR / "msd-musicnn-1.pb"),
            output="model/dense/BiasAdd"
        )
        embeddings = embedding_model(audio)

        # Load mood classifiers
        mood_models = {}
        for mood in ["aggressive", "happy", "relaxed", "sad"]:
            mood_models[mood] = TensorflowPredict2D(
                graphFilename=str(MODELS_DIR / f"mood_{mood}-msd-musicnn-1.pb"),
                output="model/Softmax"
            )

        # Get mood scores
        scores = get_mood_scores(embeddings, mood_models)

        # Classify mood (using scores + BPM)
        mood = classify_mood(scores, bpm)

        return {
            "bpm": bpm,
            "duration": duration,
            "mood": mood,
            "mood_aggressive": round(scores["aggressive"], 3),
            "mood_happy": round(scores["happy"], 3),
            "mood_relaxed": round(scores["relaxed"], 3),
            "mood_sad": round(scores["sad"], 3),
        }

    except Exception as e:
        logger.error(f"  Analysis error: {e}")
        return None


def write_tags(filepath: str, artist: str, title: str, features: AudioFeatures) -> bool:
    """
    Write metadata and analysis features as ID3 tags.

    Args:
        filepath: Path to audio file.
        artist: Artist name.
        title: Track title.
        features: Analysis features to embed.

    Returns:
        True if successful, False otherwise.
    """
    try:
        from mutagen.id3 import ID3, ID3NoHeaderError, TBPM, TIT2, TPE1, TXXX

        try:
            tags = ID3(filepath)
        except ID3NoHeaderError:
            tags = ID3()

        # Basic metadata
        tags.delall('TPE1')
        tags.add(TPE1(encoding=3, text=artist))

        tags.delall('TIT2')
        tags.add(TIT2(encoding=3, text=title))

        # BPM (standard tag)
        tags.delall('TBPM')
        tags.add(TBPM(encoding=3, text=str(features['bpm'])))

        # Custom tags for analysis
        custom_tags = {
            'MOOD': features['mood'],
            'DURATION': str(features['duration']),
            'MOOD_AGGRESSIVE': str(features['mood_aggressive']),
            'MOOD_HAPPY': str(features['mood_happy']),
            'MOOD_RELAXED': str(features['mood_relaxed']),
            'MOOD_SAD': str(features['mood_sad']),
        }

        for tag_name, value in custom_tags.items():
            tags.delall(f'TXXX:{tag_name}')
            tags.add(TXXX(encoding=3, desc=tag_name, text=str(value)))

        tags.save(filepath)
        return True
    except Exception as e:
        logger.error(f"  Failed to write tags: {e}")
        return False


def process_file(filepath: str) -> bool:
    """
    Process a single audio file.

    Args:
        filepath: Path to audio file.

    Returns:
        True if successful, False otherwise.
    """
    filename = Path(filepath).name
    logger.info(f"\n{filename}")

    if not Path(filepath).exists():
        logger.error("  ERROR: File not found")
        return False

    # Read metadata
    artist, title = read_existing_tags(filepath)
    if not artist or artist == "Unknown":
        artist, title = parse_filename(filepath)
        logger.info(f"  Metadata: {artist} - {title} (from filename)")
    else:
        logger.info(f"  Metadata: {artist} - {title}")

    # Analyze audio
    logger.info("  Analyzing with Essentia...")
    features = analyze_audio(filepath)

    if not features:
        return False

    # Display results
    duration_min = features['duration'] // 60
    duration_sec = features['duration'] % 60
    logger.info(f"  → Duration: {duration_min}:{duration_sec:02d} | BPM: {features['bpm']}")
    logger.info(f"  → Aggressive: {features['mood_aggressive']:.2f} | Happy: {features['mood_happy']:.2f}")
    logger.info(f"  → Relaxed: {features['mood_relaxed']:.2f} | Sad: {features['mood_sad']:.2f}")
    logger.info(f"  → Mood: {features['mood']}")

    # Write tags
    if not write_tags(filepath, artist, title, features):
        return False

    return True


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    if not check_dependencies():
        return 1

    if not check_models():
        return 1

    # Get files to process
    if len(sys.argv) >= 2:
        files = [Path(f) for f in sys.argv[1:]]
    else:
        downloads_dir = PIPELINE_DIR / "downloads"

        if not downloads_dir.exists():
            logger.error("No downloads folder found")
            return 1

        files = list(downloads_dir.glob("*.mp3"))

    if not files:
        logger.info("No MP3 files found")
        return 0

    logger.info("=== Audio Analysis (Essentia-TensorFlow) ===")
    logger.info(f"Files: {len(files)}")

    success_count = 0
    for filepath in sorted(files):
        if process_file(str(filepath)):
            success_count += 1

    logger.info(f"\n=== Done ({success_count}/{len(files)} successful) ===")
    return 0 if success_count == len(files) else 1


if __name__ == "__main__":
    sys.exit(main())
