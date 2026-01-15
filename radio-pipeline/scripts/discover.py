#!/usr/bin/env python3
"""
HypeMachine discovery via API.
Fetches popular tracks with cover art URLs.
"""

from __future__ import annotations

import json
import logging
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, TypedDict

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s"
)
logger = logging.getLogger(__name__)

# Constants
API_URL = "https://api.hypem.com/v2/popular"
MAX_TRACKS = 30
REQUEST_TIMEOUT = 30


class Track(TypedDict):
    """Track data structure."""
    id: str
    artist: str
    title: str
    cover: str | None
    search: str


def fetch_tracks() -> list[dict[str, Any]]:
    """
    Fetch tracks from HypeMachine API.

    Returns:
        List of track dictionaries from API response.
    """
    url = f"{API_URL}?mode=now&count={MAX_TRACKS}"
    headers = {"User-Agent": "Mozilla/5.0"}

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data if isinstance(data, list) else []
    except urllib.error.URLError as e:
        logger.error(f"Network error: {e.reason}")
        return []
    except urllib.error.HTTPError as e:
        logger.error(f"HTTP error {e.code}: {e.reason}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON response: {e}")
        return []
    except TimeoutError:
        logger.error("Request timed out")
        return []


def format_tracks(raw_tracks: list[dict[str, Any]]) -> list[Track]:
    """
    Format raw API response into Track objects.

    Args:
        raw_tracks: Raw track data from API.

    Returns:
        List of formatted Track objects.
    """
    result: list[Track] = []

    for track in raw_tracks:
        artist = track.get("artist", "").strip()
        title = track.get("title", "").strip()

        if not artist or not title:
            continue

        result.append({
            "id": str(track.get("itemid", "")),
            "artist": artist,
            "title": title,
            "cover": track.get("thumb_url_large"),
            "search": f"{artist} - {title}"
        })

    return result


def save_tracks(tracks: list[Track], output_file: Path) -> bool:
    """
    Save tracks to JSON file.

    Args:
        tracks: List of tracks to save.
        output_file: Path to output JSON file.

    Returns:
        True if successful, False otherwise.
    """
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(tracks, f, indent=2, ensure_ascii=False)
        return True
    except OSError as e:
        logger.error(f"Failed to write file: {e}")
        return False


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    script_dir = Path(__file__).parent
    pipeline_dir = script_dir.parent
    output_file = pipeline_dir / "tracks-to-download.json"

    logger.info("=== HypeMachine Discovery ===")
    logger.info(f"Fetching {MAX_TRACKS} tracks...")

    raw_tracks = fetch_tracks()

    if not raw_tracks:
        logger.warning("No tracks found from API")
        return 1

    tracks = format_tracks(raw_tracks)

    if not tracks:
        logger.warning("No valid tracks after formatting")
        return 1

    if not save_tracks(tracks, output_file):
        return 1

    logger.info(f"Found {len(tracks)} tracks")

    # Display first 5 tracks
    for track in tracks[:5]:
        logger.info(f"  - {track['artist']} - {track['title']}")

    if len(tracks) > 5:
        logger.info(f"  ... and {len(tracks) - 5} more")

    logger.info(f"\nSaved to: {output_file}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
