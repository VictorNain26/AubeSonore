#!/bin/bash
# Setup script for Radio Pipeline
# Installs required dependencies on Ubuntu/Debian

set -e

echo "=== Radio Pipeline Setup ==="
echo ""

# Check if running as root for system packages
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

echo "[1/4] Installing system dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y python3 python3-pip ffmpeg curl

echo ""
echo "[2/5] Installing yt-dlp..."
pip3 install --user --break-system-packages yt-dlp

echo ""
echo "[3/5] Installing Python packages..."
pip3 install --user --break-system-packages essentia-tensorflow mutagen numpy requests

echo ""
echo "[4/5] Downloading Essentia mood models..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
"$SCRIPT_DIR/download_models.sh"

echo ""
echo "[5/5] Creating directories..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
mkdir -p "$PIPELINE_DIR/downloads" "$PIPELINE_DIR/music" "$PIPELINE_DIR/archive"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "1. Configure AzuraCast in .env:"
echo "   cp .env.example .env && nano .env"
echo ""
echo "2. Create playlists in AzuraCast:"
echo "   ./scripts/setup_playlists.sh"
echo ""
echo "3. Run the pipeline:"
echo "   ./run.sh"
echo ""
