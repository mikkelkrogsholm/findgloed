#!/usr/bin/env bash
# Følger logs for alle services (eller en enkelt hvis du angiver navn).
#
# Brug:
#   ./scripts/logs.sh           # alle services
#   ./scripts/logs.sh api       # kun api
#   ./scripts/logs.sh api web   # api + web

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_lib.sh
source "$SCRIPT_DIR/_lib.sh"

ROOT="$(find_project_root)"
cd "$ROOT"

require_docker_running

if [[ $# -eq 0 ]]; then
  compose logs -f --tail=100
else
  compose logs -f --tail=100 "$@"
fi
