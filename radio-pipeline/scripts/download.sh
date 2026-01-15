#!/bin/bash
# Download tracks from YouTube with HypeMachine metadata
# Uses Python script for proper metadata handling

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 "$SCRIPT_DIR/download.py"
