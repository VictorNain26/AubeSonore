#!/usr/bin/env python3
"""
Upload tracks to AzuraCast with daypart-based playlist assignment.
Reads mood from ID3 tags (set by analyze.py) and routes to daypart playlists.
Professional radio approach: tracks assigned to time-based playlists.
"""

from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, TypedDict

import requests
from mutagen.id3 import ID3

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import get_dayparts_for_mood, get_enabled_dayparts, should_reject_track, ROTATION
except ImportError:
    print("Error: config.py not found in pipeline root")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Constants
REQUEST_TIMEOUT = 30
UPLOAD_TIMEOUT = 180


class TrackFeatures(TypedDict):
    """Track features extracted from ID3 tags."""
    artist: str
    title: str
    bpm: int
    mood: str | None
    duration: int
    mood_aggressive: float
    mood_happy: float
    mood_relaxed: float
    mood_sad: float


class AzuraCastClient:
    """Client for AzuraCast API interactions."""

    def __init__(self, url: str, api_key: str, station_id: str) -> None:
        """
        Initialize AzuraCast client.

        Args:
            url: AzuraCast server URL.
            api_key: API key for authentication.
            station_id: Station ID.
        """
        self.url = url.rstrip("/")
        self.station_id = station_id
        self.headers = {"X-API-Key": api_key}

    def _api_get(self, endpoint: str) -> Any | None:
        """
        GET request to AzuraCast API.

        Args:
            endpoint: API endpoint (relative to station).

        Returns:
            JSON response or None on error.
        """
        try:
            response = requests.get(
                f"{self.url}/api/station/{self.station_id}/{endpoint}",
                headers=self.headers,
                timeout=REQUEST_TIMEOUT
            )
            if response.status_code == 200:
                return response.json()
            logger.debug(f"API GET {endpoint} failed: HTTP {response.status_code}")
            return None
        except requests.RequestException as e:
            logger.debug(f"API GET {endpoint} error: {e}")
            return None

    def _api_put(self, endpoint: str, data: dict[str, Any]) -> bool:
        """
        PUT request to AzuraCast API.

        Args:
            endpoint: API endpoint (relative to station).
            data: JSON data to send.

        Returns:
            True if successful.
        """
        try:
            response = requests.put(
                f"{self.url}/api/station/{self.station_id}/{endpoint}",
                headers={**self.headers, "Content-Type": "application/json"},
                json=data,
                timeout=REQUEST_TIMEOUT
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def get_playlists(self) -> dict[str, int]:
        """
        Get playlist name to ID mapping.

        Returns:
            Dictionary of playlist names to IDs.
        """
        data = self._api_get("playlists")
        if data:
            return {p["name"]: p["id"] for p in data}
        return {}

    def get_existing_paths(self) -> set[str]:
        """
        Get set of existing file paths.

        Returns:
            Set of lowercase file paths.
        """
        data = self._api_get("files")
        if data:
            return {f["path"].lower() for f in data}
        return set()

    def get_all_files(self) -> list[dict[str, Any]]:
        """
        Get all files with metadata.

        Returns:
            List of file dictionaries with id, path, mtime.
        """
        data = self._api_get("files")
        return data if data else []

    def delete_file(self, file_id: int) -> bool:
        """
        Delete a file from AzuraCast.

        Args:
            file_id: File ID to delete.

        Returns:
            True if successful.
        """
        try:
            response = requests.delete(
                f"{self.url}/api/station/{self.station_id}/file/{file_id}",
                headers=self.headers,
                timeout=REQUEST_TIMEOUT
            )
            return response.status_code in [200, 204]
        except requests.RequestException:
            return False

    def upload_file(self, filepath: Path) -> int | None:
        """
        Upload file to AzuraCast.

        Args:
            filepath: Path to file.

        Returns:
            File ID or None on failure.
        """
        filename = filepath.name

        try:
            with open(filepath, "rb") as f:
                response = requests.post(
                    f"{self.url}/api/station/{self.station_id}/files/upload",
                    headers=self.headers,
                    files={"file": (filename, f, "audio/mpeg")},
                    timeout=UPLOAD_TIMEOUT
                )

            if response.status_code not in [200, 201]:
                logger.warning(f"  Upload failed: HTTP {response.status_code}")
                return None

            logger.info("  Uploaded")

            # Wait for processing
            time.sleep(1)

            # Find the uploaded file
            data = self._api_get("files")
            if not data:
                return None

            # Sort by upload time, newest first
            data.sort(key=lambda x: x.get("uploaded_at", 0), reverse=True)

            # Match by filename
            fname_lower = filename.lower().replace(" ", "_").replace("-", "_")
            for f in data[:5]:
                path_lower = f["path"].lower()
                if fname_lower[:10] in path_lower or path_lower[:10] in fname_lower:
                    return f["id"]

            # Fallback: most recent
            return data[0]["id"]

        except Exception as e:
            logger.warning(f"  Upload error: {e}")
            return None

    def assign_playlists(self, file_id: int, playlist_ids: list[int]) -> bool:
        """
        Assign file to multiple playlists.

        Args:
            file_id: File ID.
            playlist_ids: List of playlist IDs.

        Returns:
            True if successful.
        """
        return self._api_put(f"file/{file_id}", {"playlists": playlist_ids})


def get_features_from_tags(filepath: str) -> TrackFeatures | None:
    """
    Extract mood and features from ID3 tags.

    Args:
        filepath: Path to MP3 file.

    Returns:
        Track features or None on error.
    """
    try:
        tags = ID3(filepath)

        # Get artist/title
        artist = str(tags.get('TPE1', ['Unknown'])[0])
        title = str(tags.get('TIT2', ['Unknown'])[0])

        # Get BPM
        bpm = 0
        if "TBPM" in tags:
            try:
                bpm = int(float(str(tags["TBPM"])))
            except (ValueError, TypeError):
                pass

        # Get custom tags
        mood: str | None = None
        duration = 0
        mood_aggressive = 0.0
        mood_happy = 0.0
        mood_relaxed = 0.0
        mood_sad = 0.0

        for frame in tags.getall("TXXX"):
            try:
                if frame.desc == "MOOD":
                    mood = frame.text[0]
                elif frame.desc == "DURATION":
                    duration = int(frame.text[0])
                elif frame.desc == "MOOD_AGGRESSIVE":
                    mood_aggressive = float(frame.text[0])
                elif frame.desc == "MOOD_HAPPY":
                    mood_happy = float(frame.text[0])
                elif frame.desc == "MOOD_RELAXED":
                    mood_relaxed = float(frame.text[0])
                elif frame.desc == "MOOD_SAD":
                    mood_sad = float(frame.text[0])
            except (ValueError, IndexError):
                continue

        return {
            "artist": artist,
            "title": title,
            "bpm": bpm,
            "mood": mood,
            "duration": duration,
            "mood_aggressive": mood_aggressive,
            "mood_happy": mood_happy,
            "mood_relaxed": mood_relaxed,
            "mood_sad": mood_sad,
        }
    except Exception as e:
        logger.debug(f"Failed to read tags: {e}")
        return None


def process_track(
    filepath: Path,
    client: AzuraCastClient,
    playlists: dict[str, int],
    existing: set[str]
) -> tuple[str, list[str]]:
    """
    Process and upload a single track.

    Args:
        filepath: Path to track.
        client: AzuraCast client.
        playlists: Available playlists (daypart name -> ID).
        existing: Set of existing file paths.

    Returns:
        Tuple of (status, dayparts_assigned).
        Status: "uploaded", "rejected", "skipped", or "failed".
    """
    filename = filepath.name
    logger.info(f"\n{filename}")

    # Check duplicate
    normalized = filename.lower().replace(" ", "_")
    if any(normalized in e or e in normalized for e in existing):
        logger.info("  Skipped: already exists")
        filepath.unlink()
        return "skipped", []

    # Get features from tags
    features = get_features_from_tags(str(filepath))
    if not features or not features["mood"]:
        logger.warning("  Failed: no mood tag")
        return "failed", []

    mood = features["mood"]
    duration_min = features["duration"] // 60
    duration_sec = features["duration"] % 60
    logger.info(f"  {features['artist']} - {features['title']}")
    logger.info(f"  BPM: {features['bpm']} | Mood: {mood} | Duration: {duration_min}:{duration_sec:02d}")

    # Check if track should be rejected (using config rules)
    reject, reason = should_reject_track(features)
    if reject:
        logger.info(f"  Rejected: {reason}")
        filepath.unlink()
        return "rejected", []

    # Get dayparts for this mood
    dayparts = get_dayparts_for_mood(mood)
    if not dayparts:
        logger.warning(f"  Failed: no dayparts configured for mood '{mood}'")
        return "failed", []

    # Check all daypart playlists exist
    missing_playlists = [dp for dp in dayparts if dp not in playlists]
    if missing_playlists:
        logger.warning(f"  Failed: missing playlists: {', '.join(missing_playlists)}")
        return "failed", []

    # Upload
    file_id = client.upload_file(filepath)
    if not file_id:
        return "failed", []

    # Assign to all daypart playlists
    playlist_ids = [playlists[dp] for dp in dayparts]
    if client.assign_playlists(file_id, playlist_ids):
        logger.info(f"  → Assigned to: {', '.join(dayparts)}")
        filepath.unlink()
        return "uploaded", dayparts
    else:
        logger.warning("  Warning: playlist assignment failed")
        return "failed", []


def enforce_rotation(client: AzuraCastClient, new_tracks_count: int) -> int:
    """
    Enforce track rotation by removing oldest tracks if needed.

    Args:
        client: AzuraCast client.
        new_tracks_count: Number of new tracks to be added.

    Returns:
        Number of tracks deleted.
    """
    max_tracks = ROTATION["max_tracks"]
    min_age_days = ROTATION["min_age_days"]

    # Get all files
    files = client.get_all_files()
    current_count = len(files)

    logger.info(f"\n=== Rotation Check ===")
    logger.info(f"Current tracks: {current_count}")
    logger.info(f"New tracks to add: {new_tracks_count}")
    logger.info(f"Max allowed: {max_tracks}")

    # Calculate how many we need to delete
    total_after_upload = current_count + new_tracks_count
    to_delete_count = max(0, total_after_upload - max_tracks)

    if to_delete_count == 0:
        logger.info("No rotation needed")
        return 0

    logger.info(f"Need to delete: {to_delete_count} tracks")

    # Sort files by mtime (oldest first)
    # mtime is Unix timestamp in AzuraCast API
    files_with_mtime = [f for f in files if f.get("mtime")]
    files_with_mtime.sort(key=lambda x: x.get("mtime", 0))

    # Calculate cutoff timestamp (min_age_days ago)
    cutoff_timestamp = time.time() - (min_age_days * 24 * 60 * 60)

    deleted_count = 0
    for file_info in files_with_mtime:
        if deleted_count >= to_delete_count:
            break

        file_mtime = file_info.get("mtime", 0)
        file_id = file_info.get("id")
        file_path = file_info.get("path", "unknown")

        # Skip if file is younger than min_age_days
        if file_mtime > cutoff_timestamp:
            logger.info(f"  Skipping {file_path} (< {min_age_days} days old)")
            continue

        # Delete the file
        if client.delete_file(file_id):
            logger.info(f"  Deleted: {file_path}")
            deleted_count += 1
        else:
            logger.warning(f"  Failed to delete: {file_path}")

    logger.info(f"Rotation complete: {deleted_count}/{to_delete_count} deleted")

    if deleted_count < to_delete_count:
        logger.warning(f"Could not delete enough tracks (protected by {min_age_days}-day rule)")

    return deleted_count


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    # Get configuration from environment
    url = os.environ.get("AZURACAST_URL", "").rstrip("/")
    api_key = os.environ.get("AZURACAST_API_KEY", "")
    station_id = os.environ.get("AZURACAST_STATION_ID", "1")

    if not url or not api_key:
        logger.error("Error: AZURACAST_URL and AZURACAST_API_KEY required")
        return 1

    # Get music files
    music_dir = Path(__file__).parent.parent / "music"
    files = list(music_dir.glob("*.mp3")) if music_dir.exists() else []

    if not files:
        logger.info("No MP3 files to process")
        return 0

    # Show enabled dayparts
    enabled_dayparts = get_enabled_dayparts()
    logger.info("=== Upload to AzuraCast ===")
    logger.info(f"Files: {len(files)}")
    logger.info(f"Server: {url}")
    logger.info(f"Daypart playlists: {', '.join(enabled_dayparts)}")

    # Initialize client
    client = AzuraCastClient(url, api_key, station_id)

    # Get playlists
    playlists = client.get_playlists()
    if not playlists:
        logger.error("Error: Could not fetch playlists")
        return 1
    logger.info(f"Available playlists: {', '.join(playlists.keys())}")

    # Check that all enabled dayparts have playlists
    missing = [dp for dp in enabled_dayparts if dp not in playlists]
    if missing:
        logger.warning(f"Warning: Missing playlists for: {', '.join(missing)}")
        logger.warning("Run: ./scripts/setup_playlists.sh")

    # Get existing files
    existing = client.get_existing_paths()
    logger.info(f"Existing files: {len(existing)}")

    # Enforce rotation before uploading new tracks
    enforce_rotation(client, len(files))

    # Refresh existing paths after rotation
    existing = client.get_existing_paths()

    # Initialize stats
    results: dict[str, int] = {
        "uploaded": 0,
        "rejected": 0,
        "skipped": 0,
        "failed": 0,
    }
    daypart_counts: dict[str, int] = {dp: 0 for dp in enabled_dayparts}

    # Process files
    for filepath in files:
        status, assigned_dayparts = process_track(filepath, client, playlists, existing)
        results[status] += 1

        # Count assignments per daypart
        for dp in assigned_dayparts:
            daypart_counts[dp] += 1

    # Print results
    logger.info("\n=== Results ===")
    logger.info(f"  Uploaded: {results['uploaded']}")
    logger.info(f"  Rejected: {results['rejected']}")
    logger.info(f"  Skipped: {results['skipped']}")
    logger.info(f"  Failed: {results['failed']}")

    if results['uploaded'] > 0:
        logger.info("\n=== Daypart Distribution ===")
        for dp in enabled_dayparts:
            if daypart_counts[dp] > 0:
                logger.info(f"  {dp}: {daypart_counts[dp]}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
