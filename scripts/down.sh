#!/usr/bin/env bash
# Stopper og fjerner alle Glød-containers. Volumes bevares — så database,
# uploads og node_modules er der stadig når du starter op igen.
# Brug ./scripts/reset.sh hvis du vil slette dataet også.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running

log_step "Stopper Glød-stakken (volumes bevares)"
compose down --remove-orphans

log_ok "Stoppet. Volumes ligger urørt — start igen med ./scripts/up.sh"
