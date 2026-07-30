#!/usr/bin/env bash
# Nightly backup of both stacks: Postgres dump + storage files.
# Installed by bootstrap.sh as /usr/local/bin/repaircrm-backup (cron 03:00).
set -euo pipefail

DEST=/var/backups/repaircrm
KEEP_DAYS=14
STAMP=$(date +%F-%H%M)

mkdir -p "$DEST"

for env in prod staging; do
  stack=$([ "$env" = prod ] && echo rcrm-prod || echo rcrm-stg)
  db="${stack}-db-1"

  docker inspect "$db" >/dev/null 2>&1 || { echo "skip $env: $db not running"; continue; }

  docker exec "$db" pg_dump -U postgres --clean --if-exists postgres \
    | gzip > "$DEST/$env-db-$STAMP.sql.gz"

  docker run --rm \
    -v "${stack}_storage-data:/data:ro" \
    -v "$DEST:/out" \
    alpine tar czf "/out/$env-storage-$STAMP.tar.gz" -C /data .

  echo "$env backed up: $STAMP"
done

find "$DEST" -type f -mtime "+$KEEP_DAYS" -delete

# A backup that never leaves the box is not a backup. Uncomment once a remote
# target exists (rclone / restic / another host):
# rclone copy "$DEST" remote:repaircrm-backups --max-age 24h
