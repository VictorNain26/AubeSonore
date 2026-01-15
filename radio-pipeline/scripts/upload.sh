#!/bin/bash
# Mood Classification & Upload Script
# Classifies tracks by mood and uploads to appropriate AzuraCast playlists

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
MUSIC_DIR="$PIPELINE_DIR/music"
ARCHIVE_FILE="$PIPELINE_DIR/archive/downloaded.txt"

# Load environment variables
if [ -f "$PIPELINE_DIR/.env" ]; then
    source "$PIPELINE_DIR/.env"
fi

# Check required vars
: "${AZURACAST_URL:?Error: AZURACAST_URL not set in .env}"
: "${AZURACAST_API_KEY:?Error: AZURACAST_API_KEY not set in .env}"
: "${AZURACAST_STATION_ID:=1}"

export AZURACAST_URL
export AZURACAST_API_KEY
export AZURACAST_STATION_ID

echo "=== Mood Classification & Upload ==="
echo "Server: $AZURACAST_URL"
echo "Station ID: $AZURACAST_STATION_ID"
echo ""

# Check if there are files to upload
if [ ! -d "$MUSIC_DIR" ] || [ -z "$(find "$MUSIC_DIR" -name "*.mp3" 2>/dev/null)" ]; then
    echo "No MP3 files in music folder."
    exit 0
fi

# Run classification and upload
python3 "$SCRIPT_DIR/classify.py"

# Archive uploaded tracks
echo ""
echo "Updating archive..."
mkdir -p "$PIPELINE_DIR/archive"

# Check for remaining files (not uploaded)
shopt -s nullglob
remaining_files=("$MUSIC_DIR"/*.mp3)
shopt -u nullglob

for file in "${remaining_files[@]}"; do
    echo "  Warning: $(basename "$file") not uploaded"
done

if [ ${#remaining_files[@]} -eq 0 ]; then
    echo "  All files uploaded successfully"
fi

# The classify.py script removes files after successful upload
# So we add to archive based on what was in music dir before

echo ""
echo "=== Upload Complete ==="
