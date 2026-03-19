#!/usr/bin/env bash
# pg-backup.sh - PostgreSQL backup with rotation
# Usage: ./pg-backup.sh
# Env vars:
#   DATABASE_URL       - postgres connection string (overrides individual vars)
#   PG_HOST            - default: localhost
#   PG_PORT            - default: 5432
#   PG_USER            - default: opengrade
#   PG_DB              - default: opengrade
#   PGPASSWORD         - password (or use .pgpass)
#   BACKUP_DIR         - base backup directory (default: /backups/postgresql)
#   KEEP_DAILY         - daily backups to keep (default: 7)
#   KEEP_WEEKLY        - weekly backups to keep (default: 4)

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y%m%d")
DOW=$(date +"%u")   # 1=Monday … 7=Sunday; treat Sunday (7) as weekly anchor

# Parse DATABASE_URL if provided (postgres://user:pass@host:port/dbname)
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

BACKUP_FILE="${BACKUP_DIR}/opengrade_backup_${TIMESTAMP}.sql.gz"

# ── Logging ────────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
error(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; }

# ── Setup ──────────────────────────────────────────────────────────────────────
log "Starting PostgreSQL backup: db=${PG_DB} host=${PG_HOST}:${PG_PORT}"

mkdir -p "${BACKUP_DIR}"

# ── Backup ─────────────────────────────────────────────────────────────────────
if ! pg_dump \
    -h "${PG_HOST}" \
    -p "${PG_PORT}" \
    -U "${PG_USER}" \
    -d "${PG_DB}" \
    --no-password \
    --format=plain \
    --clean \
    --if-exists \
    | gzip -9 > "${BACKUP_FILE}"; then
  error "pg_dump failed"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
log "Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Weekly copy ────────────────────────────────────────────────────────────────
if [[ "${DOW}" == "7" ]]; then
  WEEKLY_FILE="${BACKUP_DIR}/opengrade_weekly_${DATE}.sql.gz"
  cp "${BACKUP_FILE}" "${WEEKLY_FILE}"
  log "Weekly snapshot created: ${WEEKLY_FILE}"
fi

# ── Rotation: daily backups ────────────────────────────────────────────────────
log "Rotating daily backups (keeping last ${KEEP_DAILY})..."
ls -1t "${BACKUP_DIR}"/opengrade_backup_*.sql.gz 2>/dev/null \
  | tail -n "+$((KEEP_DAILY + 1))" \
  | while read -r old; do
      log "Removing old daily backup: ${old}"
      rm -f "${old}"
    done

# ── Rotation: weekly backups ───────────────────────────────────────────────────
log "Rotating weekly backups (keeping last ${KEEP_WEEKLY})..."
ls -1t "${BACKUP_DIR}"/opengrade_weekly_*.sql.gz 2>/dev/null \
  | tail -n "+$((KEEP_WEEKLY + 1))" \
  | while read -r old; do
      log "Removing old weekly backup: ${old}"
      rm -f "${old}"
    done

log "Backup complete: ${BACKUP_FILE}"
exit 0
