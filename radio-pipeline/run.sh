#!/bin/bash
# =============================================================================
# AubeSonore Radio Pipeline
# HypeMachine → yt-dlp → Librosa → AzuraCast
#
# Features:
# - Lock file to prevent concurrent execution
# - Health check before starting
# - Proper error handling and logging
# - Automatic cleanup on exit
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration
LOCK_FILE="/tmp/radio-pipeline.lock"
LOG_FILE="$SCRIPT_DIR/pipeline.log"
MAX_LOCK_AGE=7200  # 2 hours in seconds

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
log() {
    local level="$1"
    shift
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $*" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# -----------------------------------------------------------------------------
# Cleanup function
# -----------------------------------------------------------------------------
cleanup() {
    local exit_code=$?

    # Remove lock file
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
        log_info "Lock file removed"
    fi

    # Clean temp files
    if [ -d "$SCRIPT_DIR/temp" ]; then
        rm -rf "$SCRIPT_DIR/temp"
    fi

    if [ $exit_code -ne 0 ]; then
        log_error "Pipeline failed with exit code $exit_code"
    fi

    exit $exit_code
}

trap cleanup EXIT

# -----------------------------------------------------------------------------
# Lock file management
# -----------------------------------------------------------------------------
acquire_lock() {
    # Check for stale lock
    if [ -f "$LOCK_FILE" ]; then
        local lock_age
        lock_age=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0) ))

        if [ "$lock_age" -gt "$MAX_LOCK_AGE" ]; then
            log_warn "Removing stale lock file (age: ${lock_age}s)"
            rm -f "$LOCK_FILE"
        else
            local lock_pid
            lock_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "unknown")
            log_error "Pipeline already running (PID: $lock_pid, age: ${lock_age}s)"
            exit 1
        fi
    fi

    # Create lock file with PID
    echo $$ > "$LOCK_FILE"
    log_info "Lock acquired (PID: $$)"
}

# -----------------------------------------------------------------------------
# Health checks
# -----------------------------------------------------------------------------
check_dependencies() {
    local missing=()

    for cmd in python3 curl; do
        if ! command -v "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing[*]}"
        exit 1
    fi
}

check_azuracast() {
    local url="${AZURACAST_URL%/}"

    log_info "Checking AzuraCast connectivity..."

    # Use Python for reliable HTTPS health check
    if ! python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR/scripts')
from settings import get_settings, validate_environment
from http_client import AzuraCastClient

is_valid, errors = validate_environment()
if not is_valid:
    for e in errors:
        print(f'Config error: {e}')
    sys.exit(1)

settings = get_settings()
client = AzuraCastClient(
    base_url=settings.azuracast_url,
    api_key=settings.azuracast_api_key,
    station_id=settings.azuracast_station_id,
    timeout=settings.http_timeout,
)

if not client.health_check():
    print('AzuraCast health check failed')
    sys.exit(1)

print('AzuraCast OK')
" 2>&1; then
        log_error "AzuraCast health check failed"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Main pipeline
# -----------------------------------------------------------------------------
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           AUBESONORE RADIO PIPELINE                           ║"
    echo "║       HypeMachine → yt-dlp → Librosa → AzuraCast              ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    log_info "Pipeline started"

    # Acquire exclusive lock
    acquire_lock

    # Check dependencies
    check_dependencies

    # Check environment file
    if [ ! -f ".env" ]; then
        log_error ".env file not found"
        exit 1
    fi

    # Export environment variables
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a

    # Verify required keys
    : "${AZURACAST_API_KEY:?Error: AZURACAST_API_KEY not set}"
    : "${AZURACAST_URL:?Error: AZURACAST_URL not set}"

    log_info "AzuraCast: $AZURACAST_URL"

    # Health check
    check_azuracast

    # Step 1: Discover tracks from HypeMachine API
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ STEP 1/4: DISCOVER (HypeMachine API)                           │"
    echo "└─────────────────────────────────────────────────────────────────┘"

    if ! python3 scripts/discover.py; then
        log_error "Discover step failed"
        exit 1
    fi

    # Check if we have tracks
    if [ ! -f "tracks-to-download.json" ]; then
        log_info "No tracks found. Pipeline complete."
        exit 0
    fi

    # Step 2: Download from YouTube
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ STEP 2/4: DOWNLOAD (yt-dlp)                                    │"
    echo "└─────────────────────────────────────────────────────────────────┘"

    if ! python3 scripts/download.py; then
        log_error "Download step failed"
        exit 1
    fi

    # Check if downloads succeeded
    DOWNLOAD_COUNT=$(find downloads -name "*.mp3" 2>/dev/null | wc -l)
    if [ "$DOWNLOAD_COUNT" -eq 0 ]; then
        log_info "No new files downloaded. Pipeline complete."
        exit 0
    fi

    log_info "Downloaded $DOWNLOAD_COUNT files"

    # Step 3: Analyze audio (Librosa)
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ STEP 3/4: ANALYZE (Librosa)                                    │"
    echo "└─────────────────────────────────────────────────────────────────┘"

    if ! ./scripts/analyze.sh; then
        log_warn "Analyze step had issues, continuing..."
    fi

    # Step 4: Classify and Upload to AzuraCast
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ STEP 4/4: UPLOAD (AzuraCast)                                   │"
    echo "└─────────────────────────────────────────────────────────────────┘"

    if ! python3 scripts/classify.py; then
        log_error "Upload step failed"
        exit 1
    fi

    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                    PIPELINE COMPLETE                          ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"

    log_info "Pipeline completed successfully"
}

# Run main
main "$@"
