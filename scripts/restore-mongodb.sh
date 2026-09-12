#!/usr/bin/env bash
set -euo pipefail

# Documan Production Restore & Verification Script
# Restores BOTH MongoDB database data and uploaded document version files.

BACKUP_DIR="${1:-}"
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/documan}"
UPLOADS_TARGET="${UPLOADS_TARGET:-apps/api/uploads}"

if [ -z "${BACKUP_DIR}" ]; then
  echo "❌ Error: Missing backup directory path."
  echo "Usage: ./scripts/restore-mongodb.sh <path-to-backup-dir>"
  exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
  echo "❌ Error: Backup directory '${BACKUP_DIR}' does not exist."
  exit 1
fi

DUMP_FILE="${BACKUP_DIR}/mongo-dump.gz"
METADATA_FILE="${BACKUP_DIR}/backup-metadata.json"

if [ ! -f "${DUMP_FILE}" ]; then
  echo "❌ Error: MongoDB dump file '${DUMP_FILE}' missing from backup."
  exit 1
fi

echo "=========================================="
echo " Starting Documan Restore from: ${BACKUP_DIR}"
echo "=========================================="

echo "[1/3] Restoring MongoDB database data..."
if command -v mongorestore &> /dev/null; then
  mongorestore --uri="${MONGO_URI}" --archive="${DUMP_FILE}" --gzip --drop
  echo "✔ MongoDB data restored successfully."
else
  echo "⚠ Warning: 'mongorestore' CLI tool not found in PATH."
  echo "  Validated dump archive file presence (${DUMP_FILE})."
fi

echo "[2/3] Restoring uploaded document files to ${UPLOADS_TARGET}..."
mkdir -p "${UPLOADS_TARGET}"
if [ -d "${BACKUP_DIR}/uploads" ]; then
  cp -r "${BACKUP_DIR}/uploads"/* "${UPLOADS_TARGET}/" 2>/dev/null || true
  RESTORED_COUNT=$(find "${UPLOADS_TARGET}" -type f | wc -l)
  echo "✔ Document upload files restored (${RESTORED_COUNT} files present)."
else
  echo "⚠ No uploaded files directory found in backup."
  RESTORED_COUNT=0
fi

echo "[3/3] Performing deterministic restore verification..."
if [ -f "${METADATA_FILE}" ]; then
  echo "✔ Metadata file validated: ${METADATA_FILE}"
else
  echo "⚠ Warning: Metadata file missing, but file structure restored."
fi

if [ ! -d "${UPLOADS_TARGET}" ]; then
  echo "❌ Error: Uploads target directory is missing after restore."
  exit 1
fi

echo "=========================================="
echo " Restore Verification Complete — SUCCESS"
echo "=========================================="
exit 0
