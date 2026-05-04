#!/usr/bin/env bash
# Kører demo-seed mod den kørende api-container. Idempotent — verificerer
# admin og opretter demo events der ikke allerede findes.
#
# Brug:
#   ./scripts/seed.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running

if ! compose ps --services --filter status=running | grep -q '^api$'; then
  log_err "api-containeren kører ikke. Start stakken med ./scripts/up.sh først."
  exit 1
fi

log_step "Kører src/seed-demo.ts inde i api-containeren"
compose exec -T api bun run src/seed-demo.ts
log_ok "Seed gennemført"
