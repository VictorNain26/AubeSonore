#!/bin/bash
# AubeSonore Radio Pipeline
# HypeMachine → yt-dlp → Librosa → AzuraCast

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           AUBESONORE RADIO PIPELINE                           ║"
echo "║       HypeMachine → yt-dlp → Librosa → AzuraCast            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check environment
if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    exit 1
fi

source .env

# Verify required keys
: "${AZURACAST_API_KEY:?Error: AZURACAST_API_KEY not set}"
: "${AZURACAST_URL:?Error: AZURACAST_URL not set}"

echo "AzuraCast: $AZURACAST_URL"
echo ""

# Step 1: Discover tracks from HypeMachine API
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ STEP 1/4: DISCOVER (HypeMachine API)                           │"
echo "└─────────────────────────────────────────────────────────────────┘"
python3 scripts/discover.py
echo ""

# Check if we have tracks
if [ ! -f "tracks-to-download.json" ]; then
    echo "No tracks found. Pipeline complete."
    exit 0
fi

# Step 2: Download from YouTube
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ STEP 2/4: DOWNLOAD (yt-dlp)                                    │"
echo "└─────────────────────────────────────────────────────────────────┘"
./scripts/download.sh
echo ""

# Check if downloads succeeded
DOWNLOAD_COUNT=$(find downloads -name "*.mp3" 2>/dev/null | wc -l)
if [ "$DOWNLOAD_COUNT" -eq 0 ]; then
    echo "No new files downloaded. Pipeline complete."
    exit 0
fi

echo "Downloaded $DOWNLOAD_COUNT files"
echo ""

# Step 3: Analyze audio (Librosa)
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ STEP 3/4: ANALYZE (Librosa)                                    │"
echo "└─────────────────────────────────────────────────────────────────┘"
./scripts/analyze.sh
echo ""

# Step 4: Classify and Upload to AzuraCast
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ STEP 4/4: UPLOAD (AzuraCast)                                   │"
echo "└─────────────────────────────────────────────────────────────────┘"
./scripts/upload.sh
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    PIPELINE COMPLETE                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
