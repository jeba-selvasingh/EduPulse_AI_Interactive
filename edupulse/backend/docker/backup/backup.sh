#!/bin/sh
set -e
BACKUP_ROOT="${BACKUP_DIR:-/backups}"
STAMP=$(date +%Y%m%d_%H%M%S)

# PostgreSQL
mkdir -p "${BACKUP_ROOT}/postgres"
pg_dump -Fc -f "${BACKUP_ROOT}/postgres/edupulse_${STAMP}.dump"
echo "PostgreSQL backup: edupulse_${STAMP}.dump"

# Retain last 7 postgres dumps (BusyBox-compatible)
KEEP=7
ls -1t "${BACKUP_ROOT}/postgres/"*.dump 2>/dev/null | awk "NR>${KEEP}" | while read -r f; do rm -f "$f"; done

# MinIO — mirror buckets when mc is available (backup-cron image)
if command -v mc >/dev/null 2>&1 && [ -n "${MINIO_ENDPOINT:-}" ]; then
  MINIO_HOST="${MINIO_ENDPOINT}:${MINIO_PORT:-9000}"
  mc alias set edupulse "http://${MINIO_HOST}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" --api S3v4
  mkdir -p "${BACKUP_ROOT}/minio/${STAMP}"
  for bucket in syllabi papers answer-sheets exports; do
    mc mirror --overwrite "edupulse/${bucket}" "${BACKUP_ROOT}/minio/${STAMP}/${bucket}" 2>/dev/null || true
  done
  echo "MinIO mirror: ${BACKUP_ROOT}/minio/${STAMP}"
  ls -1dt "${BACKUP_ROOT}/minio/"* 2>/dev/null | awk 'NR>7' | while read -r d; do rm -rf "$d"; done
fi

echo "Backup complete at ${STAMP}"
