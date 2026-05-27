#!/usr/bin/env bash
# Tager pg_dump af findgloed-databasen + tar af uploads-volume til
# /var/backups/findgloed/. Holder 7 dages historik, sletter ældre filer.
#
# Beregnet til cron på prod-serveren:
#   0 3 * * * /opt/findgloed/scripts/backup-prod.sh >> /var/log/findgloed-backup.log 2>&1
#
# Forudsætninger:
# - Kører på serveren hvor docker compose-stacken bor (/opt/findgloed)
# - root-bruger eller sudo (for at skrive til /var/backups + læse docker socket)
# - findgloed-db-1 container er oppe

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/findgloed}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/findgloed/docker-compose.prod.yml}"
DB_CONTAINER="${DB_CONTAINER:-findgloed-db-1}"
API_CONTAINER="${API_CONTAINER:-findgloed-api-1}"
ENV_FILE="${ENV_FILE:-/opt/findgloed/.env}"

timestamp="$(date +%Y%m%d_%H%M%S)"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

if [[ ! -f "$ENV_FILE" ]]; then
  log "ERROR: $ENV_FILE mangler"
  exit 1
fi

# Hent kun POSTGRES_USER + POSTGRES_DB. set -a er ikke nødvendigt her —
# vi vil bare have dem ind som lokale shell-vars.
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

mkdir -p "$BACKUP_DIR"

# 1) Database-dump (custom format, komprimeret, restorable via pg_restore)
db_file="$BACKUP_DIR/db_${timestamp}.dump"
log "Dumping database '$POSTGRES_DB' → $db_file"
docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c \
  > "$db_file"
db_size="$(du -h "$db_file" | cut -f1)"
log "  ✓ db dump done ($db_size)"

# 2) Uploads-tarball — kun hvis volume er mounted i api-containeren
uploads_file="$BACKUP_DIR/uploads_${timestamp}.tar.gz"
if docker exec "$API_CONTAINER" test -d /app/uploads 2>/dev/null; then
  log "Tar'ing uploads → $uploads_file"
  docker exec "$API_CONTAINER" tar -czf - -C /app uploads > "$uploads_file"
  uploads_size="$(du -h "$uploads_file" | cut -f1)"
  log "  ✓ uploads tar done ($uploads_size)"
else
  log "  (skipping uploads — /app/uploads findes ikke i api-container)"
fi

# 3) Roter: slet alt der er ældre end RETENTION_DAYS dage
log "Roterer backups ældre end ${RETENTION_DAYS} dage i $BACKUP_DIR"
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) \
  -mtime "+${RETENTION_DAYS}" -print -delete | sed 's/^/  rm /' || true

remaining="$(find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'db_*.dump' -o -name 'uploads_*.tar.gz' \) | wc -l)"
log "Done. ${remaining} backup-filer tilbage i $BACKUP_DIR"
