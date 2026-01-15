#!/usr/bin/env python3
"""
Download tracks from YouTube with proper HypeMachine metadata.
- Downloads audio with yt-dlp
- Renames to {artist} - {title}.mp3
- Embeds cover from HypeMachine
- Writes ID3 tags from HypeMachine data
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Literal, TypedDict

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import AUDIO_FILTERS
except ImportError:
    AUDIO_FILTERS = {"duration_max": 450}  # Default 7m30

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Constants
SCRIPT_DIR = Path(__file__).parent
PIPELINE_DIR = SCRIPT_DIR.parent
TRACKS_FILE = PIPELINE_DIR / "tracks-to-download.json"
DOWNLOAD_DIR = PIPELINE_DIR / "downloads"
ARCHIVE_FILE = PIPELINE_DIR / "archive" / "yt-dlp-archive.txt"
TEMP_DIR = PIPELINE_DIR / "temp"

MAX_FILENAME_LENGTH = 200
REQUEST_TIMEOUT = 30

DownloadResult = Literal["downloaded", "skipped", "filtered", "failed"]


class Track(TypedDict):
    """Track data from HypeMachine."""
    id: str
    artist: str
    title: str
    cover: str | None
    search: str


def sanitize_filename(name: str) -> str:
    """
    Remove invalid characters from filename.

    Args:
        name: Raw filename string.

    Returns:
        Sanitized filename safe for filesystem.
    """
    # Remove invalid characters
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    # Limit length
    return name[:MAX_FILENAME_LENGTH]


def download_cover(url: str, output_path: Path) -> bool:
    """
    Download cover image from URL.

    Args:
        url: Cover image URL.
        output_path: Path to save the image.

    Returns:
        True if successful, False otherwise.
    """
    if not url:
        return False

    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            output_path.write_bytes(response.read())
        return True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        logger.debug(f"  Cover download failed: {e}")
        return False


def write_id3_tags(
    filepath: Path,
    artist: str,
    title: str,
    cover_path: Path | None = None
) -> bool:
    """
    Write ID3 tags using mutagen.

    Args:
        filepath: Path to MP3 file.
        artist: Artist name.
        title: Track title.
        cover_path: Optional path to cover image.

    Returns:
        True if successful, False otherwise.
    """
    try:
        from mutagen.easyid3 import EasyID3
        from mutagen.id3 import APIC, ID3, ID3NoHeaderError
        from mutagen.mp3 import MP3

        # Write basic tags
        try:
            audio = EasyID3(str(filepath))
        except ID3NoHeaderError:
            audio = MP3(str(filepath))
            audio.add_tags()
            audio.save()
            audio = EasyID3(str(filepath))

        audio['artist'] = artist
        audio['title'] = title
        audio.save()

        # Embed cover if provided
        if cover_path and cover_path.exists():
            audio = ID3(str(filepath))
            cover_data = cover_path.read_bytes()

            # Remove existing covers
            audio.delall('APIC')

            # Add new cover
            audio.add(APIC(
                encoding=3,
                mime='image/jpeg',
                type=3,  # Cover (front)
                desc='Cover',
                data=cover_data
            ))
            audio.save()

        return True
    except Exception as e:
        logger.warning(f"  Tag writing failed: {e}")
        return False


def get_archive_id(search_query: str) -> str:
    """Generate archive ID for a search query."""
    return f"hypem {hash(search_query) & 0xFFFFFFFF}"


def check_archive(search_query: str) -> bool:
    """
    Check if track was already downloaded.

    Args:
        search_query: Search query to check.

    Returns:
        True if already in archive.
    """
    if not ARCHIVE_FILE.exists():
        return False

    query_id = get_archive_id(search_query)
    return query_id in ARCHIVE_FILE.read_text()


def add_to_archive(search_query: str) -> None:
    """Add track to archive."""
    query_id = get_archive_id(search_query)
    with open(ARCHIVE_FILE, 'a') as f:
        f.write(f"{query_id}\n")


def download_track(track: Track) -> DownloadResult:
    """
    Download a single track and apply metadata.

    Args:
        track: Track data from HypeMachine.

    Returns:
        Download result status.
    """
    artist = track.get('artist', 'Unknown')
    title = track.get('title', 'Unknown')
    cover_url = track.get('cover')
    search = track.get('search', f"{artist} - {title}")

    # Check archive
    if check_archive(search):
        return 'skipped'

    # Create safe filename
    safe_name = sanitize_filename(f"{artist} - {title}")
    final_path = DOWNLOAD_DIR / f"{safe_name}.mp3"

    # Skip if already exists
    if final_path.exists():
        logger.info("  Already exists")
        add_to_archive(search)
        return 'skipped'

    # Download to temp directory
    TEMP_DIR.mkdir(exist_ok=True)
    temp_output = TEMP_DIR / "temp_download.%(ext)s"

    # Build yt-dlp command with duration filter
    cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "-o", str(temp_output),
        "--no-playlist",
        "--max-downloads", "1",
        "--no-warnings",
    ]

    # Add duration filter if configured (filter BEFORE download)
    duration_max = AUDIO_FILTERS.get("duration_max")
    if duration_max:
        cmd.extend(["--match-filter", f"duration < {duration_max}"])

    cmd.append(f"ytsearch1:{search}")

    # Run yt-dlp
    result = subprocess.run(cmd, capture_output=True, text=True)

    # Find the downloaded file
    temp_files = list(TEMP_DIR.glob("temp_download.mp3"))
    if not temp_files:
        temp_files = list(TEMP_DIR.glob("temp_download.*"))

    if not temp_files:
        # Check if filtered by duration (yt-dlp outputs "does not pass filter")
        if "does not pass filter" in result.stderr or "does not pass filter" in result.stdout:
            logger.info("  Filtered (too long)")
            add_to_archive(search)  # Don't retry this track
            return 'filtered'
        logger.warning("  No file found after download")
        return 'failed'

    temp_file = temp_files[0]

    # Ensure it's mp3
    if temp_file.suffix != '.mp3':
        logger.warning(f"  Unexpected format: {temp_file.suffix}")
        temp_file.unlink()
        return 'failed'

    # Move to final location with proper name
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    shutil.move(str(temp_file), str(final_path))

    # Download and embed cover
    cover_path: Path | None = None
    if cover_url:
        cover_path = TEMP_DIR / "cover.jpg"
        if download_cover(cover_url, cover_path):
            logger.info("  Cover: OK")
        else:
            cover_path = None

    # Write ID3 tags
    if write_id3_tags(final_path, artist, title, cover_path):
        logger.info(f"  Tags: artist={artist}, title={title}")

    # Cleanup cover
    if cover_path and cover_path.exists():
        cover_path.unlink()

    # Add to archive
    add_to_archive(search)

    return 'downloaded'


def cleanup_temp() -> None:
    """Clean up temporary directory."""
    if TEMP_DIR.exists():
        for f in TEMP_DIR.glob("*"):
            try:
                f.unlink()
            except OSError:
                pass
        try:
            TEMP_DIR.rmdir()
        except OSError:
            pass


def load_tracks() -> list[Track]:
    """
    Load tracks from JSON file.

    Returns:
        List of tracks or empty list on error.
    """
    if not TRACKS_FILE.exists():
        return []

    try:
        with open(TRACKS_FILE, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as e:
        logger.error(f"Failed to load tracks: {e}")
        return []


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success).
    """
    logger.info("=== Download with HypeMachine Metadata ===")

    # Show duration filter if active
    duration_max = AUDIO_FILTERS.get("duration_max")
    if duration_max:
        logger.info(f"Duration filter: < {duration_max // 60}m{duration_max % 60:02d}s")

    tracks = load_tracks()
    if not tracks:
        logger.info("No tracks file found")
        return 0

    logger.info(f"Tracks to process: {len(tracks)}")

    # Create directories
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    ARCHIVE_FILE.parent.mkdir(exist_ok=True)

    # Stats
    stats = {"downloaded": 0, "skipped": 0, "filtered": 0, "failed": 0}

    for i, track in enumerate(tracks, 1):
        artist = track.get('artist', 'Unknown')
        title = track.get('title', 'Unknown')
        logger.info(f"\n[{i}/{len(tracks)}] {artist} - {title}")

        result = download_track(track)
        stats[result] += 1

        if result == 'downloaded':
            logger.info("  OK")
        elif result == 'skipped':
            logger.info("  Skipped (archive)")

    cleanup_temp()

    logger.info("\n=== Results ===")
    logger.info(f"Downloaded: {stats['downloaded']}")
    logger.info(f"Skipped: {stats['skipped']}")
    logger.info(f"Filtered (too long): {stats['filtered']}")
    logger.info(f"Failed: {stats['failed']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
