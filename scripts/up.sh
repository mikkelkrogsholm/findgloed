#!/usr/bin/env bash
# Start hele Glød-stakken i Docker. Bygger images, kører migrationer
# (via api-entrypoint), seeder demo-data hvis databasen er tom, og venter
# på at alt er sundt før den giver kontrollen tilbage.
#
# Brug:
#   ./scripts/up.sh             # bygger ikke hvis intet er ændret
#   ./scripts/up.sh --rebuild   # tvinger rebuild af alle images
#   ./scripts/up.sh --no-seed   # springer demo-seed over

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

REBUILD=0
RUN_SEED=1
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    --no-seed) RUN_SEED=0 ;;
    -h|--help)
      cat <<USAGE
Usage: $(basename "$0") [--rebuild] [--no-seed]

  --rebuild   Build images fra bunden (--no-cache)
  --no-seed   Spring demo-data seeding over
USAGE
      exit 0
      ;;
  esac
done

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running
load_dotenv "$ROOT"

log_step "Starter Findgloed-stakken"
log_dim "Docker compose: $ROOT/docker-compose.yml"

if [[ "$REBUILD" -eq 1 ]]; then
  log_step "Genbygger alle images (--no-cache)"
  compose build --no-cache
else
  log_step "Bygger images (cache OK)"
  compose build
fi

log_step "Starter services i baggrunden"
compose up -d

log_step "Venter på at api og web svarer"
deadline=$(( $(date +%s) + 120 ))
api_url="http://localhost:${API_PORT:-4564}/api/health"
web_url="http://localhost:${APP_PORT:-4563}"
api_ok=0
web_ok=0
while true; do
  if [[ "$api_ok" -eq 0 ]] && curl -fsS --max-time 2 "$api_url" >/dev/null 2>&1; then
    api_ok=1
    log_ok "API klar"
  fi
  if [[ "$web_ok" -eq 0 ]] && curl -fsS --max-time 2 "$web_url" >/dev/null 2>&1; then
    web_ok=1
    log_ok "Web klar"
  fi
  if [[ "$api_ok" -eq 1 && "$web_ok" -eq 1 ]]; then
    break
  fi
  if (( $(date +%s) > deadline )); then
    log_err "Timeout efter 120s. api_ok=$api_ok web_ok=$web_ok"
    log_dim "Kør './scripts/logs.sh' for at undersøge."
    exit 1
  fi
  sleep 2
done

if [[ "$RUN_SEED" -eq 1 ]]; then
  log_step "Kører demo-seed (verificerer admin + opretter demo events hvis de mangler)"
  compose exec -T api bun run src/seed-demo.ts || {
    log_warn "Seed fejlede — det er OK hvis databasen allerede har dataet."
  }
fi

cat <<DONE

${C_GREEN}${C_BOLD}Klar.${C_RESET}

  Web:       http://localhost:${APP_PORT:-4563}
  API:       http://localhost:${API_PORT:-4564}/api/health
  Postgres:  localhost:${POSTGRES_PORT:-4565}  (user: ${POSTGRES_USER:-findgloed})
  Adminer:   http://localhost:${ADMINER_PORT:-4568}
  Maildev:   http://localhost:${MAILDEV_PORT:-4567}

  Login:     ${SUPERADMIN_EMAIL:-mikkelkrogsholm@gmail.com} / ${SUPERADMIN_PASSWORD:-(se .env)}

  Følg logs: ./scripts/logs.sh
  Stop:      ./scripts/down.sh
  Reset DB:  ./scripts/reset.sh
DONE
