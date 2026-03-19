#!/usr/bin/env bash
# pg-restore.sh - PostgreSQL restore from backup
# Usage: ./pg-restore.sh [--yes] <backup-file.sql.gz>
# Env vars:
#   DATABASE_URL  - postgres connection string (overrides individual vars)
#   PG_HOST       - default: localhost
#   PG_PORT       - default: 5432
#   PG_USER       - default: opengrade
#   PG_DB         - default: opengrade
#   PGPASSWORD    - password

set -euo pipefail

# ── Logging ────────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
error(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; }

# ── Arg parsing ────────────────────────────────────────────────────────────────
YES=false
BACKUP_FILE=""

for arg in "$@"; do
  case "${arg}" in
    --yes|-y) YES=true ;;
    *)        BACKUP_FILE="${arg}" ;;
  esac
done

if [[ -z "${BACKUP_FILE}" ]]; then
  error "Usage: $0 [--yes] <backup-file.sql.gz>"
  exit 2
fi

# ── Validate backup file ───────────────────────────────────────────────────────
if [[ ! -f "${BACKUP_FILE}" ]]; then
  error "Backup file not found: ${BACKUP_FILE}"
  exit 2
fi

if [[ ! -r "${BACKUP_FILE}" ]]; then
  error "Backup file is not readable: ${BACKUP_FILE}"
  exit 2
fi

# Verify gzip integrity
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  error "Backup file appears corrupted (gzip integrity check failed): ${BACKUP_FILE}"
  exit 2
fi

# ── Configuration ──────────────────────────────────────────────────────────────
if [[ -n "${DATABASE_URL:-}" ]]; then
  _url="${DATABASE_URL#postgres://}"
  _url="${_url#postgresql://}"
  PG_USER="${_url%%:*}"
  _rest="${_url#*:}"
  export PGPASSWORD="${_rest%%@*}"
  _rest="${_rest#*@}"
  PG_HOST="${_rest%%:*}"
  _rest="${_rest#*:}"
  PG_PORT="${_rest%%/*}"
  PG_DB="${_rest#*/}"
  PG_DB="${PG_DB%%\?*}"
fi

PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-opengrade}"
PG_DB="${PG_DB:-opengrade}"

PG_ARGS=(-h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" --no-password)

# ── Confirmation ───────────────────────────────────────────────────────────────
log "Restore target: db=${PG_DB} host=${PG_HOST}:${PG_PORT}"
log "Backup file:    ${BACKUP_FILE}"

if [[ "${YES}" != "true" ]]; then
  echo ""
  echo "WARNING: This will DROP and recreate the database '${PG_DB}'."
  echo "All existing data will be lost."
  echo ""
  read -r -p "Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    log "Restore cancelled by user."
    exit 0
  fi
fi

# ── Drop and recreate database ─────────────────────────────────────────────────
log "Dropping database '${PG_DB}'..."
psql "${PG_ARGS[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"${PG_DB}\";" || {
  error "Failed to drop database"
  exit 1
}

log "Creating database '${PG_DB}'..."
psql "${PG_ARGS[@]}" -d postgres -c "CREATE DATABASE \"${PG_DB}\" OWNER \"${PG_USER}\";" || {
  error "Failed to create database"
  exit 1
}

# ── Restore ────────────────────────────────────────────────────────────────────
log "Restoring from backup..."
if ! gunzip -c "${BACKUP_FILE}" | psql "${PG_ARGS[@]}" -d "${PG_DB}" --set ON_ERROR_STOP=1 -q; then
  error "Restore failed"
  exit 1
fi

# ── Verify restore ─────────────────────────────────────────────────────────────
log "Verifying restore..."
TABLE_COUNT=$(psql "${PG_ARGS[@]}" -d "${PG_DB}" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
  2>/dev/null | tr -d ' ')

if [[ -z "${TABLE_COUNT}" ]] || [[ "${TABLE_COUNT}" -eq 0 ]]; then
  error "Verification failed: no tables found in restored database"
  exit 1
fi

log "Restore verified: ${TABLE_COUNT} tables found in '${PG_DB}'"
log "Restore complete."
exit 0
