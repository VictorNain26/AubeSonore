#!/bin/bash
# Download Essentia pre-trained mood classification models
# Models from: https://essentia.upf.edu/models.html

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
MODELS_DIR="$PIPELINE_DIR/models"

BASE_URL="https://essentia.upf.edu/models"

# Models to download (using MusiCNN embeddings)
declare -A MODELS=(
    ["msd-musicnn-1.pb"]="feature-extractors/musicnn/msd-musicnn-1.pb"
    ["mood_aggressive-msd-musicnn-1.pb"]="classification-heads/mood_aggressive/mood_aggressive-msd-musicnn-1.pb"
    ["mood_happy-msd-musicnn-1.pb"]="classification-heads/mood_happy/mood_happy-msd-musicnn-1.pb"
    ["mood_relaxed-msd-musicnn-1.pb"]="classification-heads/mood_relaxed/mood_relaxed-msd-musicnn-1.pb"
    ["mood_sad-msd-musicnn-1.pb"]="classification-heads/mood_sad/mood_sad-msd-musicnn-1.pb"
)

echo "=== Downloading Essentia Models ==="
mkdir -p "$MODELS_DIR"

for filename in "${!MODELS[@]}"; do
    filepath="$MODELS_DIR/$filename"
    if [ -f "$filepath" ]; then
        echo "  $filename (already exists)"
    else
        echo "  Downloading $filename..."
        curl -sL "$BASE_URL/${MODELS[$filename]}" -o "$filepath"
    fi
done

echo "Models downloaded to: $MODELS_DIR"
