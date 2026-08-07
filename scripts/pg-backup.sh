#!/bin/bash
# pg-backup.sh - Nightly PostgreSQL Logical Backup Script
# This script should be run via a cron job on the production database host or a dedicated backup worker.

set -e

# Load environment variables
if [ -f "../.env" ]; then
  source ../.env
fi

BACKUP_DIR="/var/backups/truetawakkul_postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="truetawakkul_portal"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Starting PostgreSQL backup for ${DB_NAME} at $(date)"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Perform backup using pg_dump
# Note: PGPASSWORD must be set in the environment or via .pgpass file
pg_dump -U postgres -d "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup completed successfully: $BACKUP_FILE"

# Rotate old backups (keep last 30 days)
find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +30 -exec rm {} \;
echo "Old backups cleaned up (retention: 30 days)."
