#!/usr/bin/env bash
# s3-restore.sh - Restore MinIO/S3 bucket from local backup
# Usage: ./s3-restore.sh [--yes] [<backup-source-dir>]
# Env vars:
#   MINIO_ENDPOINT   - MinIO endpoint URL (default: http://localhost:9000)
#   MINIO_ACCESS_KEY - access key (default: minioadmin)
#   MINIO_SECRET_KEY - secret key (default: minioadmin)
#   MINIO_BUCKET     - bucket name (default: opengrade)
#   MINIO_ALIAS      - mc alias name (default: backup-local)
#   BACKUP_DIR       - local backup base dir (default: /backups/s3)
#   USE_AWS_CLI      - set to "true" to use aws s3 sync instead of mc

set -euo pipefail

# ── Logging ────────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
error(){ echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; }

# ── Arg parsing ────────────────────────────────────────────────────────────────
YES=false
SOURCE_DIR=""

for arg in "$@"; do
  case "${arg}" in
    --yes|-y) YES=true ;;
    *)        SOURCE_DIR="${arg}" ;;
  esac
done

# ── Configuration ──────────────────────────────────────────────────────────────
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-opengrade}"
MINIO_ALIAS="${MINIO_ALIAS:-backup-local}"
BACKUP_DIR="${BACKUP_DIR:-/backups/s3}"
USE_AWS_CLI="${USE_AWS_CLI:-false}"

# Default source to last backup if not specified
if [[ -z "${SOURCE_DIR}" ]]; then
  SOURCE_DIR="${BACKUP_DIR}/${MINIO_BUCKET}"
fi

# ── Validate source ────────────────────────────────────────────────────────────
if [[ ! -d "${SOURCE_DIR}" ]]; then
  error "Source directory not found: ${SOURCE_DIR}"
  exit 2
fi

FILE_COUNT=$(find "${SOURCE_DIR}" -type f | wc -l | tr -d ' ')
if [[ "${FILE_COUNT}" -eq 0 ]]; then
  error "Source directory is empty: ${SOURCE_DIR}"
  exit 2
fi

# ── Confirmation ───────────────────────────────────────────────────────────────
log "Restore source: ${SOURCE_DIR} (${FILE_COUNT} files)"
log "Restore target: s3://${MINIO_BUCKET} at ${MINIO_ENDPOINT}"

if [[ "${YES}" != "true" ]]; then
  echo ""
  echo "WARNING: This will overwrite existing data in bucket '${MINIO_BUCKET}'."
  echo ""
  read -r -p "Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" != "yes" ]]; then
    log "Restore cancelled by user."
    exit 0
  fi
fi

# ── Restore ────────────────────────────────────────────────────────────────────
if [[ "${USE_AWS_CLI}" == "true" ]]; then
  if ! command -v aws &>/dev/null; then
    error "aws CLI not found."
    exit 1
  fi

  log "Restoring via aws s3 sync..."
  AWS_ACCESS_KEY_ID="${MINIO_ACCESS_KEY}" \
  AWS_SECRET_ACCESS_KEY="${MINIO_SECRET_KEY}" \
  aws s3 sync \
    "${SOURCE_DIR}" \
    "s3://${MINIO_BUCKET}" \
    --endpoint-url "${MINIO_ENDPOINT}" \
    --no-progress || {
      error "aws s3 sync restore failed"
      exit 1
    }
else
  if ! command -v mc &>/dev/null; then
    error "mc (MinIO client) not found."
    exit 1
  fi

  log "Restoring via mc mirror..."
  mc alias set "${MINIO_ALIAS}" \
    "${MINIO_ENDPOINT}" \
    "${MINIO_ACCESS_KEY}" \
    "${MINIO_SECRET_KEY}" \
    --api S3v4 &>/dev/null

  # Ensure bucket exists
  mc mb "${MINIO_ALIAS}/${MINIO_BUCKET}" --ignore-existing &>/dev/null || true

  mc mirror \
    --overwrite \
    "${SOURCE_DIR}" \
    "${MINIO_ALIAS}/${MINIO_BUCKET}" || {
      error "mc mirror restore failed"
      exit 1
    }
fi

log "Restore complete: ${FILE_COUNT} files uploaded to s3://${MINIO_BUCKET}"
exit 0
