#!/bin/bash
# Copie hors NVMe les fichiers de configuration d'AzuraCast qui ne sont pas
# versionnés — dont azuracast.env, qui porte MYSQL_PASSWORD. Sans eux, le
# docker-compose.yml versionné ne suffit pas à remonter la station.
#
# Le média et la base ont leurs propres sauvegardes ; ce script ne les touche pas.

set -euo pipefail
umask 077

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST=${DEST:-/media/plex/.backups/azuracast}
RETENTION_DAYS=${RETENTION_DAYS:-30}
STAMP=$(date +%F_%H%M)
TARGET="$DEST/azuracast-config-$STAMP.tar.gz"

# Disque distinct du NVMe qui porte la station : une panne disque ne doit pas
# emporter la station et sa sauvegarde.
if [ ! -d "$(dirname "$DEST")" ]; then
    echo "backup target unavailable: $(dirname "$DEST") is not mounted" >&2
    exit 1
fi

mkdir -p "$DEST"
chmod 700 "$DEST"

# --ignore-failed-read serait une erreur ici : une config absente doit se voir.
tar -czf "$TARGET" -C "$SRC" \
    docker-compose.yml \
    .env \
    azuracast.env
chmod 600 "$TARGET"

# Une archive illisible est pire que pas d'archive : elle ressemble à une sauvegarde.
if ! tar -tzf "$TARGET" >/dev/null 2>&1; then
    rm -f "$TARGET"
    echo "archive unreadable, deleted: $TARGET" >&2
    exit 1
fi

echo "backup: $TARGET ($(du -h "$TARGET" | cut -f1))"

find "$DEST" -name 'azuracast-config-*.tar.gz' -type f -mtime +"$RETENTION_DAYS" -delete
echo "retention: $(find "$DEST" -name 'azuracast-config-*.tar.gz' -type f | wc -l) archives kept"
