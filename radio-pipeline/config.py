"""
AubeSonore Radio Configuration
Single source of truth for moods, dayparts and filtering rules.

Dayparting approach: tracks are routed to playlists based on time of day
and their detected mood/energy level.
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict

# Type definitions
MoodType = Literal["Energetic", "Intense", "Chill", "Melancholic"]
DaypartType = Literal["Morning_Energy", "Afternoon_Mix", "Evening_Relax", "Night_Discovery"]
ArousalLevel = Literal["high", "low"]
ValenceType = Literal["positive", "negative"]


class MoodConfig(TypedDict):
    """Configuration for a mood category."""
    enabled: bool
    description: str
    arousal: ArousalLevel
    valence: ValenceType


class DaypartConfig(TypedDict):
    """Configuration for a daypart playlist."""
    enabled: bool
    schedule: str  # Human-readable schedule
    start_hour: int  # 24h format
    end_hour: int  # 24h format
    description: str


class AudioFilters(TypedDict):
    """Audio filtering rules."""
    bpm_min: int | None
    bpm_max: int | None
    energy_max: float | None
    duration_max: int | None  # Maximum duration in seconds


class RotationConfig(TypedDict):
    """Rotation/library management settings."""
    max_tracks: int  # Maximum tracks in library
    min_age_days: int  # Don't delete tracks younger than this


# =============================================================================
# MOOD CONFIGURATION (for analysis)
# =============================================================================
# Each mood is defined by its quadrant in the Valence-Arousal model:
#   - Arousal: energy level (high=energetic, low=calm)
#   - Valence: positivity (positive=happy, negative=dark)
#
# Set enabled=False to reject tracks of that mood (won't be uploaded)

MOODS: dict[MoodType, MoodConfig] = {
    "Energetic": {
        "enabled": True,
        "description": "Upbeat, happy, dynamic (high energy + positive)",
        "arousal": "high",
        "valence": "positive",
    },
    "Intense": {
        "enabled": True,
        "description": "Punk, rock, aggressive (high energy + negative)",
        "arousal": "high",
        "valence": "negative",
    },
    "Chill": {
        "enabled": True,
        "description": "Relaxed, lounge, ambient (low energy + positive)",
        "arousal": "low",
        "valence": "positive",
    },
    "Melancholic": {
        "enabled": True,
        "description": "Emotional, introspective, sad (low energy + negative)",
        "arousal": "low",
        "valence": "negative",
    },
}

# =============================================================================
# DAYPART CONFIGURATION (for playlists)
# =============================================================================
# Professional radio approach: playlists scheduled by time of day
# Each track is assigned to dayparts based on its mood

DAYPARTS: dict[DaypartType, DaypartConfig] = {
    "Morning_Energy": {
        "enabled": True,
        "schedule": "06:00 - 12:00",
        "start_hour": 6,
        "end_hour": 12,
        "description": "Energetic start to the day - upbeat and dynamic tracks",
    },
    "Afternoon_Mix": {
        "enabled": True,
        "schedule": "12:00 - 18:00",
        "start_hour": 12,
        "end_hour": 18,
        "description": "Varied mix for work hours - all moods in rotation",
    },
    "Evening_Relax": {
        "enabled": True,
        "schedule": "18:00 - 00:00",
        "start_hour": 18,
        "end_hour": 0,
        "description": "Wind down - chill and emotional tracks",
    },
    "Night_Discovery": {
        "enabled": True,
        "schedule": "00:00 - 06:00",
        "start_hour": 0,
        "end_hour": 6,
        "description": "Late night vibes - energetic and intense for night owls",
    },
}

# =============================================================================
# MOOD TO DAYPART MAPPING
# =============================================================================
# Which daypart playlists should receive tracks of each mood
# A track can be assigned to multiple dayparts

MOOD_TO_DAYPARTS: dict[MoodType, list[DaypartType]] = {
    "Energetic": ["Morning_Energy", "Afternoon_Mix", "Night_Discovery"],
    "Intense": ["Morning_Energy", "Afternoon_Mix", "Night_Discovery"],
    "Chill": ["Afternoon_Mix", "Evening_Relax"],
    "Melancholic": ["Afternoon_Mix", "Evening_Relax"],
}

# =============================================================================
# AUDIO FILTERS (additional rejection rules)
# =============================================================================
# Tracks outside these ranges will be rejected
# Set to None to disable a filter

AUDIO_FILTERS: AudioFilters = {
    "bpm_min": None,      # Disabled for now
    "bpm_max": None,      # Disabled for now
    "energy_max": None,   # Disabled for now
    "duration_max": 360,  # 6 minutes max
}

# =============================================================================
# ROTATION CONFIGURATION (library management)
# =============================================================================
# Controls how tracks are rotated to maintain freshness while ensuring
# each track has time to be played before removal.

ROTATION: RotationConfig = {
    "max_tracks": 450,    # Maximum tracks in AzuraCast library
    "min_age_days": 7,    # Never delete tracks younger than 7 days
}


# =============================================================================
# HELPERS
# =============================================================================

def get_enabled_moods() -> list[MoodType]:
    """Return list of enabled mood names."""
    return [name for name, config in MOODS.items() if config["enabled"]]


def get_enabled_dayparts() -> list[DaypartType]:
    """Return list of enabled daypart names."""
    return [name for name, config in DAYPARTS.items() if config["enabled"]]


def get_dayparts_for_mood(mood_name: str) -> list[DaypartType]:
    """
    Get daypart playlists for a mood.

    Args:
        mood_name: Name of the mood.

    Returns:
        List of daypart names to assign the track to.
    """
    if mood_name not in MOOD_TO_DAYPARTS:
        return []
    # Filter to only enabled dayparts
    return [dp for dp in MOOD_TO_DAYPARTS[mood_name] if DAYPARTS[dp]["enabled"]]  # type: ignore[literal-required]


def is_mood_enabled(mood_name: str) -> bool:
    """
    Check if a mood is enabled.

    Args:
        mood_name: Name of the mood.

    Returns:
        True if mood exists and is enabled.
    """
    return mood_name in MOODS and MOODS[mood_name]["enabled"]  # type: ignore[literal-required]


def should_reject_track(features: dict[str, Any]) -> tuple[bool, str | None]:
    """
    Check if a track should be rejected based on filters.

    Args:
        features: Track features dictionary with keys:
            - mood: str | None
            - bpm: int
            - energy: float

    Returns:
        Tuple of (reject: bool, reason: str or None)
    """
    # Check mood enabled
    mood = features.get("mood")
    if mood and not is_mood_enabled(mood):
        return True, f"mood '{mood}' is disabled"

    # Check BPM range (if filters are set)
    bpm = features.get("bpm", 0)
    if AUDIO_FILTERS["bpm_min"] is not None and bpm < AUDIO_FILTERS["bpm_min"]:
        return True, f"BPM too low ({bpm})"
    if AUDIO_FILTERS["bpm_max"] is not None and bpm > AUDIO_FILTERS["bpm_max"]:
        return True, f"BPM too high ({bpm})"

    # Check energy (if filter is set)
    energy = features.get("energy", 0.0)
    if AUDIO_FILTERS["energy_max"] is not None and energy > AUDIO_FILTERS["energy_max"]:
        return True, f"too aggressive (energy={energy:.2f})"

    # Check duration (if filter is set)
    duration = features.get("duration", 0)
    if AUDIO_FILTERS["duration_max"] is not None and duration > AUDIO_FILTERS["duration_max"]:
        minutes = duration // 60
        seconds = duration % 60
        return True, f"too long ({minutes}:{seconds:02d})"

    return False, None
