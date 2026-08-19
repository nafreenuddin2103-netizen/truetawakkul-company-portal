#!/bin/bash
# pg-restore.sh - PostgreSQL Restore Script
# Usage: ./pg-restore.sh <path_to_backup_file>

set -e

BACKUP_FILE=$1
DB_NAME="truetawakkul_portal"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./pg-restore.sh <path_to_backup_file>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File $BACKUP_FILE does not exist."
  exit 1
fi

echo "Warning: This will OVERWRITE the current database ($DB_NAME)."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore aborted."
  exit 1
fi

echo "Starting PostgreSQL restore from $BACKUP_FILE at $(date)"

# Drop existing connections (requires superuser)
psql -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';"

# Drop and recreate database
psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql -U postgres -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore data
zcat "$BACKUP_FILE" | psql -U postgres -d "$DB_NAME"

echo "Restore completed successfully."
