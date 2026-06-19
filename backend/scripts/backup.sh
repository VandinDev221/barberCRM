#!/bin/sh
# Backup do banco PostgreSQL usando pg_dump.
# Uso: DATABASE_URL="postgresql://..." ./scripts/backup.sh [pasta_saida]
# Gera: pasta_saida/barber-backup-YYYY-MM-DD-HHmm.sql (padrão: ./backups)

set -e
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/barber-backup-$(date +%Y-%m-%d-%H%M).sql"
if [ -z "$DATABASE_URL" ]; then
  echo "Defina DATABASE_URL para fazer o backup."
  exit 1
fi
pg_dump "$DATABASE_URL" --no-owner --no-acl -f "$FILE"
echo "Backup salvo: $FILE"
