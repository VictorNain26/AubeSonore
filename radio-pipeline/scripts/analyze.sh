#!/bin/bash
# Audio Analysis Script using Essentia-TensorFlow
# Uses pre-trained MTG mood classifiers + BPM for intelligent mood detection

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
DOWNLOAD_DIR="$PIPELINE_DIR/downloads"
MUSIC_DIR="$PIPELINE_DIR/music"

echo "=== Audio Analysis (Essentia-TensorFlow) ==="

if [ ! -d "$DOWNLOAD_DIR" ] || [ -z "$(ls -A "$DOWNLOAD_DIR"/*.mp3 2>/dev/null)" ]; then
    echo "No MP3 files in downloads folder."
    exit 0
fi

# Run Python analysis script
python3 "$SCRIPT_DIR/analyze.py"

# Move analyzed files to music folder
echo ""
echo "Moving analyzed files to music folder..."
mkdir -p "$MUSIC_DIR"
mv "$DOWNLOAD_DIR"/*.mp3 "$MUSIC_DIR/" 2>/dev/null || true

COUNT=$(ls -1 "$MUSIC_DIR"/*.mp3 2>/dev/null | wc -l)
echo "Ready for upload: $COUNT file(s) in music/"
