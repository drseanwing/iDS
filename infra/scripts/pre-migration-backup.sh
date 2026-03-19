#!/usr/bin/env bash
# pre-migration-backup.sh
# Creates a pg_dump backup of the database before a migration is applied.
#
# Usage:
#   DATABASE_URL="postgresql://..." bash infra/scripts/pre-migration-backup.sh
#
# Optional environment variables:
#   BACKUP_DIR      - Directory to store backups (default: /var/backups/opengrade-db)
#   KEEP_BACKUPS    - Number of backups to retain (default: 5)
#
# Exit codes:
#   0 - Backup created and verified successfully
#   1 - Backup failed

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-/var/backups/opengrade-db}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/opengrade_pre_migration_${TIMESTAMP}.dump"
MIN_BACKUP_SIZE_BYTES=512  # A valid dump must be larger than this

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "[$(date '+%H:%M:%S')] $1"; }
ok()   { echo -e "[$(date '+%H:%M:%S')] ${GREEN}OK${NC}  $1"; }
err()  { echo -e "[$(date '+%H:%M:%S')] ${RED}ERR${NC} $1" >&2; }
warn() { echo -e "[$(date '+%H:%M:%S')] ${YELLOW}WARN${NC} $1"; }

# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------

log "Starting pre-migration backup..."
log "Timestamp: $TIMESTAMP"
log "Backup directory: $BACKUP_DIR"
log "Backups to keep: $KEEP_BACKUPS"

if [[ -z "${DATABASE_URL:-}" ]]; then
  err "DATABASE_URL environment variable is not set."
  echo "  Usage: DATABASE_URL=\"postgresql://user:pass@host/db\" bash infra/scripts/pre-migration-backup.sh"
  exit 1
fi

if ! command -v pg_dump &>/dev/null; then
  err "pg_dump is not installed or not in PATH."
  err "Install postgresql-client: apt-get install postgresql-client"
  exit 1
fi

# ---------------------------------------------------------------------------
# Create backup directory
# ---------------------------------------------------------------------------

if [[ ! -d "$BACKUP_DIR" ]]; then
  log "Creating backup directory: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
fi

# Verify the directory is writable
if [[ ! -w "$BACKUP_DIR" ]]; then
  err "Backup directory is not writable: $BACKUP_DIR"
  exit 1
fi

# ---------------------------------------------------------------------------
# Test database connectivity
# ---------------------------------------------------------------------------

log "Testing database connectivity..."

if ! psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
  err "Cannot connect to database — check DATABASE_URL and network access"
  exit 1
fi

ok "Database connection verified"

# Capture DB info for the log
DB_NAME=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT current_database();" 2>/dev/null | tr -d '[:space:]')
DB_SIZE=$(psql "$DATABASE_URL" --tuples-only --no-align -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d '[:space:]')
log "Database: $DB_NAME  |  Size: $DB_SIZE"

# ---------------------------------------------------------------------------
# Create the backup
# ---------------------------------------------------------------------------

log "Running pg_dump — this may take a moment for large databases..."

if pg_dump \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --verbose \
    "$DATABASE_URL" \
    --file="$BACKUP_FILE" 2>&1 | tail -5; then
  ok "pg_dump completed"
else
  err "pg_dump exited with an error"
  # Clean up partial file
  [[ -f "$BACKUP_FILE" ]] && rm -f "$BACKUP_FILE"
  exit 1
fi

# ---------------------------------------------------------------------------
# Verify the backup file
# ---------------------------------------------------------------------------

log "Verifying backup file..."

if [[ ! -f "$BACKUP_FILE" ]]; then
  err "Backup file was not created: $BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
if [[ "$BACKUP_SIZE" -lt "$MIN_BACKUP_SIZE_BYTES" ]]; then
  err "Backup file is suspiciously small ($BACKUP_SIZE bytes) — the dump may have failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

BACKUP_SIZE_HUMAN=$(du -sh "$BACKUP_FILE" | cut -f1)
ok "Backup file verified: $BACKUP_FILE ($BACKUP_SIZE_HUMAN)"

# Verify the dump is readable by pg_restore
if command -v pg_restore &>/dev/null; then
  if pg_restore --list "$BACKUP_FILE" &>/dev/null; then
    ok "Backup file passes pg_restore integrity check"
  else
    warn "pg_restore could not read backup file — verify manually before relying on it"
  fi
fi

# ---------------------------------------------------------------------------
# Write a metadata sidecar file
# ---------------------------------------------------------------------------

METADATA_FILE="${BACKUP_FILE%.dump}.meta"
cat > "$METADATA_FILE" <<EOF
backup_file=$(basename "$BACKUP_FILE")
timestamp=$TIMESTAMP
database=$DB_NAME
size_bytes=$BACKUP_SIZE
size_human=$BACKUP_SIZE_HUMAN
created_by=${USER:-unknown}
hostname=$(hostname)
database_url_host=$(echo "$DATABASE_URL" | sed 's|.*@||' | sed 's|/.*||')
EOF

ok "Metadata written: $METADATA_FILE"

# ---------------------------------------------------------------------------
# Clean up old backups (keep last N)
# ---------------------------------------------------------------------------

log "Cleaning up old backups (keeping last $KEEP_BACKUPS)..."

# List dump files sorted by name (timestamps ensure chronological order)
mapfile -t OLD_BACKUPS < <(
  ls -1 "$BACKUP_DIR"/opengrade_pre_migration_*.dump 2>/dev/null | sort | head -n -"$KEEP_BACKUPS"
)

if [[ "${#OLD_BACKUPS[@]}" -eq 0 ]]; then
  log "No old backups to remove"
else
  for OLD_FILE in "${OLD_BACKUPS[@]}"; do
    log "Removing old backup: $(basename "$OLD_FILE")"
    rm -f "$OLD_FILE"
    # Also remove sidecar metadata if present
    [[ -f "${OLD_FILE%.dump}.meta" ]] && rm -f "${OLD_FILE%.dump}.meta"
  done
  ok "Removed ${#OLD_BACKUPS[@]} old backup(s)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "=============================="
echo "  BACKUP SUMMARY"
echo "=============================="
echo "  File:      $BACKUP_FILE"
echo "  Size:      $BACKUP_SIZE_HUMAN"
echo "  Database:  $DB_NAME"
echo "  Timestamp: $TIMESTAMP"
echo "=============================="
echo ""
echo -e "${GREEN}Backup completed successfully.${NC}"
echo "To restore this backup:"
echo "  pg_restore --clean --if-exists --no-owner --no-privileges \\"
echo "    --dbname \"\$DATABASE_URL\" \\"
echo "    \"$BACKUP_FILE\""
echo ""
echo "See docs/migrations/rollback-procedures.md for full restore instructions."
