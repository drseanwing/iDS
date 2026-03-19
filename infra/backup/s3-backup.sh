#!/usr/bin/env bash
# s3-backup.sh - Sync MinIO/S3 bucket to local backup directory
# Usage: ./s3-backup.sh
# Env vars:
#   MINIO_ENDPOINT   - MinIO endpoint URL (default: http://localhost:9000)
#   MINIO_ACCESS_KEY - access key (default: minioadmin)
#   MINIO_SECRET_KEY - secret key (default: minioadmin)
#   MINIO_BUCKET     - bucket name (default: opengrade)
#   MINIO_ALIAS      - mc alias name (default: local)
#   BACKUP_DIR       - local backup base dir (default: /backups/s3)
#   USE_AWS_CLI      - set to "true" to use aws s3 sync instead of mc

set -euo pipefail

# ── Logging ────────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
error(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; }

# ── Configuration ──────────────────────────────────────────────────────────────
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-opengrade}"
MINIO_ALIAS="${MINIO_ALIAS:-backup-local}"
BACKUP_DIR="${BACKUP_DIR:-/backups/s3}"
USE_AWS_CLI="${USE_AWS_CLI:-false}"

DEST_DIR="${BACKUP_DIR}/${MINIO_BUCKET}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

log "Starting S3/MinIO backup: bucket=${MINIO_BUCKET} -> ${DEST_DIR}"

mkdir -p "${DEST_DIR}"

# ── Sync ───────────────────────────────────────────────────────────────────────
if [[ "${USE_AWS_CLI}" == "true" ]]; then
  # ── aws s3 sync mode ────────────────────────────────────────────────────────
  if ! command -v aws &>/dev/null; then
    error "aws CLI not found. Install awscli or set USE_AWS_CLI=false to use mc."
    exit 1
  fi

  log "Using aws s3 sync (endpoint: ${MINIO_ENDPOINT})"
  AWS_ACCESS_KEY_ID="${MINIO_ACCESS_KEY}" \
  AWS_SECRET_ACCESS_KEY="${MINIO_SECRET_KEY}" \
  aws s3 sync \
    "s3://${MINIO_BUCKET}" \
    "${DEST_DIR}" \
    --endpoint-url "${MINIO_ENDPOINT}" \
    --delete \
    --no-progress || {
      error "aws s3 sync failed"
      exit 1
    }
else
  # ── mc (MinIO client) mode ──────────────────────────────────────────────────
  if ! command -v mc &>/dev/null; then
    error "mc (MinIO client) not found. Install mc or set USE_AWS_CLI=true."
    exit 1
  fi

  log "Using mc mirror (endpoint: ${MINIO_ENDPOINT})"

  # Configure alias (idempotent)
  mc alias set "${MINIO_ALIAS}" \
    "${MINIO_ENDPOINT}" \
    "${MINIO_ACCESS_KEY}" \
    "${MINIO_SECRET_KEY}" \
    --api S3v4 &>/dev/null

  mc mirror \
    --overwrite \
    --remove \
    "${MINIO_ALIAS}/${MINIO_BUCKET}" \
    "${DEST_DIR}" || {
      error "mc mirror failed"
      exit 1
    }
fi

# ── Summary ────────────────────────────────────────────────────────────────────
FILE_COUNT=$(find "${DEST_DIR}" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${DEST_DIR}" 2>/dev/null | cut -f1)
log "Sync complete: ${FILE_COUNT} files, total size ${TOTAL_SIZE}"
log "Backup stored in: ${DEST_DIR}"
log "Completed at: ${TIMESTAMP}"
exit 0
