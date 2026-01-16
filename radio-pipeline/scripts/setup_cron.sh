#!/bin/bash
# Setup cron job for daily radio pipeline execution at 3am

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIPELINE_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/radio-pipeline.log"

# Check if we can write to /var/log, otherwise use local log
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="$PIPELINE_DIR/cron.log"
    echo "Note: Using local log file: $LOG_FILE"
fi

# Cron expression: 3am every day
CRON_TIME="0 3 * * *"
CRON_CMD="cd $PIPELINE_DIR && ./run.sh >> $LOG_FILE 2>&1"

# Check if cron job already exists
EXISTING=$(crontab -l 2>/dev/null | grep -F "radio-pipeline" | grep -F "run.sh")

if [ -n "$EXISTING" ]; then
    echo "Cron job already exists:"
    echo "$EXISTING"
    echo ""
    read -p "Replace with new configuration? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    # Remove existing radio-pipeline cron job
    crontab -l 2>/dev/null | grep -v "radio-pipeline" | grep -v "run.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "# Radio Pipeline - Daily discovery at 3am"; echo "$CRON_TIME $CRON_CMD") | crontab -

echo "Cron job installed successfully!"
echo ""
echo "Schedule: Every day at 3:00 AM"
echo "Command: $CRON_CMD"
echo "Log file: $LOG_FILE"
echo ""
echo "Current crontab:"
crontab -l | grep -A1 "Radio Pipeline"
