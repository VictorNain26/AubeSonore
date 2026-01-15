#!/bin/bash
# Setup daypart playlists in AzuraCast
# Reads daypart configuration from config.py (single source of truth)
# Creates scheduled playlists for professional radio-style dayparting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PIPELINE_DIR/.env" ]; then
    source "$PIPELINE_DIR/.env"
fi

# Check required vars
: "${AZURACAST_URL:?Error: AZURACAST_URL not set in .env}"
: "${AZURACAST_API_KEY:?Error: AZURACAST_API_KEY not set in .env}"
: "${AZURACAST_STATION_ID:=1}"

echo "=== AzuraCast Daypart Playlist Setup ==="
echo "Server: $AZURACAST_URL"
echo "Station ID: $AZURACAST_STATION_ID"
echo ""

# Get dayparts from config.py
# Format: name:start_hour:end_hour:description
DAYPARTS=$(python3 -c "
import sys
sys.path.insert(0, '$PIPELINE_DIR')
from config import DAYPARTS

for name, cfg in DAYPARTS.items():
    if cfg['enabled']:
        print(f\"{name}:{cfg['start_hour']}:{cfg['end_hour']}:{cfg['description']}\")
")

if [ -z "$DAYPARTS" ]; then
    echo "Error: No enabled dayparts found in config.py"
    exit 1
fi

echo "Enabled dayparts from config.py:"
echo "$DAYPARTS" | while IFS=':' read -r name start end desc; do
    printf "  - %-18s %02d:00 - %02d:00  (%s)\n" "$name" "$start" "$end" "$desc"
done
echo ""

# Get existing playlists
echo "Checking existing playlists..."
EXISTING=$(curl -s -H "X-API-Key: $AZURACAST_API_KEY" \
    "$AZURACAST_URL/api/station/$AZURACAST_STATION_ID/playlists" 2>/dev/null || echo "[]")

echo "$DAYPARTS" | while IFS=':' read -r name start_hour end_hour description; do
    # Check if playlist exists
    if echo "$EXISTING" | grep -q "\"name\":\"$name\""; then
        echo "✓ '$name' already exists"
    else
        echo "Creating: $name ($start_hour:00 - $end_hour:00)"

        # Format times for AzuraCast API (HHMM format: 600 = 6:00, 1800 = 18:00)
        start_time=$((start_hour * 100))
        end_time=$((end_hour * 100))

        # Create playlist with schedule
        # Note: AzuraCast uses type "default" with schedule_items for scheduled playlists
        # Days use ISO-8601: 1=Monday through 7=Sunday
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "X-API-Key: $AZURACAST_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"name\": \"$name\",
                \"type\": \"default\",
                \"source\": \"songs\",
                \"order\": \"shuffle\",
                \"is_enabled\": true,
                \"include_in_requests\": true,
                \"avoid_duplicates\": true,
                \"schedule_items\": [
                    {
                        \"start_time\": $start_time,
                        \"end_time\": $end_time,
                        \"start_date\": null,
                        \"end_date\": null,
                        \"days\": [1, 2, 3, 4, 5, 6, 7]
                    }
                ]
            }" \
            "$AZURACAST_URL/api/station/$AZURACAST_STATION_ID/playlists" 2>/dev/null)

        http_code=$(echo "$response" | tail -n1)

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            echo "  ✓ Created with schedule"
        else
            echo "  ✗ Failed (HTTP $http_code)"
            # Show error details for debugging
            body=$(echo "$response" | head -n -1)
            if [ -n "$body" ]; then
                echo "  Response: $body" | head -c 200
                echo ""
            fi
        fi
    fi
done

echo ""
echo "=== Current Playlists ==="
curl -s -H "X-API-Key: $AZURACAST_API_KEY" \
    "$AZURACAST_URL/api/station/$AZURACAST_STATION_ID/playlists" 2>/dev/null | \
    python3 -c "
import sys, json
try:
    data = json.loads(sys.stdin.read())
    for p in sorted(data, key=lambda x: x['name']):
        status = '●' if p['is_enabled'] else '○'
        ptype = p.get('type', 'default')
        songs = p.get('num_songs', 0)

        # Get schedule info if scheduled playlist
        schedule = ''
        if ptype == 'scheduled' and p.get('schedule_items'):
            item = p['schedule_items'][0]
            schedule = f\" [{item.get('start_time', '?')}-{item.get('end_time', '?')}]\"

        print(f\"  {status} {p['name']}: {songs} tracks ({ptype}){schedule}\")
except Exception as e:
    print(f'  Error: {e}')
"

echo ""
echo "=== Daypart Schedule (from config.py) ==="
echo "$DAYPARTS" | while IFS=':' read -r name start end desc; do
    printf "  %-18s : %02d:00 - %02d:00  (%s)\n" "$name" "$start" "$end" "$desc"
done
echo ""
echo "Note: Times use AzuraCast API format (integer HHMM), days use ISO-8601 (1=Mon to 7=Sun)"
echo "Done."
