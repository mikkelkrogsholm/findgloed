#!/usr/bin/env bash
# Quick status: hvilke containere kører, og er de sunde?
#
# Brug:
#   ./scripts/status.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running
load_dotenv "$ROOT"

log_step "Container-status"
compose ps

echo
log_step "Health-tjek"

check() {
  local label="$1" url="$2"
  if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
    log_ok "$label: $url"
  else
    log_warn "$label: $url svarer ikke"
  fi
}

check "API"     "http://localhost:${API_PORT:-4564}/api/health"
check "Web"     "http://localhost:${APP_PORT:-4563}"
check "Adminer" "http://localhost:${ADMINER_PORT:-4568}"
check "Maildev" "http://localhost:${MAILDEV_PORT:-4567}"
