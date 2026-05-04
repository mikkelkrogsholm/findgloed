#!/usr/bin/env bash
# Kører pending migrationer mod den kørende api-container. Migrationer
# køres også automatisk af entrypoint.sh ved api-start, men dette script
# lader dig køre dem manuelt uden at genstarte containeren — fx hvis du
# har tilføjet en ny migration og vil teste den uden rebuild.
#
# Brug:
#   ./scripts/migrate.sh

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

log_step "Kører src/migrate.ts inde i api-containeren"
compose exec -T api bun run src/migrate.ts
log_ok "Migrationer gennemført"
